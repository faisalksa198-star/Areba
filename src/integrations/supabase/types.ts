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
      abaya_designs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      addon_prices: {
        Row: {
          created_at: string
          id: string
          key: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cities: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      date_types: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      embroidery_directions: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      extra_hats: {
        Row: {
          created_at: string
          fringe_color: string | null
          hat_embroidery_id: string | null
          hat_extra_text: string | null
          id: string
          order_id: string
          serial_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          fringe_color?: string | null
          hat_embroidery_id?: string | null
          hat_extra_text?: string | null
          id?: string
          order_id: string
          serial_number: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          fringe_color?: string | null
          hat_embroidery_id?: string | null
          hat_extra_text?: string | null
          id?: string
          order_id?: string
          serial_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extra_hats_hat_embroidery_id_fkey"
            columns: ["hat_embroidery_id"]
            isOneToOne: false
            referencedRelation: "hat_embroideries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_hats_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      extra_scarves: {
        Row: {
          created_at: string
          id: string
          name: string
          order_id: string
          scarf_design_id: string | null
          serial_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          order_id: string
          scarf_design_id?: string | null
          serial_number: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_id?: string
          scarf_design_id?: string | null
          serial_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extra_scarves_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_scarves_scarf_design_id_fkey"
            columns: ["scarf_design_id"]
            isOneToOne: false
            referencedRelation: "order_scarf_designs"
            referencedColumns: ["id"]
          },
        ]
      }
      fonts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          preview_url: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          preview_url?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          preview_url?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      hat_embroideries: {
        Row: {
          created_at: string
          has_extra_text: boolean
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          has_extra_text?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          has_extra_text?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      hat_styles: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      order_scarf_designs: {
        Row: {
          created_at: string | null
          date_type_id: string | null
          embroidery_color: string | null
          embroidery_direction_id: string | null
          font_id: string | null
          id: string
          order_id: string
          scarf_method_id: string | null
          scarf_style_id: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          date_type_id?: string | null
          embroidery_color?: string | null
          embroidery_direction_id?: string | null
          font_id?: string | null
          id?: string
          order_id: string
          scarf_method_id?: string | null
          scarf_style_id?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          date_type_id?: string | null
          embroidery_color?: string | null
          embroidery_direction_id?: string | null
          font_id?: string | null
          id?: string
          order_id?: string
          scarf_method_id?: string | null
          scarf_style_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_scarf_designs_date_type_id_fkey"
            columns: ["date_type_id"]
            isOneToOne: false
            referencedRelation: "date_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_scarf_designs_embroidery_direction_id_fkey"
            columns: ["embroidery_direction_id"]
            isOneToOne: false
            referencedRelation: "embroidery_directions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_scarf_designs_font_id_fkey"
            columns: ["font_id"]
            isOneToOne: false
            referencedRelation: "fonts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_scarf_designs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_scarf_designs_scarf_method_id_fkey"
            columns: ["scarf_method_id"]
            isOneToOne: false
            referencedRelation: "scarf_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_scarf_designs_scarf_style_id_fkey"
            columns: ["scarf_style_id"]
            isOneToOne: false
            referencedRelation: "scarf_styles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          abaya_design_id: string | null
          abaya_length: string | null
          address_details: string | null
          back_embroidery_count: number | null
          back_embroidery_enabled: boolean | null
          back_embroidery_image_urls: string[] | null
          city_id: string | null
          color_image_url: string | null
          created_at: string
          custom_abaya_color: string | null
          custom_abaya_color_degree: string | null
          custom_hat_color: string | null
          custom_hat_color_degree: string | null
          custom_scarf_color: string | null
          custom_scarf_color_degree: string | null
          data_submitted: boolean | null
          district: string | null
          employee_id: string
          execution_duration: number | null
          extra_hat_count: number | null
          extra_scarf_count: number | null
          hat_embroidery_count: number | null
          hat_embroidery_enabled: boolean | null
          id: string
          kit_id: string | null
          leader_link: string | null
          leader_name: string | null
          leader_phone: string | null
          logo_embroidery_count: number | null
          logo_embroidery_enabled: boolean | null
          logo_embroidery_image_url: string | null
          national_address: string | null
          notes: string | null
          order_number: string
          order_type: string | null
          purple_package_count: number | null
          purple_package_enabled: boolean | null
          recipient_name: string | null
          recipient_phone: string | null
          registration_link: string | null
          school_name: string | null
          shipping_city_id: string | null
          sleeve_color: string | null
          sleeve_style_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          student_count: number | null
          tracking_link: string | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          abaya_design_id?: string | null
          abaya_length?: string | null
          address_details?: string | null
          back_embroidery_count?: number | null
          back_embroidery_enabled?: boolean | null
          back_embroidery_image_urls?: string[] | null
          city_id?: string | null
          color_image_url?: string | null
          created_at?: string
          custom_abaya_color?: string | null
          custom_abaya_color_degree?: string | null
          custom_hat_color?: string | null
          custom_hat_color_degree?: string | null
          custom_scarf_color?: string | null
          custom_scarf_color_degree?: string | null
          data_submitted?: boolean | null
          district?: string | null
          employee_id: string
          execution_duration?: number | null
          extra_hat_count?: number | null
          extra_scarf_count?: number | null
          hat_embroidery_count?: number | null
          hat_embroidery_enabled?: boolean | null
          id?: string
          kit_id?: string | null
          leader_link?: string | null
          leader_name?: string | null
          leader_phone?: string | null
          logo_embroidery_count?: number | null
          logo_embroidery_enabled?: boolean | null
          logo_embroidery_image_url?: string | null
          national_address?: string | null
          notes?: string | null
          order_number: string
          order_type?: string | null
          purple_package_count?: number | null
          purple_package_enabled?: boolean | null
          recipient_name?: string | null
          recipient_phone?: string | null
          registration_link?: string | null
          school_name?: string | null
          shipping_city_id?: string | null
          sleeve_color?: string | null
          sleeve_style_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          student_count?: number | null
          tracking_link?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          abaya_design_id?: string | null
          abaya_length?: string | null
          address_details?: string | null
          back_embroidery_count?: number | null
          back_embroidery_enabled?: boolean | null
          back_embroidery_image_urls?: string[] | null
          city_id?: string | null
          color_image_url?: string | null
          created_at?: string
          custom_abaya_color?: string | null
          custom_abaya_color_degree?: string | null
          custom_hat_color?: string | null
          custom_hat_color_degree?: string | null
          custom_scarf_color?: string | null
          custom_scarf_color_degree?: string | null
          data_submitted?: boolean | null
          district?: string | null
          employee_id?: string
          execution_duration?: number | null
          extra_hat_count?: number | null
          extra_scarf_count?: number | null
          hat_embroidery_count?: number | null
          hat_embroidery_enabled?: boolean | null
          id?: string
          kit_id?: string | null
          leader_link?: string | null
          leader_name?: string | null
          leader_phone?: string | null
          logo_embroidery_count?: number | null
          logo_embroidery_enabled?: boolean | null
          logo_embroidery_image_url?: string | null
          national_address?: string | null
          notes?: string | null
          order_number?: string
          order_type?: string | null
          purple_package_count?: number | null
          purple_package_enabled?: boolean | null
          recipient_name?: string | null
          recipient_phone?: string | null
          registration_link?: string | null
          school_name?: string | null
          shipping_city_id?: string | null
          sleeve_color?: string | null
          sleeve_style_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          student_count?: number | null
          tracking_link?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_abaya_design_id_fkey"
            columns: ["abaya_design_id"]
            isOneToOne: false
            referencedRelation: "abaya_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "ready_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_city_id_fkey"
            columns: ["shipping_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_sleeve_style_id_fkey"
            columns: ["sleeve_style_id"]
            isOneToOne: false
            referencedRelation: "sleeve_styles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          created_at: string
          id: string
          max_quantity: number
          min_quantity: number
          price_per_kit: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_quantity: number
          min_quantity: number
          price_per_kit: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_quantity?: number
          min_quantity?: number
          price_per_kit?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ready_kits: {
        Row: {
          abaya_color: string | null
          abaya_color_degree: string | null
          abaya_design_id: string | null
          created_at: string
          date_type_id: string | null
          default_scarf_design: string | null
          embroidery_color: string | null
          embroidery_direction_id: string | null
          font_id: string | null
          hat_color: string | null
          hat_color_degree: string | null
          hat_style_id: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number | null
          scarf_color: string | null
          scarf_color_degree: string | null
          scarf_method_id: string | null
          scarf_style_id: string | null
          sleeve_color: string | null
          sleeve_style_id: string | null
          updated_at: string
        }
        Insert: {
          abaya_color?: string | null
          abaya_color_degree?: string | null
          abaya_design_id?: string | null
          created_at?: string
          date_type_id?: string | null
          default_scarf_design?: string | null
          embroidery_color?: string | null
          embroidery_direction_id?: string | null
          font_id?: string | null
          hat_color?: string | null
          hat_color_degree?: string | null
          hat_style_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number | null
          scarf_color?: string | null
          scarf_color_degree?: string | null
          scarf_method_id?: string | null
          scarf_style_id?: string | null
          sleeve_color?: string | null
          sleeve_style_id?: string | null
          updated_at?: string
        }
        Update: {
          abaya_color?: string | null
          abaya_color_degree?: string | null
          abaya_design_id?: string | null
          created_at?: string
          date_type_id?: string | null
          default_scarf_design?: string | null
          embroidery_color?: string | null
          embroidery_direction_id?: string | null
          font_id?: string | null
          hat_color?: string | null
          hat_color_degree?: string | null
          hat_style_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number | null
          scarf_color?: string | null
          scarf_color_degree?: string | null
          scarf_method_id?: string | null
          scarf_style_id?: string | null
          sleeve_color?: string | null
          sleeve_style_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ready_kits_abaya_design_id_fkey"
            columns: ["abaya_design_id"]
            isOneToOne: false
            referencedRelation: "abaya_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ready_kits_date_type_id_fkey"
            columns: ["date_type_id"]
            isOneToOne: false
            referencedRelation: "date_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ready_kits_embroidery_direction_id_fkey"
            columns: ["embroidery_direction_id"]
            isOneToOne: false
            referencedRelation: "embroidery_directions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ready_kits_font_id_fkey"
            columns: ["font_id"]
            isOneToOne: false
            referencedRelation: "fonts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ready_kits_hat_style_id_fkey"
            columns: ["hat_style_id"]
            isOneToOne: false
            referencedRelation: "hat_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ready_kits_scarf_method_id_fkey"
            columns: ["scarf_method_id"]
            isOneToOne: false
            referencedRelation: "scarf_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ready_kits_scarf_style_id_fkey"
            columns: ["scarf_style_id"]
            isOneToOne: false
            referencedRelation: "scarf_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ready_kits_sleeve_style_id_fkey"
            columns: ["sleeve_style_id"]
            isOneToOne: false
            referencedRelation: "sleeve_styles"
            referencedColumns: ["id"]
          },
        ]
      }
      scarf_methods: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      scarf_styles: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      short_links: {
        Row: {
          code: string
          created_at: string
          id: string
          original_url: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          original_url: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          original_url?: string
        }
        Relationships: []
      }
      sleeve_styles: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          back_embroidery_text: string | null
          created_at: string
          extra_services: string[] | null
          has_logo_embroidery: boolean | null
          has_purple_package: boolean | null
          hat_choice: string | null
          hat_embroidery_id: string | null
          hat_extra_text: string | null
          id: string
          name: string
          order_id: string
          scarf_choice: string | null
          scarf_design_id: string | null
          serial_number: number
          size: string | null
          updated_at: string
        }
        Insert: {
          back_embroidery_text?: string | null
          created_at?: string
          extra_services?: string[] | null
          has_logo_embroidery?: boolean | null
          has_purple_package?: boolean | null
          hat_choice?: string | null
          hat_embroidery_id?: string | null
          hat_extra_text?: string | null
          id?: string
          name?: string
          order_id: string
          scarf_choice?: string | null
          scarf_design_id?: string | null
          serial_number: number
          size?: string | null
          updated_at?: string
        }
        Update: {
          back_embroidery_text?: string | null
          created_at?: string
          extra_services?: string[] | null
          has_logo_embroidery?: boolean | null
          has_purple_package?: boolean | null
          hat_choice?: string | null
          hat_embroidery_id?: string | null
          hat_extra_text?: string | null
          id?: string
          name?: string
          order_id?: string
          scarf_choice?: string | null
          scarf_design_id?: string | null
          serial_number?: number
          size?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_hat_embroidery_id_fkey"
            columns: ["hat_embroidery_id"]
            isOneToOne: false
            referencedRelation: "hat_embroideries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_scarf_design_id_fkey"
            columns: ["scarf_design_id"]
            isOneToOne: false
            referencedRelation: "order_scarf_designs"
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
    }
    Enums: {
      app_role: "owner" | "manager" | "customer_service"
      order_status:
        | "pending_data"
        | "under_review"
        | "in_progress"
        | "shipped"
        | "completed"
        | "cancelled"
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
      app_role: ["owner", "manager", "customer_service"],
      order_status: [
        "pending_data",
        "under_review",
        "in_progress",
        "shipped",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
