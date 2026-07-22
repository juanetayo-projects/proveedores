import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { listarEncuestas } from '../lib/data'
import { PageHeader, Card, FilterBar, Input, Select, Boton, Badge } from '../components/ui'
import { ROL_LABEL } from '../lib/constantes'
import type { Database } from '../lib/database.types'

type Encuesta = Database['public']['Tables']['encuestas']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

type Item = { encuesta: Encuesta; diligenciada: boolean; ultimaFecha: string | null }
type Fila = { usuario: Profile; items: Item[] }

export default function EstadoEncuestas() {
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [encuestas, setEncuestas] = useState<Encuesta[]>([])
  const [asignaciones, setAsignaciones] = useState<Map<string, number[]>>(new Map())
  const [diligenciadas, setDiligenciadas] = useState<Map<string, string>>(new Map())
  const [totalRealizadas, setTotalRealizadas] = useState(0)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [estado, setEstado] = useState<'todas' | 'diligenciadas' | 'pendientes'>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)

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
    let q = supabase.from('respuestas').select('respondido_por, encuesta_id, fecha_respuesta').in('respondido_por', ids)
    if (desde) q = q.gte('fecha_respuesta', desde)
    if (hasta) q = q.lte('fecha_respuesta', hasta)
    const { data: resp } = await q
    const mapaDiligenciadas = new Map<string, string>()
    for (const r of resp ?? []) {
      const clave = `${r.respondido_por}:${r.encuesta_id}`
      const actual = mapaDiligenciadas.get(clave)
      if (!actual || r.fecha_respuesta > actual) mapaDiligenciadas.set(clave, r.fecha_respuesta)
    }
    setDiligenciadas(mapaDiligenciadas)
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
      let items: Item[] = encuestaIds
        .map((id) => encuestas.find((e) => e.id === id))
        .filter((e): e is Encuesta => !!e)
        .map((encuesta) => {
          const clave = `${usuario.id}:${encuesta.id}`
          const ultimaFecha = diligenciadas.get(clave) ?? null
          return { encuesta, diligenciada: !!ultimaFecha, ultimaFecha }
        })
      if (estado === 'diligenciadas') items = items.filter((i) => i.diligenciada)
      if (estado === 'pendientes') items = items.filter((i) => !i.diligenciada)
      if (items.length === 0) continue
      resultado.push({ usuario, items })
    }
    return resultado
  }, [usuarios, encuestas, asignaciones, diligenciadas, busqueda, estado])

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
        filtrado. Pasa el mouse sobre una diligenciada para ver la fecha del último registro.
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
            {filas.map(({ usuario, items }) => (
              <div key={usuario.id} className="neu-pressed p-3">
                <div className="mb-2 text-sm font-medium text-slate-700">
                  {usuario.nombre} <span className="text-xs font-normal text-slate-500">· {ROL_LABEL[usuario.role]}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map(({ encuesta, diligenciada, ultimaFecha }) => (
                    <span
                      key={encuesta.id}
                      title={diligenciada ? `Último registro: ${ultimaFecha}` : 'Sin registrar en el período'}
                      className={`rounded-full px-3 py-1 text-xs font-medium text-white ${
                        diligenciada ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    >
                      {encuesta.proveedor ?? encuesta.nombre} · {diligenciada ? 'Diligenciada' : 'Pendiente'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {filas.length === 0 && <p className="text-sm text-slate-500">Sin resultados para el filtro seleccionado.</p>}
          </div>
        )}
      </Card>
    </div>
  )
}
