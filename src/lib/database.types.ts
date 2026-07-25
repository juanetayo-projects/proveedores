export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
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
          username: string
        }
        Insert: {
          activo?: boolean
          area_servicio_id?: number | null
          created_at?: string
          email: string
          id: string
          nombre: string
          role?: string
          username: string
        }
        Update: {
          activo?: boolean
          area_servicio_id?: number | null
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          role?: string
          username?: string
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
          import_key: string | null
          paciente_genero: string | null
          paciente_identificacion: string | null
          paciente_municipio: string | null
          paciente_nombre: string | null
          paciente_numero_habitacion: string | null
          paciente_tipo_afiliacion: string | null
          respondido_por: string | null
          respondido_por_nombre_historico: string | null
        }
        Insert: {
          area_servicio_id?: number | null
          created_at?: string
          encuesta_id: number
          fecha_respuesta?: string
          id?: number
          identificador_evaluado?: string | null
          import_key?: string | null
          paciente_genero?: string | null
          paciente_identificacion?: string | null
          paciente_municipio?: string | null
          paciente_nombre?: string | null
          paciente_numero_habitacion?: string | null
          paciente_tipo_afiliacion?: string | null
          respondido_por?: string | null
          respondido_por_nombre_historico?: string | null
        }
        Update: {
          area_servicio_id?: number | null
          created_at?: string
          encuesta_id?: number
          fecha_respuesta?: string
          id?: number
          identificador_evaluado?: string | null
          import_key?: string | null
          paciente_genero?: string | null
          paciente_identificacion?: string | null
          paciente_municipio?: string | null
          paciente_nombre?: string | null
          paciente_numero_habitacion?: string | null
          paciente_tipo_afiliacion?: string | null
          respondido_por?: string | null
          respondido_por_nombre_historico?: string | null
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
      email_por_usuario: { Args: { p_username: string }; Returns: string }
      encuesta_abierta: { Args: { p_encuesta_id: number }; Returns: boolean }
      esta_asignado: { Args: { p_encuesta_id: number }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_admin_o_coordinador: { Args: never; Returns: boolean }
      panel_conteo_diario: {
        Args: { p_desde?: string; p_encuesta_id: number; p_hasta?: string }
        Returns: {
          cantidad: number
          dia: string
        }[]
      }
      panel_distribucion: {
        Args: { p_desde?: string; p_encuesta_id: number; p_hasta?: string }
        Returns: {
          cantidad: number
          valor: string
        }[]
      }
      panel_por_categoria: {
        Args: { p_desde?: string; p_encuesta_id: number; p_hasta?: string }
        Returns: {
          cantidad: number
          categoria: string
          categoria_area_id: number
        }[]
      }
      panel_por_encuestador: {
        Args: { p_desde?: string; p_encuesta_id: number; p_hasta?: string }
        Returns: {
          cantidad: number
          nombre: string
          profile_id: string
        }[]
      }
      panel_promedio_pregunta: {
        Args: { p_desde?: string; p_encuesta_id: number; p_hasta?: string }
        Returns: {
          escala_max: number
          orden: number
          pregunta_id: number
          pregunta_texto: string
          promedio: number
        }[]
      }
      panel_tendencia_mensual: {
        Args: { p_desde?: string; p_encuesta_id: number; p_hasta?: string }
        Returns: {
          mes: string
          pct: number
          total: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
