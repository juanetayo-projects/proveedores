import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { listarEncuestas, listarPreguntas } from '../lib/data'
import { PageHeader, Card, Boton, Input, Select, Badge } from '../components/ui'
import { TIPO_RESPUESTA_LABEL, ROL_LABEL } from '../lib/constantes'
import type { Database } from '../lib/database.types'

type Encuesta = Database['public']['Tables']['encuestas']['Row']
type Pregunta = Database['public']['Tables']['preguntas']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

export default function GestionEncuesta() {
  const [encuestas, setEncuestas] = useState<Encuesta[]>([])
  const [activa, setActiva] = useState<Encuesta | null>(null)
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [asignados, setAsignados] = useState<Profile[]>([])
  const [candidatos, setCandidatos] = useState<Profile[]>([])
  const [nuevaPregunta, setNuevaPregunta] = useState('')
  const [tipoNuevaPregunta, setTipoNuevaPregunta] = useState('escala_4')

  async function cargar() {
    setEncuestas(await listarEncuestas())
  }
  useEffect(() => {
    cargar()
  }, [])

  async function abrir(e: Encuesta) {
    setActiva(e)
    setPreguntas(await listarPreguntas(e.id))
    const { data: asign } = await supabase
      .from('asignaciones_encuestado')
      .select('profile_id, profiles(*)')
      .eq('encuesta_id', e.id)
    setAsignados(((asign ?? []).map((a) => a.profiles).filter(Boolean)) as Profile[])

    const rolBuscado = e.tipo === 'paciente' ? 'orientador' : 'encuestado'
    const { data: perfiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', rolBuscado)
      .eq('activo', true)
    setCandidatos(perfiles ?? [])
  }

  async function guardarPeriodicidad(campo: 'fecha_apertura' | 'fecha_cierre' | 'siempre_abierta', valor: string | boolean) {
    if (!activa) return
    const cambio: Partial<Encuesta> = { [campo]: valor }
    const { error } = await supabase.from('encuestas').update(cambio).eq('id', activa.id)
    if (!error) {
      const actualizada = { ...activa, [campo]: valor } as Encuesta
      setActiva(actualizada)
      setEncuestas((es) => es.map((e) => (e.id === activa.id ? actualizada : e)))
    }
  }

  async function agregarPregunta() {
    if (!activa || !nuevaPregunta.trim()) return
    const orden = (preguntas.at(-1)?.orden ?? 0) + 1
    const { data, error } = await supabase
      .from('preguntas')
      .insert({ encuesta_id: activa.id, texto: nuevaPregunta.trim(), tipo_respuesta: tipoNuevaPregunta, orden })
      .select()
      .single()
    if (!error && data) {
      setPreguntas([...preguntas, data])
      setNuevaPregunta('')
    }
  }

  async function eliminarPregunta(id: number) {
    await supabase.from('preguntas').update({ activa: false }).eq('id', id)
    setPreguntas(preguntas.filter((p) => p.id !== id))
  }

  async function asignar(profileId: string) {
    if (!activa) return
    const { error } = await supabase
      .from('asignaciones_encuestado')
      .insert({ profile_id: profileId, encuesta_id: activa.id })
    if (!error) {
      const perfil = candidatos.find((c) => c.id === profileId)
      if (perfil) setAsignados([...asignados, perfil])
    }
  }

  async function desasignar(profileId: string) {
    if (!activa) return
    await supabase
      .from('asignaciones_encuestado')
      .delete()
      .eq('profile_id', profileId)
      .eq('encuesta_id', activa.id)
    setAsignados(asignados.filter((a) => a.id !== profileId))
  }

  if (!activa) {
    return (
      <div>
        <PageHeader titulo="Gestión de encuesta" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {encuestas.map((e) => (
            <Card key={e.id}>
              <div className="mb-1 font-semibold text-[var(--azul)]">{e.nombre}</div>
              {e.proveedor && <div className="mb-2 text-xs text-slate-500">{e.proveedor}</div>}
              <div className="mb-3">
                {e.siempre_abierta ? (
                  <Badge tono="verde">Siempre abierta</Badge>
                ) : e.fecha_apertura && e.fecha_cierre ? (
                  <Badge tono="azul">{e.fecha_apertura} a {e.fecha_cierre}</Badge>
                ) : (
                  <Badge tono="ambar">Sin programar</Badge>
                )}
              </div>
              <Boton variant="secundario" className="w-full" onClick={() => abrir(e)}>
                Gestionar
              </Boton>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const rolAsignable = activa.tipo === 'paciente' ? 'orientador' : 'encuestado'

  return (
    <div>
      <PageHeader
        titulo={activa.nombre}
        acciones={<Boton variant="secundario" onClick={() => setActiva(null)}>Volver</Boton>}
      />

      <Card className="mb-6">
        <h2 className="mb-3 font-semibold text-[var(--azul)]">Periodicidad</h2>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={activa.siempre_abierta}
            onChange={(e) => guardarPeriodicidad('siempre_abierta', e.target.checked)}
          />
          Encuesta siempre abierta (sin restricción de fechas)
        </label>
        {!activa.siempre_abierta && (
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Fecha de apertura</label>
              <Input
                type="date"
                value={activa.fecha_apertura ?? ''}
                onChange={(e) => guardarPeriodicidad('fecha_apertura', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Fecha de cierre</label>
              <Input
                type="date"
                value={activa.fecha_cierre ?? ''}
                onChange={(e) => guardarPeriodicidad('fecha_cierre', e.target.value)}
              />
            </div>
          </div>
        )}
      </Card>

      <Card className="mb-6">
        <h2 className="mb-3 font-semibold text-[var(--azul)]">Preguntas</h2>
        <ul className="mb-4 flex flex-col gap-2">
          {preguntas.map((p) => (
            <li key={p.id} className="neu-pressed flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div>
                <div>{p.texto}</div>
                <div className="text-xs text-slate-500">{TIPO_RESPUESTA_LABEL[p.tipo_respuesta]}</div>
              </div>
              <button onClick={() => eliminarPregunta(p.id)} className="text-xs text-rose-600 hover:underline">
                Quitar
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Texto de la nueva pregunta"
            value={nuevaPregunta}
            onChange={(e) => setNuevaPregunta(e.target.value)}
            className="flex-1"
          />
          <Select value={tipoNuevaPregunta} onChange={(e) => setTipoNuevaPregunta(e.target.value)} className="w-auto">
            <option value="escala_4">Excelente/Bueno/Regular/Deficiente</option>
            <option value="escala_1_5">Escala 1 a 5</option>
            <option value="si_no">Sí / No</option>
            <option value="texto_libre">Texto libre</option>
          </Select>
          <Boton onClick={agregarPregunta}>Agregar</Boton>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-[var(--azul)]">
          Encuestados asignados ({ROL_LABEL[rolAsignable]})
        </h2>
        <ul className="mb-4 flex flex-col gap-2">
          {asignados.map((a) => (
            <li key={a.id} className="neu-pressed flex items-center justify-between px-3 py-2 text-sm">
              {a.nombre} <span className="text-xs text-slate-500">{a.email}</span>
              <button onClick={() => desasignar(a.id)} className="text-xs text-rose-600 hover:underline">
                Quitar
              </button>
            </li>
          ))}
          {asignados.length === 0 && <p className="text-sm text-slate-500">Nadie asignado todavía.</p>}
        </ul>
        <Select onChange={(e) => e.target.value && asignar(e.target.value)} value="">
          <option value="">Asignar {ROL_LABEL[rolAsignable].toLowerCase()}…</option>
          {candidatos
            .filter((c) => !asignados.some((a) => a.id === c.id))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} — {c.email}
              </option>
            ))}
        </Select>
      </Card>
    </div>
  )
}
