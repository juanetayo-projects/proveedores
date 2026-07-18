export const ESCALA_4 = ['Excelente', 'Bueno', 'Regular', 'Deficiente'] as const

export const ESCALA_4_COLOR: Record<string, string> = {
  Excelente: '#16a34a',
  Bueno: '#0d2d6b',
  Regular: '#d97706',
  Deficiente: '#dc2626',
}

export const ESCALA_1_5 = ['1', '2', '3', '4', '5'] as const

export const SI_NO = ['SI', 'No'] as const

export const ROL_LABEL: Record<string, string> = {
  administrador: 'Administrador',
  coordinador_administrativo: 'Coordinador administrativo',
  encuestado: 'Encuestado',
  orientador: 'Orientador',
}

export const TIPO_RESPUESTA_LABEL: Record<string, string> = {
  escala_1_5: 'Escala 1 a 5',
  escala_4: 'Excelente / Bueno / Regular / Deficiente',
  si_no: 'Sí / No',
  texto_libre: 'Texto libre',
}
