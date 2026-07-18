import { supabase } from './supabase'

export async function listarEncuestasAsignadas(profileId: string) {
  const { data, error } = await supabase
    .from('asignaciones_encuestado')
    .select('encuesta_id, encuestas(*)')
    .eq('profile_id', profileId)
  if (error) throw error
  return (data ?? []).map((a) => a.encuestas).filter(Boolean)
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
