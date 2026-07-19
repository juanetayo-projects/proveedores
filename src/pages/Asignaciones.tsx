import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { listarEncuestas } from '../lib/data'
import { PageHeader, Card, Input, Badge } from '../components/ui'
import { ROL_LABEL } from '../lib/constantes'
import type { Database } from '../lib/database.types'

type Encuesta = Database['public']['Tables']['encuestas']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

const rolAsignableDeEncuesta = (e: Encuesta) => (e.tipo === 'paciente' ? 'orientador' : 'encuestado')

export default function Asignaciones() {
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [encuestas, setEncuestas] = useState<Encuesta[]>([])
  const [asignadas, setAsignadas] = useState<Set<string>>(new Set())
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardandoClave, setGuardandoClave] = useState<string | null>(null)

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
      <p className="mb-4 text-sm text-slate-500">
        Marca qué encuestas puede diligenciar cada usuario. Un encuestado solo puede asignarse a encuestas de
        proveedor; un orientador solo a la encuesta de paciente (Servicio Alimentación).
      </p>

      <div className="mb-4 w-72">
        <Input
          placeholder="Buscar por nombre o correo…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <Card className="overflow-x-auto p-0">
        {cargando ? (
          <p className="p-5 text-sm text-slate-500">Cargando…</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-xs uppercase text-slate-500">
                <th className="sticky left-0 min-w-[200px] bg-[var(--neu-bg)] py-2 pl-4">Usuario</th>
                {encuestasOrdenadas.map((e) => (
                  <th key={e.id} className="min-w-[110px] px-2 py-2 text-center font-medium normal-case">
                    <div>{e.proveedor ?? e.nombre}</div>
                    <Badge tono={e.tipo === 'paciente' ? 'ambar' : 'azul'}>
                      {e.tipo === 'paciente' ? 'Paciente' : 'Proveedor'}
                    </Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((u) => (
                <tr key={u.id} className="border-b border-slate-200">
                  <td className="sticky left-0 min-w-[200px] bg-[var(--neu-bg)] py-2 pl-4">
                    <div className="font-medium text-slate-700">{u.nombre}</div>
                    <div className="text-xs text-slate-500">
                      {u.email} · {ROL_LABEL[u.role]}
                    </div>
                  </td>
                  {encuestasOrdenadas.map((e) => {
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
                  })}
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
        )}
      </Card>
    </div>
  )
}
