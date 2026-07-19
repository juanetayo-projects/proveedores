import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '../lib/supabase'
import { listarEncuestas } from '../lib/data'
import { PageHeader, Card, FilterBar, Select, Input, Boton } from '../components/ui'
import { ESCALA_4, ESCALA_4_COLOR, ESCALA_1_5, ESCALA_1_5_COLOR } from '../lib/constantes'
import type { Database } from '../lib/database.types'

type Encuesta = Database['public']['Tables']['encuestas']['Row']

type DetalleFila = {
  valor: string
  pregunta_texto: string
  respuesta_id: number
  fecha_respuesta: string
  categoria: string | null
  respondido_por_nombre: string | null
}

function AnilloSimple({
  pct,
  color,
  tamano = 120,
  grosor = 12,
  children,
}: {
  pct: number
  color: string
  tamano?: number
  grosor?: number
  children?: React.ReactNode
}) {
  const r = (tamano - grosor) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className="relative shrink-0" style={{ width: tamano, height: tamano }}>
      <svg width={tamano} height={tamano} className="-rotate-90">
        <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke="#c3cbe0" strokeWidth={grosor} />
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={grosor}
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

type PopoverState = { x: number; y: number; titulo: string; filas: DetalleFila[] } | null

function abrirPopover(
  set: (p: PopoverState) => void,
  e: { clientX?: number; clientY?: number } | undefined,
  titulo: string,
  filas: DetalleFila[],
) {
  if (!filas.length) return
  const cx = e?.clientX ?? window.innerWidth / 2
  const cy = e?.clientY ?? window.innerHeight / 2
  set({ x: Math.max(8, Math.min(cx, window.innerWidth - 320)), y: Math.max(8, Math.min(cy, window.innerHeight - 300)), titulo, filas })
}

function PopoverDetalle({ popover, onClose }: { popover: PopoverState; onClose: () => void }) {
  if (!popover) return null
  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="neu-flat fixed z-50 w-80 overflow-hidden p-0"
        style={{ left: popover.x, top: popover.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 bg-[var(--azul)] px-3 py-2">
          <span className="text-xs font-bold text-white">{popover.titulo}</span>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            ✕
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto p-3">
          {popover.filas.map((f, i) => (
            <div key={i} className="neu-pressed mb-2 p-2 text-[11px] last:mb-0">
              <div className="mb-1 flex justify-between text-slate-500">
                <span>{f.fecha_respuesta}</span>
                <span>{f.categoria ?? '—'}</span>
              </div>
              <div className="font-medium text-slate-800">{f.pregunta_texto}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function PanelEjecutivo() {
  const [encuestas, setEncuestas] = useState<Encuesta[]>([])
  const [encuestaId, setEncuestaId] = useState<number | ''>('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [detalle, setDetalle] = useState<DetalleFila[]>([])
  const [popover, setPopover] = useState<PopoverState>(null)

  useEffect(() => {
    listarEncuestas().then((es) => {
      setEncuestas(es)
      if (es.length > 0) setEncuestaId(es[0].id)
    })
  }, [])

  useEffect(() => {
    if (!encuestaId) return
    cargarDetalle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encuestaId])

  const encuestaActual = encuestas.find((e) => e.id === encuestaId)
  const esPaciente = encuestaActual?.tipo === 'paciente'
  const opcionesEscala: readonly string[] = esPaciente ? ESCALA_1_5 : ESCALA_4
  const colorEscala: Record<string, string> = esPaciente ? ESCALA_1_5_COLOR : ESCALA_4_COLOR
  const esPositivo = (valor: string) => (esPaciente ? Number(valor) >= 4 : valor === 'Excelente' || valor === 'Bueno')

  async function cargarDetalle() {
    if (!encuestaId) return
    const paciente = encuestaActual?.tipo === 'paciente'
    let q = supabase
      .from('respuestas_detalle')
      .select(
        `valor, respuesta_id, preguntas!inner(texto, tipo_respuesta), respuestas!inner(fecha_respuesta, encuesta_id, respondido_por, ${
          paciente ? 'paciente_tipo_afiliacion' : 'areas_servicio(nombre)'
        }, profiles(nombre))`,
      )
      .eq('preguntas.tipo_respuesta', paciente ? 'escala_1_5' : 'escala_4')
      .eq('respuestas.encuesta_id', encuestaId)
    if (desde) q = q.gte('respuestas.fecha_respuesta', desde)
    if (hasta) q = q.lte('respuestas.fecha_respuesta', hasta)
    const { data } = await q.limit(3000)
    setDetalle(
      (data ?? []).map((r: any) => ({
        valor: r.valor,
        pregunta_texto: r.preguntas.texto,
        respuesta_id: r.respuesta_id,
        fecha_respuesta: r.respuestas.fecha_respuesta,
        categoria: paciente ? r.respuestas.paciente_tipo_afiliacion ?? null : r.respuestas.areas_servicio?.nombre ?? null,
        respondido_por_nombre: r.respuestas.profiles?.nombre ?? null,
      })),
    )
  }

  const distribucion = useMemo(
    () => opcionesEscala.map((op) => ({ opcion: op, filas: detalle.filter((d) => d.valor === op) })),
    [detalle, opcionesEscala],
  )
  const total = detalle.length
  const positivos = detalle.filter((d) => esPositivo(d.valor)).length
  const pctSatisfaccion = total > 0 ? (positivos / total) * 100 : 0

  const porCategoria = useMemo(() => {
    const map = new Map<string, DetalleFila[]>()
    for (const f of detalle) {
      const k = f.categoria ?? (esPaciente ? 'Sin dato' : 'Sin área')
      map.set(k, [...(map.get(k) ?? []), f])
    }
    return Array.from(map.entries())
      .map(([categoria, filas]) => ({ categoria, cantidad: filas.length, filas }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10)
  }, [detalle, esPaciente])

  const tendenciaMensual = useMemo(() => {
    const respuestasUnicas = new Map<number, string>()
    for (const f of detalle) respuestasUnicas.set(f.respuesta_id, f.fecha_respuesta)
    const porMes = new Map<string, number>()
    for (const fecha of respuestasUnicas.values()) {
      const mes = fecha.slice(0, 7)
      porMes.set(mes, (porMes.get(mes) ?? 0) + 1)
    }
    const porMesSatisfaccion = new Map<string, { positivos: number; total: number }>()
    for (const f of detalle) {
      const mes = f.fecha_respuesta.slice(0, 7)
      const e = porMesSatisfaccion.get(mes) ?? { positivos: 0, total: 0 }
      e.total += 1
      if (esPositivo(f.valor)) e.positivos += 1
      porMesSatisfaccion.set(mes, e)
    }
    return Array.from(porMes.keys())
      .sort()
      .map((mes) => {
        const s = porMesSatisfaccion.get(mes)
        return {
          mes,
          respuestas: porMes.get(mes) ?? 0,
          satisfaccion: s && s.total > 0 ? Math.round((s.positivos / s.total) * 100) : 0,
        }
      })
  }, [detalle])

  return (
    <div>
      <PageHeader titulo="Panel ejecutivo" />

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
        <Boton onClick={cargarDetalle}>Filtrar</Boton>
      </FilterBar>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center">
          <h2 className="mb-3 self-start font-semibold text-[var(--azul)]">Satisfacción</h2>
          <AnilloSimple pct={pctSatisfaccion} color="#16a34a">
            <span className="text-2xl font-bold text-[var(--azul)]">{pctSatisfaccion.toFixed(0)}%</span>
            <span className="text-[10px] text-slate-500">{esPaciente ? 'Calificación 4 y 5' : 'Excelente + Bueno'}</span>
          </AnilloSimple>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-[var(--azul)]">
            Distribución — {encuestaActual?.proveedor ?? encuestaActual?.nombre ?? ''}
          </h2>
          <div className="flex flex-wrap items-end gap-4">
            {distribucion.map((d) => (
              <button
                key={d.opcion}
                onClick={(e) => abrirPopover(setPopover, e, `${d.opcion} (${d.filas.length})`, d.filas)}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className="w-9 rounded-t-lg"
                  style={{
                    height: Math.max(6, (d.filas.length / Math.max(1, total)) * 120),
                    background: colorEscala[d.opcion],
                  }}
                />
                <span className="text-[11px] font-medium text-slate-600">{d.opcion}</span>
                <span className="text-xs text-slate-400">{d.filas.length}</span>
              </button>
            ))}
            {total === 0 && <p className="text-sm text-slate-500">Sin respuestas todavía.</p>}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-[var(--azul)]">Tendencia mensual de satisfacción</h2>
          {tendenciaMensual.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={tendenciaMensual}>
                <CartesianGrid strokeDasharray="3 3" stroke="#c3cbe0" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={30} />
                <RTooltip formatter={(v) => `${v}%`} />
                <Line type="monotone" dataKey="satisfaccion" stroke="#16468e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500">Sin datos suficientes para la tendencia.</p>
          )}
          <p className="mt-1 text-[10px] text-slate-400">
            {esPaciente ? '% de respuestas 4 y 5 por mes' : '% de respuestas Excelente + Bueno por mes'}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 font-semibold text-[var(--azul)]">
          {esPaciente ? 'Respuestas por tipo de afiliación' : 'Respuestas por área/servicio'}
        </h2>
        <ResponsiveContainer width="100%" height={Math.max(160, porCategoria.length * 36)}>
          <BarChart data={porCategoria} layout="vertical" margin={{ left: 40 }}>
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="categoria" width={160} tick={{ fontSize: 11 }} />
            <RTooltip />
            <Bar
              dataKey="cantidad"
              fill="#16468e"
              radius={[0, 8, 8, 0]}
              onClick={(data: any, _i, e) =>
                abrirPopover(setPopover, e, `${data.categoria} (${data.cantidad})`, data.filas)
              }
              cursor="pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <PopoverDetalle popover={popover} onClose={() => setPopover(null)} />
    </div>
  )
}
