import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { listarEncuestas } from '../lib/data'
import { PageHeader, Card, Input, Badge, Select } from '../components/ui'
import { ROL_LABEL } from '../lib/constantes'
import type { Database } from '../lib/database.types'

type Encuesta = Database['public']['Tables']['encuestas']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

const rolAsignableDeEncuesta = (e: Encuesta) => (e.tipo === 'paciente' ? 'orientador' : 'encuestado')
const tieneAccesoTotal = (u: Profile) => u.role === 'administrador' || u.role === 'coordinador_administrativo'

export default function Asignaciones() {
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [encuestas, setEncuestas] = useState<Encuesta[]>([])
  const [asignadas, setAsignadas] = useState<Set<string>>(new Set())
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardandoClave, setGuardandoClave] = useState<string | null>(null)
  const [consultaEncuestaId, setConsultaEncuestaId] = useState<number | ''>('')
  const [consultaUsuarioId, setConsultaUsuarioId] = useState('')

  async function cargar() {
    setCargando(true)
    const [{ data: perfiles }, es, { data: asign }] = await Promise.all([
      supabase.from('profiles').select('*').order('nombre'),
      listarEncuestas(),
      supabase.from('asignaciones_encuestado').select('profile_id, encuesta_id'),
    ])
    setUsuarios(perfiles ?? [])
    setEncuestas(es)
    setAsignadas(new Set((asign ?? []).map((a) => `${a.profile_id}:${a.encuesta_id}`)))
    setCargando(false)
  }
  useEffect(() => {
    cargar()
  }, [])

  const encuestasOrdenadas = useMemo(
    () => [...encuestas].sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'paciente' ? 1 : -1)),
    [encuestas],
  )

  const usuariosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return usuarios
    return usuarios.filter((u) => u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [usuarios, busqueda])

  const usuariosAsignables = useMemo(() => usuarios.filter((u) => !tieneAccesoTotal(u)), [usuarios])

  const conteoPorEncuesta = useMemo(() => {
    const map = new Map<number, number>()
    for (const e of encuestas) map.set(e.id, usuarios.filter((u) => asignadas.has(`${u.id}:${e.id}`)).length)
    return map
  }, [encuestas, usuarios, asignadas])

  const usuariosDeEncuestaConsultada = useMemo(() => {
    if (!consultaEncuestaId) return []
    return usuarios.filter((u) => asignadas.has(`${u.id}:${consultaEncuestaId}`))
  }, [usuarios, asignadas, consultaEncuestaId])

  const encuestasDeUsuarioConsultado = useMemo(() => {
    if (!consultaUsuarioId) return []
    return encuestasOrdenadas.filter((e) => asignadas.has(`${consultaUsuarioId}:${e.id}`))
  }, [encuestasOrdenadas, asignadas, consultaUsuarioId])

  async function alternar(usuario: Profile, encuesta: Encuesta) {
    if (rolAsignableDeEncuesta(encuesta) !== usuario.role) return
    const clave = `${usuario.id}:${encuesta.id}`
    setGuardandoClave(clave)
    const yaAsignada = asignadas.has(clave)
    if (yaAsignada) {
      const { error } = await supabase
        .from('asignaciones_encuestado')
        .delete()
        .eq('profile_id', usuario.id)
        .eq('encuesta_id', encuesta.id)
      if (!error) {
        setAsignadas((prev) => {
          const next = new Set(prev)
          next.delete(clave)
          return next
        })
      }
    } else {
      const { error } = await supabase
        .from('asignaciones_encuestado')
        .insert({ profile_id: usuario.id, encuesta_id: encuesta.id })
      if (!error) {
        setAsignadas((prev) => new Set(prev).add(clave))
      }
    }
    setGuardandoClave(null)
  }

  return (
    <div>
      <PageHeader titulo="Asignaciones de encuestas" />
      <p className="mb-1 text-sm text-slate-500">
        Marca qué encuestas puede diligenciar cada usuario. Un encuestado solo puede asignarse a encuestas de
        proveedor; un orientador solo a la encuesta de paciente (Servicio Alimentación). Administrador y Coordinador
        administrativo ya tienen acceso a todas las encuestas por su rol — se listan igual, marcados como "Acceso
        total", pero no requieren (ni permiten) asignación individual.
      </p>
      <p className="mb-4 text-xs text-slate-400">
        Mostrando {usuariosFiltrados.length} de {usuarios.length} usuario{usuarios.length === 1 ? '' : 's'} en total.
      </p>

      <div className="mb-4 w-72">
        <Input
          placeholder="Buscar por nombre o correo…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <Card className="p-0">
        {cargando ? (
          <p className="p-5 text-sm text-slate-500">Cargando…</p>
        ) : (
          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-xs uppercase text-slate-500">
                  <th className="sticky left-0 top-0 z-30 min-w-[200px] bg-[var(--neu-bg)] py-2 pl-4">Usuario</th>
                  {encuestasOrdenadas.map((e) => (
                    <th key={e.id} className="sticky top-0 z-20 min-w-[110px] bg-[var(--neu-bg)] px-2 py-2 text-center font-medium normal-case">
                      <div>{e.proveedor ?? e.nombre}</div>
                      <Badge tono={e.tipo === 'paciente' ? 'ambar' : 'azul'}>
                        {e.tipo === 'paciente' ? 'Paciente' : 'Proveedor'}
                      </Badge>
                      <div className="mt-1 text-[10px] font-normal normal-case text-slate-400">
                        {conteoPorEncuesta.get(e.id) ?? 0} asignado(s)
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u) => (
                  <tr key={u.id} className="border-b border-slate-200">
                    <td className="sticky left-0 z-10 min-w-[200px] bg-[var(--neu-bg)] py-2 pl-4">
                      <div className="flex items-center gap-2 font-medium text-slate-700">
                        {u.nombre}
                        {!u.activo && <Badge tono="rojo">Inactivo</Badge>}
                      </div>
                      <div className="text-xs text-slate-500">
                        {u.email} · {ROL_LABEL[u.role]}
                      </div>
                    </td>
                    {tieneAccesoTotal(u) ? (
                      <td colSpan={encuestasOrdenadas.length} className="px-2 py-2 text-center">
                        <Badge tono="verde">Acceso total — {ROL_LABEL[u.role]}</Badge>
                      </td>
                    ) : (
                      encuestasOrdenadas.map((e) => {
                        const aplica = rolAsignableDeEncuesta(e) === u.role
                        const clave = `${u.id}:${e.id}`
                        const marcada = asignadas.has(clave)
                        return (
                          <td key={e.id} className="px-2 py-2 text-center">
                            {aplica ? (
                              <input
                                type="checkbox"
                                checked={marcada}
                                disabled={guardandoClave === clave}
                                onChange={() => alternar(u, e)}
                                className="h-4 w-4 accent-[var(--azul)] disabled:opacity-50"
                              />
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        )
                      })
                    )}
                  </tr>
                ))}
                {usuariosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={encuestasOrdenadas.length + 1} className="py-4 text-center text-sm text-slate-500">
                      Ningún usuario encuestado/orientador encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold text-[var(--azul)]">Consultar usuarios de una encuesta</h2>
          <Select
            value={consultaEncuestaId}
            onChange={(e) => setConsultaEncuestaId(e.target.value ? Number(e.target.value) : '')}
            className="mb-3"
          >
            <option value="">Selecciona una encuesta…</option>
            {encuestasOrdenadas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.proveedor ?? e.nombre}
              </option>
            ))}
          </Select>
          {consultaEncuestaId !== '' && (
            <ul className="flex flex-col gap-2">
              {usuariosDeEncuestaConsultada.map((u) => (
                <li key={u.id} className="neu-pressed flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-medium text-slate-700">{u.nombre}</span>
                  <span className="text-xs text-slate-500">{u.email}</span>
                </li>
              ))}
              {usuariosDeEncuestaConsultada.length === 0 && (
                <p className="text-sm text-slate-500">Nadie tiene esta encuesta asignada todavía.</p>
              )}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-[var(--azul)]">Consultar encuestas de un usuario</h2>
          <Select value={consultaUsuarioId} onChange={(e) => setConsultaUsuarioId(e.target.value)} className="mb-3">
            <option value="">Selecciona un usuario…</option>
            {usuariosAsignables.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} — {u.email}
              </option>
            ))}
          </Select>
          <p className="mb-3 text-xs text-slate-400">
            Solo se listan usuarios con asignación individual (Encuestado/Orientador). Administrador y Coordinador
            administrativo tienen acceso total, no asignaciones puntuales.
          </p>
          {consultaUsuarioId !== '' && (
            <ul className="flex flex-col gap-2">
              {encuestasDeUsuarioConsultado.map((e) => (
                <li key={e.id} className="neu-pressed flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-medium text-slate-700">{e.proveedor ?? e.nombre}</span>
                  <Badge tono={e.tipo === 'paciente' ? 'ambar' : 'azul'}>
                    {e.tipo === 'paciente' ? 'Paciente' : 'Proveedor'}
                  </Badge>
                </li>
              ))}
              {encuestasDeUsuarioConsultado.length === 0 && (
                <p className="text-sm text-slate-500">Este usuario no tiene encuestas asignadas todavía.</p>
              )}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
