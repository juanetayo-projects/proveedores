import { useEffect, useMemo, useRef, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
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

function primerDiaDelMes(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function hoyISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type DetalleFila = {
  valor: string
  pregunta_texto: string
  pregunta_orden: number
  fecha_respuesta: string
  paciente_nombre: string | null
  evaluado: string | null
  servicio: string | null
  respondido_por_nombre: string | null
}

type CategoriaFila = { categoria: string; categoriaAreaId: number | null; cantidad: number }
type PreguntaProm = { pregunta_id: number; texto: string; orden: number; promedio: number | null; escalaMax: number }
type EncuestadorFila = { profileId: string; nombre: string; cantidad: number }

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

function iniciales(nombre: string | null): string {
  if (!nombre) return '?'
  const partes = nombre.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?'
}

/** Gráfico tipo velocímetro/reloj: aguja sobre un semicírculo con 3 zonas de
 * color, para el % de satisfacción del período filtrado. */
function Velocimetro({ pct, tamano = 200 }: { pct: number; tamano?: number }) {
  const cx = tamano / 2
  const cy = tamano / 2 + 6
  const r = tamano / 2 - 22
  const clamped = Math.max(0, Math.min(100, pct))
  const anguloAguja = -180 + (clamped / 100) * 180
  const radAguja = (anguloAguja * Math.PI) / 180
  const agujaX = cx + r * 0.82 * Math.cos(radAguja)
  const agujaY = cy + r * 0.82 * Math.sin(radAguja)

  function arco(desdePct: number, hastaPct: number) {
    const a1 = ((-180 + (desdePct / 100) * 180) * Math.PI) / 180
    const a2 = ((-180 + (hastaPct / 100) * 180) * Math.PI) / 180
    const x1 = cx + r * Math.cos(a1)
    const y1 = cy + r * Math.sin(a1)
    const x2 = cx + r * Math.cos(a2)
    const y2 = cy + r * Math.sin(a2)
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`
  }

  return (
    <svg width={tamano} height={tamano / 2 + 26} viewBox={`0 0 ${tamano} ${tamano / 2 + 26}`}>
      <path d={arco(0, 50)} stroke="#dc2626" strokeWidth={16} fill="none" />
      <path d={arco(50, 75)} stroke="#d97706" strokeWidth={16} fill="none" />
      <path d={arco(75, 100)} stroke="#16a34a" strokeWidth={16} fill="none" />
      <line x1={cx} y1={cy} x2={agujaX} y2={agujaY} stroke="#0D2D6B" strokeWidth={3} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill="#0D2D6B" />
      <text x={cx} y={cy - 14} textAnchor="middle" fontSize="22" fontWeight="bold" fill="#0D2D6B">
        {clamped.toFixed(0)}%
      </text>
    </svg>
  )
}

type PopoverState = { x: number; y: number; titulo: string; filas: DetalleFila[]; cargando: boolean } | null

function posicionPopover(e: { clientX?: number; clientY?: number } | undefined) {
  const cx = e?.clientX ?? window.innerWidth / 2
  const cy = e?.clientY ?? window.innerHeight / 2
  return { x: Math.max(8, Math.min(cx, window.innerWidth - 360)), y: Math.max(8, Math.min(cy, window.innerHeight - 340)) }
}

/** Tarjetas de detalle con diseño tipo Odoo: fila de "chatter" (avatar + quién
 * + cuándo), etiquetas grises de contexto, y el valor de la calificación
 * antes de la pregunta (no debajo). */
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
        className="fixed z-50 w-96 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        style={{ left: popover.x, top: popover.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 bg-[var(--azul)] px-3 py-2">
          <span className="text-xs font-bold text-white">{popover.titulo}</span>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            ✕
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {popover.cargando && <p className="py-2 text-center text-xs text-slate-400">Cargando…</p>}
          {!popover.cargando &&
            popover.filas.map((f, i) => (
              <div key={i} className="mb-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 text-[11px] last:mb-0">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--azul)] text-[10px] font-bold text-white">
                    {iniciales(f.respondido_por_nombre)}
                  </span>
                  <span className="flex-1 font-medium text-slate-700">{f.respondido_por_nombre ?? 'Sin registrar'}</span>
                  <span className="shrink-0 text-slate-400">{f.fecha_respuesta}</span>
                </div>
                {(f.paciente_nombre || f.evaluado || f.servicio) && (
                  <div className="mb-1.5 flex flex-wrap gap-1">
                    {f.paciente_nombre && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600">
                        Paciente: {f.paciente_nombre}
                      </span>
                    )}
                    {f.evaluado && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600">
                        Evaluado: {f.evaluado}
                      </span>
                    )}
                    {f.servicio && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600">{f.servicio}</span>
                    )}
                  </div>
                )}
                <div className="rounded-md bg-white p-2">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                      style={{ background: colorEscala[f.valor] ?? '#64748b' }}
                    >
                      {f.valor}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Pregunta {f.pregunta_orden}
                    </span>
                  </div>
                  <span className="text-slate-700">{f.pregunta_texto}</span>
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
  const [desde, setDesde] = useState(primerDiaDelMes())
  const [hasta, setHasta] = useState(hoyISO())
  const [cargando, setCargando] = useState(false)
  const [conteoValores, setConteoValores] = useState<Map<string, number>>(new Map())
  const [porCategoria, setPorCategoria] = useState<CategoriaFila[]>([])
  const [conteoDiario, setConteoDiario] = useState<{ dia: string; cantidad: number }[]>([])
  const [promedioPregunta, setPromedioPregunta] = useState<PreguntaProm[]>([])
  const [porEncuestador, setPorEncuestador] = useState<EncuestadorFila[]>([])
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

  /** Las 5 gráficas se agregan del lado del servidor (funciones panel_* de las
   * migraciones 0009/0010) en vez de traer todo `respuestas_detalle` paginado
   * al cliente — eso tomaba 15-30s en encuestas de alto volumen (Alimentación).
   * El detalle fila-por-fila solo se consulta bajo demanda al abrir un popover
   * (ver cargarDetalle500). */
  async function recargar() {
    if (!encuestaId) return
    const miCarga = ++cargaVigenteRef.current
    setCargando(true)
    const params = { p_encuesta_id: encuestaId, p_desde: desde || undefined, p_hasta: hasta || undefined }
    const [{ data: dist }, { data: cat }, { data: dia }, { data: prom }, { data: enc }] = await Promise.all([
      supabase.rpc('panel_distribucion', params),
      supabase.rpc('panel_por_categoria', params),
      supabase.rpc('panel_conteo_diario', params),
      supabase.rpc('panel_promedio_pregunta', params),
      supabase.rpc('panel_por_encuestador', params),
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
    setPromedioPregunta(
      (prom ?? []).map((p: any) => ({
        pregunta_id: p.pregunta_id,
        texto: p.pregunta_texto,
        orden: p.orden,
        promedio: p.promedio === null ? null : Number(p.promedio),
        escalaMax: Number(p.escala_max),
      })),
    )
    setPorEncuestador(
      (enc ?? []).map((e: any) => ({ profileId: e.profile_id, nombre: e.nombre, cantidad: Number(e.cantidad) })),
    )
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

  async function cargarDetalle500(filtro: {
    valor?: string
    categoria?: CategoriaFila
    respondidoPor?: string
  }): Promise<DetalleFila[]> {
    if (!encuestaId || !encuestaActual) return []
    const paciente = encuestaActual.tipo === 'paciente'
    let q = supabase
      .from('respuestas_detalle')
      .select(
        `valor, preguntas!inner(texto, orden, tipo_respuesta), respuestas!inner(fecha_respuesta, encuesta_id, respondido_por, paciente_nombre, identificador_evaluado, area_servicio_id, paciente_tipo_afiliacion, profiles(nombre), areas_servicio(nombre))`,
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
    if (filtro.respondidoPor) q = q.eq('respuestas.respondido_por', filtro.respondidoPor)
    const { data } = await q
    return (data ?? [])
      .map((r: any) => ({
        valor: r.valor,
        pregunta_texto: r.preguntas.texto,
        pregunta_orden: r.preguntas.orden,
        fecha_respuesta: r.respuestas.fecha_respuesta,
        paciente_nombre: paciente ? (r.respuestas.paciente_nombre ?? null) : null,
        evaluado: paciente ? null : (r.respuestas.identificador_evaluado ?? null),
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

  async function abrirPopoverEncuestador(e: { clientX?: number; clientY?: number } | undefined, fila: EncuestadorFila) {
    if (fila.cantidad === 0) return
    const { x, y } = posicionPopover(e)
    setPopover({ x, y, titulo: `${fila.nombre} (${fila.cantidad})`, filas: [], cargando: true })
    const filas = await cargarDetalle500({ respondidoPor: fila.profileId })
    setPopover({ x, y, titulo: `${fila.nombre} (${fila.cantidad})`, filas, cargando: false })
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
              <LineChart data={conteoDiario} margin={{ bottom: 20 }}>
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
                <Line type="monotone" dataKey="cantidad" stroke="#16468e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500">Sin datos suficientes.</p>
          )}
          <p className="mt-1 text-[10px] text-slate-400">Cantidad de encuestas diligenciadas por día en el período filtrado</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-4 font-semibold text-[var(--azul)]">
            {esPaciente ? 'Respuestas por tipo de afiliación' : 'Respuestas por área/servicio'}
          </h2>
          <ResponsiveContainer width="100%" height={Math.max(160, porCategoria.length * 36)}>
            <BarChart data={porCategoria} layout="vertical" margin={{ left: 40 }}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="categoria" width={140} tick={{ fontSize: 11 }} />
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

        <Card>
          <h2 className="mb-4 font-semibold text-[var(--azul)]">Promedio por pregunta</h2>
          {promedioPregunta.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(160, promedioPregunta.length * 34)}>
              <BarChart data={promedioPregunta} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" domain={[0, promedioPregunta[0]?.escalaMax ?? 4]} allowDecimals={false} />
                <YAxis type="category" dataKey="orden" width={92} tick={{ fontSize: 10 }} tickFormatter={(v) => `Pregunta ${v}`} />
                <RTooltip
                  formatter={(v) => Number(v).toFixed(2)}
                  labelFormatter={(orden) => promedioPregunta.find((p) => p.orden === orden)?.texto ?? `Pregunta ${orden}`}
                />
                <Bar dataKey="promedio" fill="#16a34a" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500">Sin datos suficientes.</p>
          )}
          <p className="mt-1 text-[10px] text-slate-400">
            Calificación promedio de cada pregunta (escala hasta {promedioPregunta[0]?.escalaMax ?? (esPaciente ? 5 : 4)})
          </p>
        </Card>

        <Card className="flex flex-col items-center">
          <h2 className="mb-2 self-start font-semibold text-[var(--azul)]">Nivel de satisfacción</h2>
          <Velocimetro pct={pctSatisfaccion} />
          <div className="mt-2 flex gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-600" /> 0-50
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> 50-75
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-600" /> 75-100
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400">% de satisfacción del período filtrado</p>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="mb-1 font-semibold text-[var(--azul)]">
          Encuestas realizadas por {esPaciente ? 'orientador' : 'encuestado'}
        </h2>
        <p className="mb-4 text-[10px] text-slate-400">
          Comparativo de volumen por persona en el período filtrado — útil para ver niveles de eficacia. Haz clic en
          una barra para ver el detalle.
        </p>
        {porEncuestador.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(160, porEncuestador.length * 32)}>
            <BarChart data={porEncuestador} layout="vertical" margin={{ left: 40 }}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="nombre" width={160} tick={{ fontSize: 11 }} />
              <RTooltip />
              <Bar
                dataKey="cantidad"
                fill="#7e14ff"
                radius={[0, 8, 8, 0]}
                onClick={(data: any, _i, e) => abrirPopoverEncuestador(e, data)}
                cursor="pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-500">Sin respuestas registradas con cuenta vinculada en este período.</p>
        )}
      </Card>

      <PopoverDetalle popover={popover} onClose={() => setPopover(null)} colorEscala={colorEscala} />
    </div>
  )
}
