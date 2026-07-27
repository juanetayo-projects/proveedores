import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import {
  encuestasYaDiligenciadas,
  listarAreas,
  listarEncuestasParaDiligenciar,
  listarPreguntas,
  tienePeriodoUnico,
} from '../lib/data'
import { PageHeader, Card, Boton, Input, Select, Textarea, Modal, Badge } from '../components/ui'
import { ESCALA_4_CON_NA, ESCALA_4_COLOR, ESCALA_1_5, ESCALA_1_5_COLOR, ESCALA_1_5_LABEL, SI_NO } from '../lib/constantes'
import type { Database } from '../lib/database.types'

type Encuesta = Database['public']['Tables']['encuestas']['Row']
type Pregunta = Database['public']['Tables']['preguntas']['Row']
type Area = Database['public']['Tables']['areas_servicio']['Row']

export default function DiligenciarEncuesta() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const [encuestas, setEncuestas] = useState<Encuesta[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [seleccion, setSeleccion] = useState<Encuesta | null>(null)
  const [yaDiligenciadas, setYaDiligenciadas] = useState<Set<number>>(new Set())
  const [bloqueada, setBloqueada] = useState<Encuesta | null>(null)
  const [confirmarOtra, setConfirmarOtra] = useState<Encuesta | null>(null)
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [respuestas, setRespuestas] = useState<Record<number, string>>({})
  const [paciente, setPaciente] = useState({
    paciente_nombre: '',
    paciente_identificacion: '',
    paciente_municipio: '',
    paciente_genero: '',
    paciente_numero_habitacion: '',
    paciente_tipo_afiliacion: '',
  })
  const [areaServicioId, setAreaServicioId] = useState<number | ''>('')
  const [enviando, setEnviando] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!perfil) return
    listarEncuestasParaDiligenciar(perfil.id, perfil.role).then(async (es) => {
      const lista = es as Encuesta[]
      setEncuestas(lista)
      setYaDiligenciadas(await encuestasYaDiligenciadas(perfil.id, lista))
    })
    listarAreas().then(setAreas)
  }, [perfil])

  async function elegir(e: Encuesta) {
    // Segunda verificación contra la BD (el listado puede llevar rato abierto):
    // la regla también la impone un trigger, esto es solo para avisar antes.
    if (tienePeriodoUnico(e) && perfil) {
      const ya = await encuestasYaDiligenciadas(perfil.id, [e])
      if (ya.has(e.id)) {
        setYaDiligenciadas((prev) => new Set(prev).add(e.id))
        setBloqueada(e)
        return
      }
    }
    setSeleccion(e)
    setOk(null)
    setErrorMsg(null)
    setRespuestas({})
    setAreaServicioId(perfil?.area_servicio_id ?? '')
    setPaciente({
      paciente_nombre: '',
      paciente_identificacion: '',
      paciente_municipio: '',
      paciente_genero: '',
      paciente_numero_habitacion: '',
      paciente_tipo_afiliacion: '',
    })
    const p = await listarPreguntas(e.id)
    setPreguntas(p)
  }

  async function enviar() {
    if (!perfil || !seleccion) return
    setErrorMsg(null)

    const faltantes = preguntas.filter((p) => p.requerida && !respuestas[p.id]?.trim())
    if (faltantes.length > 0) {
      setErrorMsg('Responde todas las preguntas obligatorias.')
      return
    }
    if (seleccion.tipo === 'proveedor' && !areaServicioId) {
      setErrorMsg('Selecciona el área/servicio que realiza la evaluación.')
      return
    }
    if (seleccion.tipo === 'paciente' && !paciente.paciente_nombre.trim()) {
      setErrorMsg('El nombre del paciente es obligatorio.')
      return
    }

    setEnviando(true)
    try {
      const { data: resp, error } = await supabase
        .from('respuestas')
        .insert({
          encuesta_id: seleccion.id,
          respondido_por: perfil.id,
          area_servicio_id: seleccion.tipo === 'proveedor' ? Number(areaServicioId) : null,
          ...(seleccion.tipo === 'paciente' ? paciente : {}),
        })
        .select('id')
        .single()
      if (error) throw error

      const detalle = preguntas
        .filter((p) => respuestas[p.id]?.trim())
        .map((p) => ({ respuesta_id: resp.id, pregunta_id: p.id, valor: respuestas[p.id] }))
      if (detalle.length > 0) {
        const { error: errDetalle } = await supabase.from('respuestas_detalle').insert(detalle)
        if (errDetalle) throw errDetalle
      }

      if (tienePeriodoUnico(seleccion)) {
        setYaDiligenciadas((prev) => new Set(prev).add(seleccion.id))
      }
      setOk('Encuesta registrada correctamente.')
      setConfirmarOtra(seleccion)
      setSeleccion(null)
      setPreguntas([])
    } catch (e) {
      // El trigger `respuestas_una_por_periodo` rechaza el insert con 23505 si
      // el usuario ya respondió esta encuesta dentro del período vigente.
      if ((e as { code?: string })?.code === '23505') {
        setYaDiligenciadas((prev) => new Set(prev).add(seleccion.id))
        setBloqueada(seleccion)
        setSeleccion(null)
        setPreguntas([])
      } else {
        setErrorMsg(e instanceof Error ? e.message : 'No se pudo registrar la encuesta')
      }
    } finally {
      setEnviando(false)
    }
  }

  if (confirmarOtra) {
    // Las encuestas con período programado admiten una sola respuesta por
    // usuario, así que ahí no se ofrece "diligenciar otra".
    const unicaPorPeriodo = tienePeriodoUnico(confirmarOtra)
    return (
      <div>
        <PageHeader titulo="Diligenciar encuesta" />
        <Card className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="font-medium text-emerald-700">{ok}</p>
          <p className="text-sm text-slate-600">
            {unicaPorPeriodo
              ? `Con esto queda registrada tu evaluación de "${confirmarOtra.nombre}" para el período actual.`
              : `¿Deseas diligenciar otra respuesta de "${confirmarOtra.nombre}"?`}
          </p>
          <div className="flex gap-3">
            {!unicaPorPeriodo && (
              <Boton
                onClick={() => {
                  const e = confirmarOtra
                  setConfirmarOtra(null)
                  elegir(e)
                }}
              >
                Sí, diligenciar otra
              </Boton>
            )}
            <Boton
              variant="secundario"
              onClick={() => {
                setConfirmarOtra(null)
                navigate('/')
              }}
            >
              {unicaPorPeriodo ? 'Volver al dashboard' : 'No, volver al dashboard'}
            </Boton>
          </div>
        </Card>
      </div>
    )
  }

  if (!seleccion) {
    return (
      <div>
        <PageHeader titulo="Diligenciar encuesta" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {encuestas.map((e) => {
            const abierta = e.siempre_abierta
              ? true
              : !!(
                  e.fecha_apertura &&
                  e.fecha_cierre &&
                  new Date().toISOString().slice(0, 10) >= e.fecha_apertura &&
                  new Date().toISOString().slice(0, 10) <= e.fecha_cierre
                )
            const yaLaRespondio = yaDiligenciadas.has(e.id)
            return (
              <Card key={e.id}>
                <div className="mb-1 font-semibold text-[var(--azul)]">{e.nombre}</div>
                {e.proveedor && <div className="mb-2 text-xs text-slate-500">{e.proveedor}</div>}
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                  {abierta ? (
                    <span className="text-emerald-700">Abierta</span>
                  ) : (
                    <span className="text-rose-600">Cerrada</span>
                  )}
                  {yaLaRespondio && <Badge tono="ambar">Ya diligenciada en este período</Badge>}
                </div>
                <Boton
                  disabled={!abierta}
                  variant={yaLaRespondio ? 'secundario' : 'primario'}
                  onClick={() => elegir(e)}
                  className="w-full"
                >
                  Diligenciar
                </Boton>
              </Card>
            )
          })}
          {encuestas.length === 0 && (
            <p className="text-sm text-slate-500">No tienes encuestas asignadas.</p>
          )}
        </div>

        <Modal open={!!bloqueada} onClose={() => setBloqueada(null)} titulo="Encuesta ya diligenciada">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-600">
              Ya registraste una encuesta de <strong>{bloqueada?.proveedor ?? bloqueada?.nombre}</strong> en el
              período vigente
              {bloqueada?.fecha_apertura && bloqueada?.fecha_cierre
                ? ` (${bloqueada.fecha_apertura} al ${bloqueada.fecha_cierre})`
                : ''}
              .
            </p>
            <p className="text-sm text-slate-600">
              Solo se permite una encuesta por proveedor en cada período. Podrás diligenciarla de nuevo cuando se
              abra el siguiente período.
            </p>
            <div className="flex justify-end">
              <Boton onClick={() => setBloqueada(null)}>Entendido</Boton>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  return (
    <div>
      <PageHeader titulo={seleccion.nombre} acciones={<Boton variant="secundario" onClick={() => setSeleccion(null)}>Volver</Boton>} />
      <Card className="flex flex-col gap-4">
        {seleccion.tipo === 'paciente' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              placeholder="Nombre completo del paciente"
              value={paciente.paciente_nombre}
              onChange={(e) => setPaciente({ ...paciente, paciente_nombre: e.target.value })}
            />
            <Input
              placeholder="Número de identificación"
              value={paciente.paciente_identificacion}
              onChange={(e) => setPaciente({ ...paciente, paciente_identificacion: e.target.value })}
            />
            <Input
              placeholder="Municipio de residencia"
              value={paciente.paciente_municipio}
              onChange={(e) => setPaciente({ ...paciente, paciente_municipio: e.target.value })}
            />
            <Select
              value={paciente.paciente_genero}
              onChange={(e) => setPaciente({ ...paciente, paciente_genero: e.target.value })}
            >
              <option value="">Género</option>
              <option value="Femenino">Femenino</option>
              <option value="Masculino">Masculino</option>
            </Select>
            <Input
              placeholder="Número de habitación"
              value={paciente.paciente_numero_habitacion}
              onChange={(e) => setPaciente({ ...paciente, paciente_numero_habitacion: e.target.value })}
            />
            <Select
              value={paciente.paciente_tipo_afiliacion}
              onChange={(e) => setPaciente({ ...paciente, paciente_tipo_afiliacion: e.target.value })}
            >
              <option value="">Tipo de afiliación</option>
              <option value="Contributivo">Contributivo</option>
              <option value="Subsidiado">Subsidiado</option>
              <option value="Particular">Particular</option>
              <option value="Especial">Especial</option>
              <option value="Otros">Otros</option>
            </Select>
          </div>
        )}

        {seleccion.tipo === 'proveedor' && (
          <Select value={areaServicioId} onChange={(e) => setAreaServicioId(Number(e.target.value))}>
            <option value="">Área / servicio que realiza la evaluación</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </Select>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {preguntas.map((p, idx) => (
          <div
            key={p.id}
            className={`neu-flat p-4 ${p.tipo_respuesta === 'texto_libre' ? 'lg:col-span-2' : ''}`}
          >
            <label className="mb-3 flex items-start gap-3 text-sm font-medium text-slate-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--azul)] text-xs font-semibold text-white">
                {idx + 1}
              </span>
              <span>
                {p.texto}
                {p.requerida && <span className="text-rose-500"> *</span>}
              </span>
            </label>
            {p.tipo_respuesta === 'escala_4' && (
              <div className="flex flex-wrap gap-2 pl-9">
                {ESCALA_4_CON_NA.map((op) => {
                  const seleccionado = respuestas[p.id] === op
                  return (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setRespuestas({ ...respuestas, [p.id]: op })}
                      style={seleccionado ? { background: ESCALA_4_COLOR[op], borderColor: ESCALA_4_COLOR[op] } : undefined}
                      className={
                        seleccionado
                          ? 'rounded-xl px-3 py-1.5 text-sm font-medium text-white shadow-md transition-transform scale-105'
                          : 'neu-btn px-3 py-1.5 text-sm text-[var(--azul)] transition-transform hover:scale-105'
                      }
                    >
                      {op}
                    </button>
                  )
                })}
              </div>
            )}
            {p.tipo_respuesta === 'escala_1_5' && (
              <div className="pl-9">
                <div className="grid max-w-xs grid-cols-5 gap-2">
                  {ESCALA_1_5.map((op) => {
                    const seleccionado = respuestas[p.id] === op
                    return (
                      <button
                        key={op}
                        type="button"
                        onClick={() => setRespuestas({ ...respuestas, [p.id]: op })}
                        style={seleccionado ? { background: ESCALA_1_5_COLOR[op] } : undefined}
                        className={
                          seleccionado
                            ? 'aspect-square rounded-xl text-base font-semibold text-white shadow-md transition-transform scale-105'
                            : 'neu-btn aspect-square rounded-xl text-base text-slate-400 transition-transform hover:scale-105'
                        }
                      >
                        {op}
                      </button>
                    )
                  })}
                </div>
                {respuestas[p.id] && (
                  <span
                    className="mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium text-white"
                    style={{ background: ESCALA_1_5_COLOR[respuestas[p.id]] }}
                  >
                    {ESCALA_1_5_LABEL[respuestas[p.id]]}
                  </span>
                )}
              </div>
            )}
            {p.tipo_respuesta === 'si_no' && (
              <div className="flex gap-3 pl-9">
                {SI_NO.map((op) => {
                  const seleccionado = respuestas[p.id] === op
                  const esSi = op === 'SI'
                  return (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setRespuestas({ ...respuestas, [p.id]: op })}
                      style={seleccionado ? { background: esSi ? '#22c55e' : '#ef4444' } : undefined}
                      className={
                        seleccionado
                          ? 'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-md transition-transform scale-105'
                          : 'neu-btn flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-[var(--azul)] transition-transform hover:scale-105'
                      }
                    >
                      <span>{esSi ? '👍' : '👎'}</span>
                      {op}
                    </button>
                  )
                })}
              </div>
            )}
            {p.tipo_respuesta === 'texto_libre' && (
              <div className="pl-9">
                <Textarea
                  rows={3}
                  value={respuestas[p.id] ?? ''}
                  onChange={(e) => setRespuestas({ ...respuestas, [p.id]: e.target.value })}
                />
              </div>
            )}
          </div>
        ))}
        </div>

        {errorMsg && <p className="text-sm text-rose-600">{errorMsg}</p>}
        <Boton onClick={enviar} disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar encuesta'}
        </Boton>
      </Card>
    </div>
  )
}
