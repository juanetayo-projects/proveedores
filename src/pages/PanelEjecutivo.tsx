import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '../lib/supabase'
import { listarEncuestas } from '../lib/data'
import { PageHeader, Card, FilterBar, Select, Input, Boton } from '../components/ui'
import { ESCALA_4, ESCALA_4_COLOR, ESCALA_1_5, ESCALA_1_5_COLOR, ESCALA_1_5_LABEL } from '../lib/constantes'
import type { Database } from '../lib/database.types'

type Encuesta = Database['public']['Tables']['encuestas']['Row']

const DESCRIPCION_ESCALA_4: Record<string, string> = {
  Excelente: 'Supera lo esperado',
  Bueno: 'Cumple lo esperado',
  Regular: 'Cumple parcialmente',
  Deficiente: 'No cumple lo esperado',
}

type DetalleFila = {
  valor: string
  pregunta_texto: string
  fecha_respuesta: string
  paciente_nombre: string | null
  servicio: string | null
  respondido_por_nombre: string | null
}

type CategoriaFila = { categoria: string; categoriaAreaId: number | null; cantidad: number }

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

type PopoverState = { x: number; y: number; titulo: string; filas: DetalleFila[]; cargando: boolean } | null

function posicionPopover(e: { clientX?: number; clientY?: number } | undefined) {
  const cx = e?.clientX ?? window.innerWidth / 2
  const cy = e?.clientY ?? window.innerHeight / 2
  return { x: Math.max(8, Math.min(cx, window.innerWidth - 340)), y: Math.max(8, Math.min(cy, window.innerHeight - 320)) }
}

