import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { listarEncuestas, listarPreguntas } from '../lib/data'
import { PageHeader, Card, Boton, Input, Select, Badge, Modal } from '../components/ui'
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
  const [editandoPregunta, setEditandoPregunta] = useState<number | null>(null)
  const [formPregunta, setFormPregunta] = useState({ texto: '', tipo_respuesta: 'escala_4', requerida: true })

  const [modalNueva, setModalNueva] = useState(false)
  const [nuevaEncuesta, setNuevaEncuesta] = useState({ nombre: '', proveedor: '', codigo: '', tipo: 'proveedor' as 'proveedor' | 'paciente' })
  const [errorNueva, setErrorNueva] = useState<string | null>(null)

  async function cargar() {
    setEncuestas(await listarEncuestas())
  }
  useEffect(() => {
    cargar()
  }, [])

  async function abrir(e: Encuesta) {
    setActiva(e)
    setPreguntas(await listarPreguntas(e.id))
    setEditandoPregunta(null)
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

  async function guardarCampoEncuesta(campo: keyof Encuesta, valor: string | boolean) {
    if (!activa) return
    const cambio: Partial<Encuesta> = { [campo]: valor }
    const { error } = await supabase.from('encuestas').update(cambio).eq('id', activa.id)
    if (!error) {
      const actualizada = { ...activa, [campo]: valor } as Encuesta
      setActiva(actualizada)
      setEncuestas((es) => es.map((e) => (e.id === activa.id ? actualizada : e)))
    }
  }

  async function crearEncuesta() {
    setErrorNueva(null)
    if (!nuevaEncuesta.nombre.trim() || !nuevaEncuesta.codigo.trim()) {
      setErrorNueva('Nombre y código son obligatorios.')
      return
    }
    const { data, error } = await supabase
      .from('encuestas')
      .insert({
        nombre: nuevaEncuesta.nombre.trim(),
        proveedor: nuevaEncuesta.proveedor.trim() || null,
        codigo: nuevaEncuesta.codigo.trim().toLowerCase().replace(/\s+/g, '_'),
        tipo: nuevaEncuesta.tipo,
      })
      .select()
      .single()
    if (error) {
      setErrorNueva(error.message)
      return
    }
    setEncuestas([...encuestas, data])
    setModalNueva(false)
    setNuevaEncuesta({ nombre: '', proveedor: '', codigo: '', tipo: 'proveedor' })
  }

  async function alternarActivaEncuesta(e: Encuesta) {
    const { error } = await supabase.from('encuestas').update({ activa: !e.activa }).eq('id', e.id)
    if (!error) setEncuestas((es) => es.map((x) => (x.id === e.id ? { ...x, activa: !e.activa } : x)))
  }

  async function eliminarEncuesta(e: Encuesta) {
    if (!confirm(`¿Eliminar "${e.nombre}"${e.proveedor ? ` (${e.proveedor})` : ''}? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('encuestas').delete().eq('id', e.id)
    if (error) {
      alert('No se pudo eliminar: ya tiene respuestas o preguntas registradas. Puedes desactivarla en su lugar.')
      return
    }
    setEncuestas(encuestas.filter((x) => x.id !== e.id))
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

  function iniciarEdicionPregunta(p: Pregunta) {
    setEditandoPregunta(p.id)
    setFormPregunta({ texto: p.texto, tipo_respuesta: p.tipo_respuesta, requerida: p.requerida })
  }

  async function guardarEdicionPregunta(id: number) {
    const { error } = await supabase
      .from('preguntas')
      .update({ texto: formPregunta.texto, tipo_respuesta: formPregunta.tipo_respuesta, requerida: formPregunta.requerida })
      .eq('id', id)
    if (!error) {
      setPreguntas(preguntas.map((p) => (p.id === id ? { ...p, ...formPregunta } : p)))
      setEditandoPregunta(null)
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
    if (error) {
      alert(error.message)
      return
    }
    const perfil = candidatos.find((c) => c.id === profileId)
    if (perfil) setAsignados([...asignados, perfil])
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
        <PageHeader titulo="Gestión de encuesta" acciones={<Boton onClick={() => setModalNueva(true)}>Nueva encuesta</Boton>} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {encuestas.map((e) => (
            <Card key={e.id}>
              <div className="mb-1 font-semibold text-[var(--azul)]">{e.nombre}</div>
              {e.proveedor && <div className="mb-2 text-xs text-slate-500">{e.proveedor}</div>}
              <div className="mb-3 flex flex-wrap gap-2">
                {e.siempre_abierta ? (
                  <Badge tono="verde">Siempre abierta</Badge>
                ) : e.fecha_apertura && e.fecha_cierre ? (
                  <Badge tono="azul">{e.fecha_apertura} a {e.fecha_cierre}</Badge>
                ) : (
                  <Badge tono="ambar">Sin programar</Badge>
                )}
                {!e.activa && <Badge tono="rojo">Inactiva</Badge>}
              </div>
              <div className="flex gap-2">
                <Boton variant="secundario" className="flex-1" onClick={() => abrir(e)}>
                  Gestionar
                </Boton>
              </div>
              <div className="mt-2 flex justify-between text-xs">
                <button onClick={() => alternarActivaEncuesta(e)} className="text-[var(--azul-2)] hover:underline">
                  {e.activa ? 'Desactivar' : 'Activar'}
                </button>
                <button onClick={() => eliminarEncuesta(e)} className="text-rose-600 hover:underline">
                  Eliminar
                </button>
              </div>
            </Card>
          ))}
        </div>

        <Modal open={modalNueva} onClose={() => setModalNueva(false)} titulo="Nueva encuesta">
          <div className="flex flex-col gap-3">
            <Input
              placeholder="Nombre de la encuesta"
              value={nuevaEncuesta.nombre}
              onChange={(e) => setNuevaEncuesta({ ...nuevaEncuesta, nombre: e.target.value })}
            />
            <Input
              placeholder="Proveedor (opcional)"
              value={nuevaEncuesta.proveedor}
              onChange={(e) => setNuevaEncuesta({ ...nuevaEncuesta, proveedor: e.target.value })}
            />
            <Input
              placeholder="Código único (ej. nuevo_proveedor)"
              value={nuevaEncuesta.codigo}
              onChange={(e) => setNuevaEncuesta({ ...nuevaEncuesta, codigo: e.target.value })}
            />
            <Select
              value={nuevaEncuesta.tipo}
              onChange={(e) => setNuevaEncuesta({ ...nuevaEncuesta, tipo: e.target.value as 'proveedor' | 'paciente' })}
            >
              <option value="proveedor">Proveedor (la responde personal interno)</option>
              <option value="paciente">Paciente (la responde el paciente, la registra un orientador)</option>
            </Select>
            {errorNueva && <p className="text-sm text-rose-600">{errorNueva}</p>}
            <Boton onClick={crearEncuesta}>Crear</Boton>
          </div>
        </Modal>
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
        <h2 className="mb-3 font-semibold text-[var(--azul)]">Datos generales</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Nombre</label>
            <Input
              value={activa.nombre}
              onChange={(e) => guardarCampoEncuesta('nombre', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Proveedor</label>
            <Input
              value={activa.proveedor ?? ''}
              onChange={(e) => guardarCampoEncuesta('proveedor', e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-3 font-semibold text-[var(--azul)]">Periodicidad</h2>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={activa.siempre_abierta}
            onChange={(e) => guardarCampoEncuesta('siempre_abierta', e.target.checked)}
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
                onChange={(e) => guardarCampoEncuesta('fecha_apertura', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Fecha de cierre</label>
              <Input
                type="date"
                value={activa.fecha_cierre ?? ''}
                onChange={(e) => guardarCampoEncuesta('fecha_cierre', e.target.value)}
              />
            </div>
          </div>
        )}
      </Card>

      <Card className="mb-6">
        <h2 className="mb-3 font-semibold text-[var(--azul)]">Preguntas</h2>
        <ul className="mb-4 flex flex-col gap-2">
          {preguntas.map((p) =>
            editandoPregunta === p.id ? (
              <li key={p.id} className="neu-pressed flex flex-col gap-2 px-3 py-2 text-sm">
                <Input
                  value={formPregunta.texto}
                  onChange={(e) => setFormPregunta({ ...formPregunta, texto: e.target.value })}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={formPregunta.tipo_respuesta}
                    onChange={(e) => setFormPregunta({ ...formPregunta, tipo_respuesta: e.target.value })}
                    className="w-auto"
                  >
                    <option value="escala_4">Excelente/Bueno/Regular/Deficiente</option>
                    <option value="escala_1_5">Escala 1 a 5</option>
                    <option value="si_no">Sí / No</option>
                    <option value="texto_libre">Texto libre</option>
                  </Select>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={formPregunta.requerida}
                      onChange={(e) => setFormPregunta({ ...formPregunta, requerida: e.target.checked })}
                    />
                    Obligatoria
                  </label>
                  <Boton onClick={() => guardarEdicionPregunta(p.id)}>Guardar</Boton>
                  <Boton variant="secundario" onClick={() => setEditandoPregunta(null)}>
                    Cancelar
                  </Boton>
                </div>
              </li>
            ) : (
              <li key={p.id} className="neu-pressed flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div>
                  <div>{p.texto}</div>
                  <div className="text-xs text-slate-500">
                    {TIPO_RESPUESTA_LABEL[p.tipo_respuesta]}
                    {!p.requerida && ' · opcional'}
                  </div>
                </div>
                <div className="flex shrink-0 gap-3 text-xs">
                  <button onClick={() => iniciarEdicionPregunta(p)} className="text-[var(--azul-2)] hover:underline">
                    Editar
                  </button>
                  <button onClick={() => eliminarPregunta(p.id)} className="text-rose-600 hover:underline">
                    Quitar
                  </button>
                </div>
              </li>
            ),
          )}
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
