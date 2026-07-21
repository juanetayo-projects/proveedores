import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { listarEncuestas, listarDetalleRespuesta, listarPreguntas, paginarTodo, formatearFechaHora } from '../lib/data'
import { PageHeader, Card, FilterBar, Select, Input, Boton, PopoverRespuestas, calcularPosicionPopover, type PopoverQA } from '../components/ui'
import { colorDeValor } from '../lib/constantes'
import type { Database } from '../lib/database.types'

type Encuesta = Database['public']['Tables']['encuestas']['Row']

type Fila = {
  id: number
  fecha_respuesta: string
  fecha_hora: string
  respondido_por_nombre: string
  area_servicio_nombre: string | null
  identificador_evaluado: string | null
  paciente_nombre: string | null
  paciente_numero_habitacion: string | null
}

export default function Reportes() {
  const [encuestas, setEncuestas] = useState<Encuesta[]>([])
  const [encuestaId, setEncuestaId] = useState<number | ''>('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [filas, setFilas] = useState<Fila[]>([])
  const [cargando, setCargando] = useState(false)
  const [popover, setPopover] = useState<PopoverQA>(null)

  useEffect(() => {
    listarEncuestas().then((es) => {
      setEncuestas(es)
      if (es.length > 0) setEncuestaId(es[0].id)
    })
  }, [])

  useEffect(() => {
    if (!encuestaId) return
    buscar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encuestaId])

  async function buscar() {
    if (!encuestaId) return
    setCargando(true)
    let q = supabase
      .from('respuestas')
      .select(
        'id, fecha_respuesta, created_at, identificador_evaluado, paciente_nombre, paciente_numero_habitacion, profiles(nombre), areas_servicio(nombre)',
      )
      .eq('encuesta_id', encuestaId)
      .order('created_at', { ascending: false })
      .limit(1000)
    if (desde) q = q.gte('fecha_respuesta', desde)
    if (hasta) q = q.lte('fecha_respuesta', hasta)
    const { data } = await q
    setFilas(
      (data ?? []).map((r) => ({
        id: r.id,
        fecha_respuesta: r.fecha_respuesta,
        fecha_hora: formatearFechaHora(r.created_at),
        respondido_por_nombre: (r.profiles as unknown as { nombre: string } | null)?.nombre ?? '—',
        area_servicio_nombre: (r.areas_servicio as unknown as { nombre: string } | null)?.nombre ?? null,
        identificador_evaluado: r.identificador_evaluado,
        paciente_nombre: r.paciente_nombre,
        paciente_numero_habitacion: r.paciente_numero_habitacion,
      })),
    )
    setCargando(false)
  }

  const encuestaActual = useMemo(() => encuestas.find((e) => e.id === encuestaId), [encuestas, encuestaId])

  async function verRespuestas(f: Fila, e: { clientX: number; clientY: number }) {
    const titulo = `${f.paciente_nombre ?? f.area_servicio_nombre ?? 'Respuesta'} · #${f.id}`
    const { x, y } = calcularPosicionPopover(e)
    setPopover({ x, y, titulo, filas: [], cargando: true })
    const detalle = await listarDetalleRespuesta(f.id)
    setPopover({ x, y, titulo, filas: detalle, cargando: false })
  }

  async function exportarExcel() {
    if (!encuestaId || filas.length === 0) return
    const { exportarExcel: fn } = await import('../lib/exportar')
    const preguntas = await listarPreguntas(encuestaId)
    const ids = filas.map((f) => f.id)
    const detalle = await paginarTodo<{ respuesta_id: number; pregunta_id: number; valor: string }>((desdeIdx, hastaIdx) =>
      supabase.from('respuestas_detalle').select('respuesta_id, pregunta_id, valor').in('respuesta_id', ids).range(desdeIdx, hastaIdx),
    )
    const porRespuesta = new Map<number, Map<number, string>>()
    for (const d of detalle) {
      if (!porRespuesta.has(d.respuesta_id)) porRespuesta.set(d.respuesta_id, new Map())
      porRespuesta.get(d.respuesta_id)!.set(d.pregunta_id, d.valor)
    }

    const columnasPreguntas = preguntas.map((p, idx) => ({ header: `Pregunta #${idx + 1}`, key: `p${p.id}`, width: 14 }))
    const filasExtendidas = filas.map((f) => {
      const respuestasFila: Record<string, string> = {}
      for (const p of preguntas) respuestasFila[`p${p.id}`] = porRespuesta.get(f.id)?.get(p.id) ?? ''
      return { ...f, ...respuestasFila }
    })
    const coloresPorFila = filas.map((f) => {
      const colores: Record<string, string> = {}
      for (const p of preguntas) {
        const valor = porRespuesta.get(f.id)?.get(p.id)
        const color = valor ? colorDeValor(p.tipo_respuesta, valor) : undefined
        if (color) colores[`p${p.id}`] = 'FF' + color.replace('#', '').toUpperCase()
      }
      return colores
    })

    await fn(
      `reporte_${encuestaActual?.codigo ?? 'encuesta'}`,
      [
        { header: 'Fecha y hora', key: 'fecha_hora' },
        { header: 'Registrado por', key: 'respondido_por_nombre' },
        { header: 'Área/servicio', key: 'area_servicio_nombre' },
        { header: 'Paciente', key: 'paciente_nombre' },
        { header: 'Habitación', key: 'paciente_numero_habitacion' },
        ...columnasPreguntas,
      ],
      filasExtendidas,
      coloresPorFila,
    )
  }

  async function exportarPDF() {
    const { exportarPDF: fn } = await import('../lib/exportar')
    await fn(
      `reporte_${encuestaActual?.codigo ?? 'encuesta'}`,
      ['Fecha y hora', 'Registrado por', 'Área/servicio', 'Paciente', 'Habitación'],
      filas.map((f) => [
        f.fecha_hora,
        f.respondido_por_nombre,
        f.area_servicio_nombre ?? '',
        f.paciente_nombre ?? '',
        f.paciente_numero_habitacion ?? '',
      ]),
    )
  }

  return (
    <div>
      <PageHeader
        titulo="Reportes"
        acciones={
          <>
            <Boton variant="secundario" onClick={exportarExcel}>
              Exportar Excel
            </Boton>
            <Boton variant="secundario" onClick={exportarPDF}>
              Exportar PDF
            </Boton>
          </>
        }
      />

      <FilterBar>
        <div className="w-56">
          <label className="mb-1 block text-xs text-slate-500">Encuesta</label>
          <Select value={encuestaId} onChange={(e) => setEncuestaId(Number(e.target.value))}>
            {encuestas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.proveedor ?? e.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs text-slate-500">Desde</label>
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs text-slate-500">Hasta</label>
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <Boton onClick={buscar}>Filtrar</Boton>
      </FilterBar>

      <Card>
        <p className="mb-2 text-xs text-slate-500">Clic en una fila para ver las respuestas de esa encuesta.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-xs uppercase text-slate-500">
                <th className="whitespace-nowrap px-3 py-2">Fecha y hora</th>
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
                  <td className="whitespace-nowrap px-3 py-2">{f.fecha_hora}</td>
                  <td className="whitespace-nowrap px-3 py-2">{f.respondido_por_nombre}</td>
                  <td className="whitespace-nowrap px-3 py-2">{f.area_servicio_nombre ?? '—'}</td>
                  <td className="px-3 py-2 hover:underline">{f.paciente_nombre ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2">{f.paciente_numero_habitacion ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {cargando && <p className="py-4 text-center text-sm text-slate-500">Cargando…</p>}
          {!cargando && filas.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-500">Sin respuestas para el filtro seleccionado.</p>
          )}
        </div>
      </Card>

      <PopoverRespuestas popover={popover} onClose={() => setPopover(null)} />
    </div>
  )
}