function PopoverDetalle({
  popover,
  onClose,
  colorEscala,
}: {
  popover: PopoverState
  onClose: () => void
  colorEscala: Record<string, string>
}) {
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
        <div className="max-h-72 overflow-y-auto p-3">
          {popover.cargando && <p className="py-2 text-center text-xs text-slate-400">Cargando…</p>}
          {!popover.cargando &&
            popover.filas.map((f, i) => (
              <div key={i} className="neu-pressed mb-2 p-2 text-[11px] last:mb-0">
                <div className="mb-1 flex flex-wrap justify-between gap-x-2 text-slate-500">
                  <span>{f.fecha_respuesta}</span>
                  <span>{f.respondido_por_nombre ?? '—'}</span>
                </div>
                {(f.paciente_nombre || f.servicio) && (
                  <div className="mb-1 text-slate-500">{f.paciente_nombre ?? f.servicio}</div>
                )}
                <div className="flex items-start gap-2">
                  <span
                    className="mt-px shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                    style={{ background: colorEscala[f.valor] ?? '#64748b' }}
                  >
                    {f.valor}
                  </span>
                  <span className="font-medium text-slate-800">{f.pregunta_texto}</span>
                </div>
              </div>
            ))}
          {!popover.cargando && popover.filas.length === 0 && (
            <p className="py-2 text-center text-xs text-slate-400">Sin respuestas registradas.</p>
          )}
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
  const [cargando, setCargando] = useState(false)
  const [conteoValores, setConteoValores] = useState<Map<string, number>>(new Map())
  const [porCategoria, setPorCategoria] = useState<CategoriaFila[]>([])
  const [conteoDiario, setConteoDiario] = useState<{ dia: string; cantidad: number }[]>([])
  const [popover, setPopover] = useState<PopoverState>(null)
  const cargaVigenteRef = useRef(0)

  useEffect(() => {
    listarEncuestas().then((es) => {
      setEncuestas(es)
      if (es.length > 0) setEncuestaId(es[0].id)
    })
  }, [])

  const encuestaActual = encuestas.find((e) => e.id === encuestaId)
  const esPaciente = encuestaActual?.tipo === 'paciente'
  const opcionesEscala: readonly string[] = esPaciente ? ESCALA_1_5 : ESCALA_4
  const colorEscala: Record<string, string> = esPaciente ? ESCALA_1_5_COLOR : ESCALA_4_COLOR
  const esPositivo = (valor: string) => (esPaciente ? Number(valor) >= 4 : valor === 'Excelente' || valor === 'Bueno')

  /** Las 3 gráficas se agregan del lado del servidor (funciones panel_distribucion /
   * panel_por_categoria / panel_conteo_diario, ver migración 0009) en vez de traer
   * todo `respuestas_detalle` paginado al cliente — eso tomaba 15-30s en encuestas
   * de alto volumen (Alimentación). El detalle fila-por-fila solo se consulta bajo
   * demanda al abrir un popover (ver cargarDetalle500). */
  async function recargar() {
    if (!encuestaId) return
    const miCarga = ++cargaVigenteRef.current
    setCargando(true)
    const params = { p_encuesta_id: encuestaId, p_desde: desde || undefined, p_hasta: hasta || undefined }
    const [{ data: dist }, { data: cat }, { data: dia }] = await Promise.all([
      supabase.rpc('panel_distribucion', params),
      supabase.rpc('panel_por_categoria', params),
      supabase.rpc('panel_conteo_diario', params),
    ])
    if (cargaVigenteRef.current !== miCarga) return
    setConteoValores(new Map((dist ?? []).map((d: any) => [String(d.valor), Number(d.cantidad)])))
    setPorCategoria(
      (cat ?? []).map((c: any) => ({
        categoria: c.categoria,
        categoriaAreaId: c.categoria_area_id === null || c.categoria_area_id === undefined ? null : Number(c.categoria_area_id),
        cantidad: Number(c.cantidad),
      })),
    )
    setConteoDiario((dia ?? []).map((d: any) => ({ dia: d.dia, cantidad: Number(d.cantidad) })))
    setCargando(false)
  }

  useEffect(() => {
    if (!encuestaId) return
    recargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encuestaId])

  const distribucion = useMemo(
    () => opcionesEscala.map((op) => ({ opcion: op, cantidad: conteoValores.get(op) ?? 0 })),
    [conteoValores, opcionesEscala],
  )
  const total = distribucion.reduce((acc, d) => acc + d.cantidad, 0)
  const positivos = distribucion.filter((d) => esPositivo(d.opcion)).reduce((acc, d) => acc + d.cantidad, 0)
  const pctSatisfaccion = total > 0 ? (positivos / total) * 100 : 0

  async function cargarDetalle500(filtro: { valor?: string; categoria?: CategoriaFila }): Promise<DetalleFila[]> {
    if (!encuestaId || !encuestaActual) return []
    const paciente = encuestaActual.tipo === 'paciente'
    let q = supabase
      .from('respuestas_detalle')
      .select(
        `valor, preguntas!inner(texto, tipo_respuesta), respuestas!inner(fecha_respuesta, encuesta_id, paciente_nombre, area_servicio_id, paciente_tipo_afiliacion, profiles(nombre), areas_servicio(nombre))`,
      )
      .eq('preguntas.tipo_respuesta', paciente ? 'escala_1_5' : 'escala_4')
      .eq('respuestas.encuesta_id', encuestaId)
      .limit(500)
    if (desde) q = q.gte('respuestas.fecha_respuesta', desde)
    if (hasta) q = q.lte('respuestas.fecha_respuesta', hasta)
    if (filtro.valor) q = q.eq('valor', filtro.valor)
    if (filtro.categoria) {
      if (paciente) q = q.eq('respuestas.paciente_tipo_afiliacion', filtro.categoria.categoria)
      else if (filtro.categoria.categoriaAreaId === null) q = q.is('respuestas.area_servicio_id', null)
      else q = q.eq('respuestas.area_servicio_id', filtro.categoria.categoriaAreaId)
    }
    const { data } = await q
    return (data ?? [])
      .map((r: any) => ({
        valor: r.valor,
        pregunta_texto: r.preguntas.texto,
        fecha_respuesta: r.respuestas.fecha_respuesta,
        paciente_nombre: r.respuestas.paciente_nombre ?? null,
        servicio: paciente ? null : (r.respuestas.areas_servicio?.nombre ?? null),
        respondido_por_nombre: r.respuestas.profiles?.nombre ?? null,
      }))
      .sort((a, b) => b.fecha_respuesta.localeCompare(a.fecha_respuesta))
  }

  async function abrirPopoverValor(e: { clientX?: number; clientY?: number } | undefined, opcion: string, cantidad: number) {
    if (cantidad === 0) return
    const { x, y } = posicionPopover(e)
    setPopover({ x, y, titulo: `${opcion} (${cantidad})`, filas: [], cargando: true })
    const filas = await cargarDetalle500({ valor: opcion })
    setPopover({ x, y, titulo: `${opcion} (${cantidad})`, filas, cargando: false })
  }

  async function abrirPopoverCategoria(e: { clientX?: number; clientY?: number } | undefined, cat: CategoriaFila) {
    if (cat.cantidad === 0) return
    const { x, y } = posicionPopover(e)
    setPopover({ x, y, titulo: `${cat.categoria} (${cat.cantidad})`, filas: [], cargando: true })
    const filas = await cargarDetalle500({ categoria: cat })
    setPopover({ x, y, titulo: `${cat.categoria} (${cat.cantidad})`, filas, cargando: false })
  }

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
        <Boton onClick={recargar} disabled={cargando}>
          {cargando ? 'Cargando…' : 'Filtrar'}
        </Boton>
      </FilterBar>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center">
          <h2 className="mb-3 self-start font-semibold text-[var(--azul)]">Satisfacción</h2>
          <AnilloSimple pct={pctSatisfaccion} color="#16a34a">
            <span className="text-2xl font-bold text-[var(--azul)]">{pctSatisfaccion.toFixed(0)}%</span>
            <span className="text-[10px] text-slate-500">{esPaciente ? 'Calificación 4 y 5' : 'Excelente + Bueno'}</span>
          </AnilloSimple>
          <p className="mt-3 text-center text-[11px] leading-snug text-slate-500">
            % de satisfacción = respuestas {esPaciente ? 'con calificación 4 o 5' : 'Excelente o Bueno'} ÷ total de
            respuestas del período.
            <br />
            <strong className="text-slate-600">
              {positivos} de {total}
            </strong>{' '}
            respuestas cuentan como positivas.
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-[var(--azul)]">
            Distribución — {encuestaActual?.proveedor ?? encuestaActual?.nombre ?? ''}
          </h2>
          <div className="flex flex-wrap items-end gap-4">
            {distribucion.map((d) => (
              <button
                key={d.opcion}
                onClick={(e) => abrirPopoverValor(e, d.opcion, d.cantidad)}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className="w-9 rounded-t-lg"
                  style={{
                    height: Math.max(6, (d.cantidad / Math.max(1, total)) * 120),
                    background: colorEscala[d.opcion],
                  }}
                />
                <span className="text-[11px] font-medium text-slate-600">{d.opcion}</span>
                <span className="text-xs text-slate-400">{d.cantidad}</span>
              </button>
            ))}
            {total === 0 && <p className="text-sm text-slate-500">Sin respuestas todavía.</p>}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 pt-3">
            {opcionesEscala.map((op) => (
              <div key={op} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorEscala[op] }} />
                <span>
                  <strong className="font-medium text-slate-600">{op}</strong>
                  {esPaciente ? ` = ${ESCALA_1_5_LABEL[op]}` : ` — ${DESCRIPCION_ESCALA_4[op]}`}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-[var(--azul)]">Encuestas realizadas por día</h2>
          {conteoDiario.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={conteoDiario} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#c3cbe0" />
                <XAxis
                  dataKey="dia"
                  tick={{ fontSize: 9 }}
                  interval="preserveStartEnd"
                  angle={-40}
                  textAnchor="end"
                  height={40}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={30} />
                <RTooltip />
                <Bar dataKey="cantidad" fill="#16468e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500">Sin datos suficientes.</p>
          )}
          <p className="mt-1 text-[10px] text-slate-400">Cantidad de encuestas diligenciadas por día en el período filtrado</p>
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
              onClick={(data: any, _i, e) => abrirPopoverCategoria(e, data)}
              cursor="pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <PopoverDetalle popover={popover} onClose={() => setPopover(null)} colorEscala={colorEscala} />
    </div>
  )
}
