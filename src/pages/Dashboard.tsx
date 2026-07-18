import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '../lib/supabase'
import { listarEncuestas, listarAreas, listarDetalleRespuesta } from '../lib/data'
import {
  PageHeader,
  MetricCard,
  Card,
  FilterBar,
  Select,
  Input,
  Boton,
  PopoverRespuestas,
  calcularPosicionPopover,
  type PopoverQA,
} from '../components/ui'
import type { Database } from '../lib/database.types'

type Encuesta = Database['public']['Tables']['encuestas']['Row']
type Area = Database['public']['Tables']['areas_servicio']['Row']

const PUNTAJE_4: Record<string, number> = { Excelente: 4, Bueno: 3, Regular: 2, Deficiente: 1 }

type Fila = {
  id: number
  fecha_respuesta: string
  respondido_por_nombre: string
  area_servicio_nombre: string | null
  paciente_nombre: string | null
  paciente_numero_habitacion: string | null
}

export default function Dashboard() {
  const [encuestas, setEncuestas] = useState<Encuesta[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [encuestaId, setEncuestaId] = useState<number | ''>('')
  const [areaId, setAreaId] = useState<number | ''>('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const [conteos, setConteos] = useState<Record<number, number>>({})
  const [totalRespuestas, setTotalRespuestas] = useState(0)
  const [promedioProveedores, setPromedioProveedores] = useState<number | null>(null)
  const [conteoAlimentacion, setConteoAlimentacion] = useState(0)
  const [filas, setFilas] = useState<Fila[]>([])
  const [cargandoTabla, setCargandoTabla] = useState(false)
  const [popover, setPopover] = useState<PopoverQA>(null)

  useEffect(() => {
    ;(async () => {
      const es = await listarEncuestas()
      setEncuestas(es)
      if (es.length > 0) setEncuestaId(es[0].id)
      setAreas(await listarAreas())
      await cargarMetricas(es, '', '')
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (encuestaId) cargarTabla()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encuestaId])

  async function cargarMetricas(esParam?: Encuesta[], desdeParam?: string, hastaParam?: string) {
    const es = esParam ?? encuestas
    const d = desdeParam ?? desde
    const h = hastaParam ?? hasta

    const conteosPorEncuesta: Record<number, number> = {}
    let total = 0
    for (const e of es) {
      let q = supabase.from('respuestas').select('id', { count: 'exact', head: true }).eq('encuesta_id', e.id)
      if (d) q = q.gte('fecha_respuesta', d)
      if (h) q = q.lte('fecha_respuesta', h)
      const { count } = await q
      conteosPorEncuesta[e.id] = count ?? 0
      total += count ?? 0
    }
    setConteos(conteosPorEncuesta)
    setTotalRespuestas(total)
    setConteoAlimentacion(conteosPorEncuesta[es.find((e) => e.codigo === 'alimentacion')?.id ?? -1] ?? 0)

    let q2 = supabase
      .from('respuestas_detalle')
      .select('valor, preguntas!inner(tipo_respuesta), respuestas!inner(fecha_respuesta)')
      .eq('preguntas.tipo_respuesta', 'escala_4')
    if (d) q2 = q2.gte('respuestas.fecha_respuesta', d)
    if (h) q2 = q2.lte('respuestas.fecha_respuesta', h)
    const { data: escala4 } = await q2.limit(5000)
    if (escala4 && escala4.length > 0) {
      const puntajes = escala4.map((r) => PUNTAJE_4[r.valor] ?? null).filter((v): v is number => v !== null)
      setPromedioProveedores(puntajes.length > 0 ? puntajes.reduce((a, b) => a + b, 0) / puntajes.length : null)
    } else {
      setPromedioProveedores(null)
    }
  }

  async function cargarTabla() {
    if (!encuestaId) return
    setCargandoTabla(true)
    let q = supabase
      .from('respuestas')
      .select('id, fecha_respuesta, paciente_nombre, paciente_numero_habitacion, profiles(nombre), areas_servicio(nombre)')
      .eq('encuesta_id', encuestaId)
      .order('fecha_respuesta', { ascending: false })
      .limit(200)
    if (desde) q = q.gte('fecha_respuesta', desde)
    if (hasta) q = q.lte('fecha_respuesta', hasta)
    if (areaId) q = q.eq('area_servicio_id', areaId)
    const { data } = await q
    setFilas(
      (data ?? []).map((r) => ({
        id: r.id,
        fecha_respuesta: r.fecha_respuesta,
        respondido_por_nombre: (r.profiles as unknown as { nombre: string } | null)?.nombre ?? '—',
        area_servicio_nombre: (r.areas_servicio as unknown as { nombre: string } | null)?.nombre ?? null,
        paciente_nombre: r.paciente_nombre,
        paciente_numero_habitacion: r.paciente_numero_habitacion,
      })),
    )
    setCargandoTabla(false)
  }

  function filtrar() {
    cargarMetricas()
    cargarTabla()
  }

  async function verRespuestas(f: Fila, e: { clientX: number; clientY: number }) {
    const titulo = f.paciente_nombre ?? f.area_servicio_nombre ?? `Respuesta ${f.id}`
    const { x, y } = calcularPosicionPopover(e)
    setPopover({ x, y, titulo, filas: [], cargando: true })
    const detalle = await listarDetalleRespuesta(f.id)
    setPopover({ x, y, titulo, filas: detalle, cargando: false })
  }

  const dataChart = encuestas.map((e) => ({ nombre: e.proveedor ?? e.nombre, respuestas: conteos[e.id] ?? 0 }))
  const encuestaActual = encuestas.find((e) => e.id === encuestaId)

  return (
    <div>
      <PageHeader titulo="Dashboard" />

      <FilterBar>
        <div className="w-56">
          <label className="mb-1 block text-xs text-slate-500">Encuesta (tabla de registros)</label>
          <Select value={encuestaId} onChange={(e) => setEncuestaId(Number(e.target.value))}>
            {encuestas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.proveedor ?? e.nombre}
              </option>
            ))}
          </Select>
        </div>
        {encuestaActual?.tipo === 'proveedor' && (
          <div className="w-48">
            <label className="mb-1 block text-xs text-slate-500">Área/servicio</label>
            <Select value={areaId} onChange={(e) => setAreaId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Todas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="w-40">
          <label className="mb-1 block text-xs text-slate-500">Desde</label>
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs text-slate-500">Hasta</label>
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <Boton onClick={filtrar}>Filtrar</Boton>
      </FilterBar>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard titulo="Encuestas activas" valor={encuestas.filter((e) => e.activa).length} />
        <MetricCard titulo="Respuestas totales" valor={totalRespuestas} sub="Según el rango de fechas" />
        <MetricCard
          titulo="Calificación proveedores"
          valor={promedioProveedores ? `${promedioProveedores.toFixed(2)} / 4` : '—'}
          sub="Excelente=4 · Deficiente=1"
        />
        <MetricCard titulo="Respuestas Alimentación" valor={conteoAlimentacion} />
      </div>

      <Card className="mb-6">
        <h2 className="mb-4 font-semibold text-[var(--azul)]">Respuestas por encuesta</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dataChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#c3cbe0" />
            <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="respuestas" fill="#16468e" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold text-[var(--azul)]">
          Registros — {encuestaActual?.proveedor ?? encuestaActual?.nombre ?? ''}
        </h2>
        <p className="mb-2 text-xs text-slate-500">Clic en una fila para ver las respuestas de esa encuesta.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-xs uppercase text-slate-500">
                <th className="whitespace-nowrap px-3 py-2">Fecha</th>
                <th className="whitespace-nowrap px-3 py-2">Registrado por</th>
                <th className="whitespace-nowrap px-3 py-2">Área/servicio</th>
                <th className="px-3 py-2">Paciente</th>
                <th className="whitespace-nowrap px-3 py-2">Habitación</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr
                  key={f.id}
                  onClick={(e) => verRespuestas(f, e)}
                  className="cursor-pointer border-b border-slate-200 hover:bg-[var(--azul)]/5"
                >
                  <td className="whitespace-nowrap px-3 py-2">{f.fecha_respuesta}</td>
                  <td className="whitespace-nowrap px-3 py-2">{f.respondido_por_nombre}</td>
                  <td className="whitespace-nowrap px-3 py-2">{f.area_servicio_nombre ?? '—'}</td>
                  <td className="px-3 py-2">{f.paciente_nombre ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2">{f.paciente_numero_habitacion ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {cargandoTabla && <p className="py-4 text-center text-sm text-slate-500">Cargando…</p>}
          {!cargandoTabla && filas.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-500">Sin respuestas para el filtro seleccionado.</p>
          )}
        </div>
      </Card>

      <PopoverRespuestas popover={popover} onClose={() => setPopover(null)} />
    </div>
  )
}
