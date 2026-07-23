import { supabase } from './supabase'

/** `supabase.functions.invoke` no expone el cuerpo JSON de una respuesta no-2xx en
 * `error.message` (queda genérico: "Edge Function returned a non-2xx status code").
 * El body real ({ error: "..." }) que devuelve `admin-usuarios` viaja en
 * `error.context` (el Response crudo); hay que leerlo aparte. */
export async function mensajeErrorFuncion(error: unknown, data: unknown): Promise<string> {
  const dataError = (data as { error?: string } | null)?.error
  if (dataError) return dataError
  const contexto = (error as { context?: Response } | null)?.context
  if (contexto && typeof contexto.json === 'function') {
    try {
      const body = await contexto.clone().json()
      if (body?.error) return body.error as string
    } catch {
      // el body no era JSON; se ignora y se usa el mensaje genérico
    }
  }
  return error instanceof Error ? error.message : 'Error desconocido'
}

/** El proyecto de Supabase limita cada respuesta de la API a 1000 filas sin importar
 * el .limit() pedido (tope de PostgREST a nivel de proyecto). Para consultas que puedan
 * superar eso, paginar con .range() hasta traer todas las filas. */
export async function paginarTodo<T>(
  construirQuery: (offset: number, fin: number) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const TAMANO_PAGINA = 1000
  const filas: T[] = []
  let offset = 0
  while (true) {
    const { data } = await construirQuery(offset, offset + TAMANO_PAGINA - 1)
    filas.push(...(data ?? []))
    if (!data || data.length < TAMANO_PAGINA) break
    offset += TAMANO_PAGINA
  }
  return filas
}

export async function listarEncuestasAsignadas(profileId: string) {
  const { data, error } = await supabase
    .from('asignaciones_encuestado')
    .select('encuesta_id, encuestas(*)')
    .eq('profile_id', profileId)
  if (error) throw error
  return (data ?? []).map((a) => a.encuestas).filter(Boolean)
}

/** Administrador/coordinador pueden diligenciar cualquier encuesta activa,
 * sin necesidad de una fila de asignación (ya tienen acceso total). */
export async function listarEncuestasParaDiligenciar(profileId: string, rol: string) {
  if (rol === 'administrador' || rol === 'coordinador_administrativo') {
    const { data, error } = await supabase.from('encuestas').select('*').eq('activa', true).order('id')
    if (error) throw error
    return data ?? []
  }
  return listarEncuestasAsignadas(profileId)
}

export async function listarPreguntas(encuestaId: number) {
  const { data, error } = await supabase
    .from('preguntas')
    .select('*')
    .eq('encuesta_id', encuestaId)
    .eq('activa', true)
    .order('orden')
  if (error) throw error
  return data ?? []
}

export async function listarAreas() {
  const { data, error } = await supabase
    .from('areas_servicio')
    .select('*')
    .eq('activo', true)
    .order('nombre')
  if (error) throw error
  return data ?? []
}

export async function listarEncuestas() {
  const { data, error } = await supabase.from('encuestas').select('*').order('id')
  if (error) throw error
  return data ?? []
}

export async function listarDetalleRespuesta(respuestaId: number) {
  const { data, error } = await supabase
    .from('respuestas_detalle')
    .select('valor, preguntas(texto, orden, tipo_respuesta)')
    .eq('respuesta_id', respuestaId)
    .order('pregunta_id')
  if (error) throw error
  return (data ?? [])
    .map((d) => {
      const p = d.preguntas as unknown as { texto: string; orden: number; tipo_respuesta: string } | null
      return { pregunta: p?.texto ?? '', orden: p?.orden ?? 0, tipoRespuesta: p?.tipo_respuesta, valor: d.valor }
    })
    .sort((a, b) => a.orden - b.orden)
    .map(({ pregunta, valor, tipoRespuesta }) => ({ pregunta, valor, tipoRespuesta }))
}

export function formatearFechaHora(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export async function estaEncuestaAbierta(encuesta: {
  siempre_abierta: boolean
  fecha_apertura: string | null
  fecha_cierre: string | null
}) {
  if (encuesta.siempre_abierta) return true
  if (!encuesta.fecha_apertura || !encuesta.fecha_cierre) return false
  const hoy = new Date().toISOString().slice(0, 10)
  return hoy >= encuesta.fecha_apertura && hoy <= encuesta.fecha_cierre
}
