import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { listarEncuestas } from '../lib/data'
import { PageHeader, Card, FilterBar, Select, Input, Boton } from '../components/ui'
import type { Database } from '../lib/database.types'

type Encuesta = Database['public']['Tables']['encuestas']['Row']

type Fila = {
  id: number
  fecha_respuesta: string
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
        'id, fecha_respuesta, identificador_evaluado, paciente_nombre, paciente_numero_habitacion, profiles(nombre), areas_servicio(nombre)',
      )
      .eq('encuesta_id', encuestaId)
      .order('fecha_respuesta', { ascending: false })
      .limit(1000)
    if (desde) q = q.gte('fecha_respuesta', desde)
    if (hasta) q = q.lte('fecha_respuesta', hasta)
    const { data } = await q
    setFilas(
      (data ?? []).map((r) => ({
        id: r.id,
        fecha_respuesta: r.fecha_respuesta,
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

  async function exportarExcel() {
    const { exportarExcel: fn } = await import('../lib/exportar')
    await fn(
      `reporte_${encuestaActual?.codigo ?? 'encuesta'}`,
      [
        { header: 'Fecha', key: 'fecha_respuesta' },
        { header: 'Registrado por', key: 'respondido_por_nombre' },
        { header: 'Área/servicio', key: 'area_servicio_nombre' },
        { header: 'Paciente', key: 'paciente_nombre' },
        { header: 'Habitación', key: 'paciente_numero_habitacion' },
      ],
      filas,
    )
  }

  async function exportarPDF() {
    const { exportarPDF: fn } = await import('../lib/exportar')
    await fn(
      `reporte_${encuestaActual?.codigo ?? 'encuesta'}`,
      ['Fecha', 'Registrado por', 'Área/servicio', 'Paciente', 'Habitación'],
      filas.map((f) => [
        f.fecha_respuesta,
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
        <div>
          <label className="mb-1 block text-xs text-slate-500">Encuesta</label>
          <Select value={encuestaId} onChange={(e) => setEncuestaId(Number(e.target.value))} className="w-56">
            {encuestas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.proveedor ?? e.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Desde</label>
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Hasta</label>
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <Boton onClick={buscar}>Filtrar</Boton>
      </FilterBar>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-xs uppercase text-slate-500">
                <th className="py-2">Fecha</th>
                <th>Registrado por</th>
                <th>Área/servicio</th>
                <th>Paciente</th>
                <th>Habitación</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id} className="border-b border-slate-200">
                  <td className="py-2">{f.fecha_respuesta}</td>
                  <td>{f.respondido_por_nombre}</td>
                  <td>{f.area_servicio_nombre ?? '—'}</td>
                  <td>{f.paciente_nombre ?? '—'}</td>
                  <td>{f.paciente_numero_habitacion ?? '—'}</td>
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
    </div>
  )
}
