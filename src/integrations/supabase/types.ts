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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_keys: {
        Row: {
          created_at: string
          id: string
          key: string
          unlimited: boolean
          uses_remaining: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          unlimited?: boolean
          uses_remaining?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          unlimited?: boolean
          uses_remaining?: number | null
        }
        Relationships: []
      }
      audio_zones: {
        Row: {
          audio_text: string | null
          audio_url: string | null
          auto_play: boolean | null
          circuit_id: string
          created_at: string
          id: string
          lat: number
          lng: number
          radius_meters: number | null
          sort_order: number | null
        }
        Insert: {
          audio_text?: string | null
          audio_url?: string | null
          auto_play?: boolean | null
          circuit_id: string
          created_at?: string
          id?: string
          lat: number
          lng: number
          radius_meters?: number | null
          sort_order?: number | null
        }
        Update: {
          audio_text?: string | null
          audio_url?: string | null
          auto_play?: boolean | null
          circuit_id?: string
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          radius_meters?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audio_zones_circuit_id_fkey"
            columns: ["circuit_id"]
            isOneToOne: false
            referencedRelation: "circuits"
            referencedColumns: ["id"]
          },
        ]
      }
      circuit_slots: {
        Row: {
          circuit_id: string
          created_at: string
          display_name: string | null
          id: string
          message: string | null
          open_to_others: boolean
          party_size: number
          slot_date: string
          slot_time: string
          user_id: string
        }
        Insert: {
          circuit_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          message?: string | null
          open_to_others?: boolean
          party_size?: number
          slot_date: string
          slot_time: string
          user_id: string
        }
        Update: {
          circuit_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          message?: string | null
          open_to_others?: boolean
          party_size?: number
          slot_date?: string
          slot_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circuit_slots_circuit_id_fkey"
            columns: ["circuit_id"]
            isOneToOne: false
            referencedRelation: "circuits"
            referencedColumns: ["id"]
          },
        ]
      }
      circuit_stops: {
        Row: {
          circuit_id: string
          created_at: string
          description: string | null
          duration: string | null
          id: string
          lat: number
          lng: number
          photo_url: string | null
          sort_order: number | null
          stop_type: string | null
          title: string
        }
        Insert: {
          circuit_id: string
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          lat: number
          lng: number
          photo_url?: string | null
          sort_order?: number | null
          stop_type?: string | null
          title: string
        }
        Update: {
          circuit_id?: string
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          lat?: number
          lng?: number
          photo_url?: string | null
          sort_order?: number | null
          stop_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "circuit_stops_circuit_id_fkey"
            columns: ["circuit_id"]
            isOneToOne: false
            referencedRelation: "circuits"
            referencedColumns: ["id"]
          },
        ]
      }
      circuits: {
        Row: {
          circuit_type: string
          created_at: string
          creator_id: string
          description: string | null
          difficulty: string | null
          distance: string | null
          duration: string | null
          id: string
          image_url: string | null
          price: number
          published: boolean | null
          rating: number | null
          region: string | null
          review_count: number | null
          route: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          circuit_type?: string
          created_at?: string
          creator_id: string
          description?: string | null
          difficulty?: string | null
          distance?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          price?: number
          published?: boolean | null
          rating?: number | null
          region?: string | null
          review_count?: number | null
          route?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          circuit_type?: string
          created_at?: string
          creator_id?: string
          description?: string | null
          difficulty?: string | null
          distance?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          price?: number
          published?: boolean | null
          rating?: number | null
          region?: string | null
          review_count?: number | null
          route?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          amount: number
          created_at: string
          creator_id: string
          id: string
          promo_code_id: string
          purchase_id: string
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          creator_id: string
          id?: string
          promo_code_id: string
          purchase_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          creator_id?: string
          id?: string
          promo_code_id?: string
          purchase_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      music_segments: {
        Row: {
          artist_name: string | null
          artwork_url: string | null
          circuit_id: string
          created_at: string
          end_lat: number
          end_lng: number
          id: string
          preview_url: string | null
          sort_order: number | null
          start_lat: number
          start_lng: number
          start_time: number
          track_id: string
          track_name: string
        }
        Insert: {
          artist_name?: string | null
          artwork_url?: string | null
          circuit_id: string
          created_at?: string
          end_lat: number
          end_lng: number
          id?: string
          preview_url?: string | null
          sort_order?: number | null
          start_lat: number
          start_lng: number
          start_time?: number
          track_id: string
          track_name: string
        }
        Update: {
          artist_name?: string | null
          artwork_url?: string | null
          circuit_id?: string
          created_at?: string
          end_lat?: number
          end_lng?: number
          id?: string
          preview_url?: string | null
          sort_order?: number | null
          start_lat?: number
          start_lng?: number
          start_time?: number
          track_id?: string
          track_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_segments_circuit_id_fkey"
            columns: ["circuit_id"]
            isOneToOne: false
            referencedRelation: "circuits"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_type: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          business_type?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          business_type?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          commission_percent: number
          created_at: string
          creator_id: string
          discount_percent: number
          id: string
        }
        Insert: {
          code: string
          commission_percent?: number
          created_at?: string
          creator_id: string
          discount_percent?: number
          id?: string
        }
        Update: {
          code?: string
          commission_percent?: number
          created_at?: string
          creator_id?: string
          discount_percent?: number
          id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          circuit_id: string
          id: string
          promo_code_id: string | null
          purchased_at: string
          user_id: string
        }
        Insert: {
          amount: number
          circuit_id: string
          id?: string
          promo_code_id?: string | null
          purchased_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          circuit_id?: string
          id?: string
          promo_code_id?: string | null
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_circuit_id_fkey"
            columns: ["circuit_id"]
            isOneToOne: false
            referencedRelation: "circuits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          circuit_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          circuit_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          circuit_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_circuit_id_fkey"
            columns: ["circuit_id"]
            isOneToOne: false
            referencedRelation: "circuits"
            referencedColumns: ["id"]
          },
        ]
      }
      slot_messages: {
        Row: {
          circuit_id: string
          created_at: string
          display_name: string | null
          id: string
          message: string
          slot_date: string
          slot_time: string
          user_id: string
        }
        Insert: {
          circuit_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          message: string
          slot_date: string
          slot_time: string
          user_id: string
        }
        Update: {
          circuit_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          message?: string
          slot_date?: string
          slot_time?: string
          user_id?: string
        }
        Relationships: []
      }
      sound_segments: {
        Row: {
          circuit_id: string
          created_at: string
          end_lat: number
          end_lng: number
          id: string
          sort_order: number | null
          sound_type: string
          start_lat: number
          start_lng: number
          volume: number
        }
        Insert: {
          circuit_id: string
          created_at?: string
          end_lat: number
          end_lng: number
          id?: string
          sort_order?: number | null
          sound_type?: string
          start_lat: number
          start_lng: number
          volume?: number
        }
        Update: {
          circuit_id?: string
          created_at?: string
          end_lat?: number
          end_lng?: number
          id?: string
          sort_order?: number | null
          sound_type?: string
          start_lat?: number
          start_lng?: number
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "sound_segments_circuit_id_fkey"
            columns: ["circuit_id"]
            isOneToOne: false
            referencedRelation: "circuits"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      register_professional: {
        Args: { _business_type: string; _promo_code: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "creator" | "user"
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
    Enums: {
      app_role: ["admin", "creator", "user"],
    },
  },
} as const
