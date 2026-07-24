import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { listarEncuestas, formatearFechaHora } from '../lib/data'
import { PageHeader, Card, FilterBar, Input, Select, Boton, Badge, calcularPosicionPopover } from '../components/ui'
import { ROL_LABEL } from '../lib/constantes'
import type { Database } from '../lib/database.types'

type Encuesta = Database['public']['Tables']['encuestas']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

type Item = { encuesta: Encuesta; diligenciada: boolean; cantidad: number; ultimaFecha: string | null }
type Fila = { usuario: Profile; items: Item[]; totalRespuestas: number; pendientes: number }

type RespuestaFila = {
  id: number
  encuestaNombre: string
  fechaHora: string
  detalle: string | null
}

type PopoverUsuario = { x: number; y: number; usuario: string; filas: RespuestaFila[] } | null

export default function EstadoEncuestas() {
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [encuestas, setEncuestas] = useState<Encuesta[]>([])
  const [asignaciones, setAsignaciones] = useState<Map<string, number[]>>(new Map())
  const [conteos, setConteos] = useState<Map<string, { cantidad: number; ultimaFecha: string }>>(new Map())
  const [respuestasPorUsuario, setRespuestasPorUsuario] = useState<Map<string, RespuestaFila[]>>(new Map())
  const [totalRealizadas, setTotalRealizadas] = useState(0)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [estado, setEstado] = useState<'todas' | 'diligenciadas' | 'pendientes'>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [popover, setPopover] = useState<PopoverUsuario>(null)

  async function cargar() {
    setCargando(true)
    const [{ data: perfiles }, es, { data: asign }] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .in('role', ['encuestado', 'orientador'])
        .eq('activo', true)
        .order('nombre'),
      listarEncuestas(),
      supabase.from('asignaciones_encuestado').select('profile_id, encuesta_id'),
    ])
    setUsuarios(perfiles ?? [])
    setEncuestas(es)
    const mapaAsignaciones = new Map<string, number[]>()
    for (const a of asign ?? []) {
      const lista = mapaAsignaciones.get(a.profile_id) ?? []
      lista.push(a.encuesta_id)
      mapaAsignaciones.set(a.profile_id, lista)
    }
    setAsignaciones(mapaAsignaciones)

    const ids = (perfiles ?? []).map((u) => u.id)
    let q = supabase
      .from('respuestas')
      .select('id, respondido_por, encuesta_id, fecha_respuesta, created_at, paciente_nombre, areas_servicio(nombre)')
      .in('respondido_por', ids)
      .order('created_at', { ascending: false })
    if (desde) q = q.gte('fecha_respuesta', desde)
    if (hasta) q = q.lte('fecha_respuesta', hasta)
    const { data: resp } = await q

    const mapaConteos = new Map<string, { cantidad: number; ultimaFecha: string }>()
    const mapaRespuestas = new Map<string, RespuestaFila[]>()
    for (const r of resp ?? []) {
      const clave = `${r.respondido_por}:${r.encuesta_id}`
      const actual = mapaConteos.get(clave)
      if (actual) {
        actual.cantidad++
        if (r.fecha_respuesta > actual.ultimaFecha) actual.ultimaFecha = r.fecha_respuesta
      } else {
        mapaConteos.set(clave, { cantidad: 1, ultimaFecha: r.fecha_respuesta })
      }

      if (r.respondido_por) {
        const encuesta = es.find((e) => e.id === r.encuesta_id)
        const lista = mapaRespuestas.get(r.respondido_por) ?? []
        lista.push({
          id: r.id,
          encuestaNombre: encuesta?.proveedor ?? encuesta?.nombre ?? `Encuesta #${r.encuesta_id}`,
          fechaHora: formatearFechaHora(r.created_at),
          detalle: r.paciente_nombre ?? (r.areas_servicio as unknown as { nombre: string } | null)?.nombre ?? null,
        })
        mapaRespuestas.set(r.respondido_por, lista)
      }
    }
    setConteos(mapaConteos)
    setRespuestasPorUsuario(mapaRespuestas)
    setTotalRealizadas(resp?.length ?? 0)
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filas = useMemo((): Fila[] => {
    const q = busqueda.trim().toLowerCase()
    const resultado: Fila[] = []
    for (const usuario of usuarios) {
      if (q && !usuario.nombre.toLowerCase().includes(q) && !usuario.email.toLowerCase().includes(q)) continue
      const encuestaIds = asignaciones.get(usuario.id) ?? []
      if (encuestaIds.length === 0) continue
      const todosLosItems: Item[] = encuestaIds
        .map((id) => encuestas.find((e) => e.id === id))
        .filter((e): e is Encuesta => !!e)
        .map((encuesta) => {
          const clave = `${usuario.id}:${encuesta.id}`
          const conteo = conteos.get(clave)
          return { encuesta, diligenciada: !!conteo, cantidad: conteo?.cantidad ?? 0, ultimaFecha: conteo?.ultimaFecha ?? null }
        })
      const totalRespuestas = todosLosItems.reduce((acc, i) => acc + i.cantidad, 0)
      const pendientes = todosLosItems.filter((i) => !i.diligenciada).length
      let items = todosLosItems
      if (estado === 'diligenciadas') items = items.filter((i) => i.diligenciada)
      if (estado === 'pendientes') items = items.filter((i) => !i.diligenciada)
      if (items.length === 0) continue
      resultado.push({ usuario, items, totalRespuestas, pendientes })
    }
    return resultado
  }, [usuarios, encuestas, asignaciones, conteos, busqueda, estado])

  function abrirPopoverUsuario(usuario: Profile, e: { clientX: number; clientY: number }) {
    const filas = respuestasPorUsuario.get(usuario.id) ?? []
    if (filas.length === 0) return
    const { x, y } = calcularPosicionPopover(e)
    setPopover({ x, y, usuario: usuario.nombre, filas })
  }

  return (
    <div>
      <PageHeader
        titulo="Estado de encuestas por usuario"
        acciones={
          <Badge tono="verde">
            {totalRealizadas} encuesta{totalRealizadas === 1 ? '' : 's'} realizada{totalRealizadas === 1 ? '' : 's'} en el período
          </Badge>
        }
      />
      <p className="mb-4 text-sm text-slate-500">
        Encuestas asignadas a cada usuario: en verde las diligenciadas y en rojo las pendientes, según el período
        filtrado. Haz clic en "realizada(s)" para ver el detalle de esas encuestas.
      </p>

      <FilterBar>
        <div className="w-56">
          <label className="mb-1 block text-xs text-slate-500">Buscar usuario</label>
          <Input placeholder="Nombre o correo…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs text-slate-500">Desde</label>
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs text-slate-500">Hasta</label>
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div className="w-44">
          <label className="mb-1 block text-xs text-slate-500">Estado</label>
          <Select value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)}>
            <option value="todas">Todas</option>
            <option value="diligenciadas">Diligenciadas</option>
            <option value="pendientes">Pendientes</option>
          </Select>
        </div>
        <Boton onClick={cargar}>Filtrar</Boton>
      </FilterBar>

      <Card>
        {cargando ? (
          <p className="text-sm text-slate-500">Cargando…</p>
        ) : (
          <div className="flex flex-col gap-4">
            {filas.map(({ usuario, items, totalRespuestas, pendientes }) => (
              <div key={usuario.id} className="neu-pressed p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
                  <span>
                    {usuario.nombre} <span className="text-xs font-normal text-slate-500">· {ROL_LABEL[usuario.role]}</span>
                  </span>
                  <button
                    onClick={(e) => abrirPopoverUsuario(usuario, e)}
                    disabled={totalRespuestas === 0}
                    className="rounded-full bg-emerald-600/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 enabled:hover:bg-emerald-600/20 disabled:cursor-default"
                  >
                    {totalRespuestas} realizada{totalRespuestas === 1 ? '' : 's'}
                  </button>
                  <span className="rounded-full bg-rose-600/10 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                    {pendientes} encuesta{pendientes === 1 ? '' : 's'} sin diligenciar
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map(({ encuesta, diligenciada, cantidad, ultimaFecha }) => (
                    <span
                      key={encuesta.id}
                      title={diligenciada ? `Último registro: ${ultimaFecha}` : 'Sin registrar en el período'}
                      className={`rounded-full px-3 py-1 text-xs font-medium text-white ${
                        diligenciada ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    >
                      {encuesta.proveedor ?? encuesta.nombre} · {diligenciada ? `${cantidad} realizada${cantidad === 1 ? '' : 's'}` : 'Pendiente'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {filas.length === 0 && <p className="text-sm text-slate-500">Sin resultados para el filtro seleccionado.</p>}
          </div>
        )}
      </Card>

      {popover && (
        <div className="fixed inset-0 z-40" onClick={() => setPopover(null)}>
          <div
            className="neu-flat fixed z-50 w-96 overflow-hidden p-0"
            style={{ left: popover.x, top: popover.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 bg-[var(--azul)] px-3 py-2">
              <span className="text-xs font-bold text-white">
                {popover.usuario} · {popover.filas.length} encuesta{popover.filas.length === 1 ? '' : 's'}
              </span>
              <button onClick={() => setPopover(null)} className="text-white/70 hover:text-white">
                ✕
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-400">
                    <th className="px-3 py-2">Fecha y hora</th>
                    <th className="px-3 py-2">Encuesta</th>
                    <th className="px-3 py-2">Paciente / área</th>
                  </tr>
                </thead>
                <tbody>
                  {popover.filas.map((f) => (
                    <tr key={f.id} className="border-b border-slate-100">
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">{f.fechaHora}</td>
                      <td className="px-3 py-2 text-slate-700">{f.encuestaNombre}</td>
                      <td className="px-3 py-2 text-slate-500">{f.detalle ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
