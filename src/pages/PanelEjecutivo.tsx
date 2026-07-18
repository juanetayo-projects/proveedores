import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import { listarEncuestas } from '../lib/data'
import { PageHeader, Card, Select } from '../components/ui'
import { ESCALA_4, ESCALA_4_COLOR } from '../lib/constantes'
import type { Database } from '../lib/database.types'

type Encuesta = Database['public']['Tables']['encuestas']['Row']

type DetalleFila = {
  valor: string
  pregunta_texto: string
  respuesta_id: number
  fecha_respuesta: string
  area_nombre: string | null
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
        className="neu-flat fixed z-50 w-80 p-3"
        style={{ left: popover.x, top: popover.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-300/50 pb-2">
          <span className="text-xs font-bold text-[var(--azul)]">{popover.titulo}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="pb-1 pr-2 font-medium">Fecha</th>
                <th className="pb-1 pr-2 font-medium">Área</th>
                <th className="pb-1 pr-2 font-medium">Pregunta</th>
              </tr>
            </thead>
            <tbody>
              {popover.filas.map((f, i) => (
                <tr key={i} className="border-t border-slate-300/40">
                  <td className="py-1 pr-2 align-top">{f.fecha_respuesta}</td>
                  <td className="py-1 pr-2 align-top">{f.area_nombre ?? '—'}</td>
                  <td className="py-1 pr-2 align-top text-slate-700">{f.pregunta_texto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function PanelEjecutivo() {
  const [encuestas, setEncuestas] = useState<Encuesta[]>([])
  const [encuestaId, setEncuestaId] = useState<number | ''>('')
  const [detalle, setDetalle] = useState<DetalleFila[]>([])
  const [popover, setPopover] = useState<PopoverState>(null)

  useEffect(() => {
    listarEncuestas().then((es) => {
      const proveedores = es.filter((e) => e.tipo === 'proveedor')
      setEncuestas(proveedores)
      if (proveedores.length > 0) setEncuestaId(proveedores[0].id)
    })
  }, [])

  useEffect(() => {
    if (!encuestaId) return
    ;(async () => {
      const { data } = await supabase
        .from('respuestas_detalle')
        .select(
          'valor, respuesta_id, preguntas!inner(texto, tipo_respuesta), respuestas!inner(fecha_respuesta, encuesta_id, respondido_por, areas_servicio(nombre), profiles(nombre))',
        )
        .eq('preguntas.tipo_respuesta', 'escala_4')
        .eq('respuestas.encuesta_id', encuestaId)
        .limit(3000)
      setDetalle(
        (data ?? []).map((r: any) => ({
          valor: r.valor,
          pregunta_texto: r.preguntas.texto,
          respuesta_id: r.respuesta_id,
          fecha_respuesta: r.respuestas.fecha_respuesta,
          area_nombre: r.respuestas.areas_servicio?.nombre ?? null,
          respondido_por_nombre: r.respuestas.profiles?.nombre ?? null,
        })),
      )
    })()
  }, [encuestaId])

  const distribucion = useMemo(
    () => ESCALA_4.map((op) => ({ opcion: op, filas: detalle.filter((d) => d.valor === op) })),
    [detalle],
  )
  const total = detalle.length
  const positivos = distribucion.filter((d) => d.opcion === 'Excelente' || d.opcion === 'Bueno')
    .reduce((a, d) => a + d.filas.length, 0)
  const pctSatisfaccion = total > 0 ? (positivos / total) * 100 : 0

  const porArea = useMemo(() => {
    const map = new Map<string, DetalleFila[]>()
    for (const f of detalle) {
      const k = f.area_nombre ?? 'Sin área'
      map.set(k, [...(map.get(k) ?? []), f])
    }
    return Array.from(map.entries())
      .map(([area, filas]) => ({ area, cantidad: filas.length, filas }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10)
  }, [detalle])

  const encuestaActual = encuestas.find((e) => e.id === encuestaId)

  return (
    <div>
      <PageHeader
        titulo="Panel ejecutivo"
        acciones={
          <Select value={encuestaId} onChange={(e) => setEncuestaId(Number(e.target.value))} className="w-56">
            {encuestas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.proveedor ?? e.nombre}
              </option>
            ))}
          </Select>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center">
          <h2 className="mb-3 self-start font-semibold text-[var(--azul)]">Satisfacción</h2>
          <AnilloSimple pct={pctSatisfaccion} color="#16a34a">
            <span className="text-2xl font-bold text-[var(--azul)]">{pctSatisfaccion.toFixed(0)}%</span>
            <span className="text-[10px] text-slate-500">Excelente + Bueno</span>
          </AnilloSimple>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-semibold text-[var(--azul)]">
            Distribución de calificaciones — {encuestaActual?.proveedor ?? ''}
          </h2>
          <div className="flex flex-wrap items-end gap-6">
            {distribucion.map((d) => (
              <button
                key={d.opcion}
                onClick={(e) => abrirPopover(setPopover, e, `${d.opcion} (${d.filas.length})`, d.filas)}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className="w-12 rounded-t-lg"
                  style={{
                    height: Math.max(6, (d.filas.length / Math.max(1, total)) * 140),
                    background: ESCALA_4_COLOR[d.opcion],
                  }}
                />
                <span className="text-xs font-medium text-slate-600">{d.opcion}</span>
                <span className="text-xs text-slate-400">{d.filas.length}</span>
              </button>
            ))}
            {total === 0 && <p className="text-sm text-slate-500">Sin respuestas todavía.</p>}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 font-semibold text-[var(--azul)]">Respuestas por área/servicio</h2>
        <ResponsiveContainer width="100%" height={Math.max(160, porArea.length * 36)}>
          <BarChart data={porArea} layout="vertical" margin={{ left: 40 }}>
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="area" width={160} tick={{ fontSize: 11 }} />
            <RTooltip />
            <Bar
              dataKey="cantidad"
              fill="#16468e"
              radius={[0, 8, 8, 0]}
              onClick={(data: any, _i, e) =>
                abrirPopover(setPopover, e, `${data.area} (${data.cantidad})`, data.filas)
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
