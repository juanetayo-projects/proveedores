export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      areas_servicio: {
        Row: {
          activo: boolean
          id: number
          nombre: string
        }
        Insert: {
          activo?: boolean
          id?: number
          nombre: string
        }
        Update: {
          activo?: boolean
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      asignaciones_encuestado: {
        Row: {
          created_at: string
          encuesta_id: number
          id: number
          profile_id: string
        }
        Insert: {
          created_at?: string
          encuesta_id: number
          id?: number
          profile_id: string
        }
        Update: {
          created_at?: string
          encuesta_id?: number
          id?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_encuestado_encuesta_id_fkey"
            columns: ["encuesta_id"]
            isOneToOne: false
            referencedRelation: "encuestas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_encuestado_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      encuestas: {
        Row: {
          activa: boolean
          codigo: string
          created_at: string
          fecha_apertura: string | null
          fecha_cierre: string | null
          id: number
          nombre: string
          proveedor: string | null
          siempre_abierta: boolean
          tipo: string
        }
        Insert: {
          activa?: boolean
          codigo: string
          created_at?: string
          fecha_apertura?: string | null
          fecha_cierre?: string | null
          id?: number
          nombre: string
          proveedor?: string | null
          siempre_abierta?: boolean
          tipo: string
        }
        Update: {
          activa?: boolean
          codigo?: string
          created_at?: string
          fecha_apertura?: string | null
          fecha_cierre?: string | null
          id?: number
          nombre?: string
          proveedor?: string | null
          siempre_abierta?: boolean
          tipo?: string
        }
        Relationships: []
      }
      preguntas: {
        Row: {
          activa: boolean
          encuesta_id: number
          id: number
          orden: number
          requerida: boolean
          texto: string
          tipo_respuesta: string
        }
        Insert: {
          activa?: boolean
          encuesta_id: number
          id?: number
          orden?: number
          requerida?: boolean
          texto: string
          tipo_respuesta: string
        }
        Update: {
          activa?: boolean
          encuesta_id?: number
          id?: number
          orden?: number
          requerida?: boolean
          texto?: string
          tipo_respuesta?: string
        }
        Relationships: [
          {
            foreignKeyName: "preguntas_encuesta_id_fkey"
            columns: ["encuesta_id"]
            isOneToOne: false
            referencedRelation: "encuestas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activo: boolean
          area_servicio_id: number | null
          created_at: string
          email: string
          id: string
          nombre: string
          role: string
        }
        Insert: {
          activo?: boolean
          area_servicio_id?: number | null
          created_at?: string
          email: string
          id: string
          nombre: string
          role?: string
        }
        Update: {
          activo?: boolean
          area_servicio_id?: number | null
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_area_servicio_fkey"
            columns: ["area_servicio_id"]
            isOneToOne: false
            referencedRelation: "areas_servicio"
            referencedColumns: ["id"]
          },
        ]
      }
      respuestas: {
        Row: {
          area_servicio_id: number | null
          created_at: string
          encuesta_id: number
          fecha_respuesta: string
          id: number
          identificador_evaluado: string | null
          paciente_genero: string | null
          paciente_identificacion: string | null
          paciente_municipio: string | null
          paciente_nombre: string | null
          paciente_numero_habitacion: string | null
          paciente_tipo_afiliacion: string | null
          respondido_por: string | null
        }
        Insert: {
          area_servicio_id?: number | null
          created_at?: string
          encuesta_id: number
          fecha_respuesta?: string
          id?: number
          identificador_evaluado?: string | null
          paciente_genero?: string | null
          paciente_identificacion?: string | null
          paciente_municipio?: string | null
          paciente_nombre?: string | null
          paciente_numero_habitacion?: string | null
          paciente_tipo_afiliacion?: string | null
          respondido_por?: string | null
        }
        Update: {
          area_servicio_id?: number | null
          created_at?: string
          encuesta_id?: number
          fecha_respuesta?: string
          id?: number
          identificador_evaluado?: string | null
          paciente_genero?: string | null
          paciente_identificacion?: string | null
          paciente_municipio?: string | null
          paciente_nombre?: string | null
          paciente_numero_habitacion?: string | null
          paciente_tipo_afiliacion?: string | null
          respondido_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "respuestas_area_servicio_id_fkey"
            columns: ["area_servicio_id"]
            isOneToOne: false
            referencedRelation: "areas_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respuestas_encuesta_id_fkey"
            columns: ["encuesta_id"]
            isOneToOne: false
            referencedRelation: "encuestas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respuestas_respondido_por_fkey"
            columns: ["respondido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      respuestas_detalle: {
        Row: {
          id: number
          pregunta_id: number
          respuesta_id: number
          valor: string
        }
        Insert: {
          id?: number
          pregunta_id: number
          respuesta_id: number
          valor: string
        }
        Update: {
          id?: number
          pregunta_id?: number
          respuesta_id?: number
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "respuestas_detalle_pregunta_id_fkey"
            columns: ["pregunta_id"]
            isOneToOne: false
            referencedRelation: "preguntas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respuestas_detalle_respuesta_id_fkey"
            columns: ["respuesta_id"]
            isOneToOne: false
            referencedRelation: "respuestas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      encuesta_abierta: { Args: { p_encuesta_id: number }; Returns: boolean }
      esta_asignado: { Args: { p_encuesta_id: number }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_admin_o_coordinador: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
