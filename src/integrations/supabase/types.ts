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
      controlled_substance_log: {
        Row: {
          action: string
          created_at: string
          expiry_date: string | null
          id: string
          location_id: string
          lot_number: string | null
          medication_id: string | null
          notes: string | null
          organization_id: string
          performed_by: string
          prescription_id: string | null
          product_id: string | null
          quantity_after: number
          quantity_before: number
          quantity_change: number
          witnessed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          location_id: string
          lot_number?: string | null
          medication_id?: string | null
          notes?: string | null
          organization_id: string
          performed_by: string
          prescription_id?: string | null
          product_id?: string | null
          quantity_after: number
          quantity_before: number
          quantity_change: number
          witnessed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          location_id?: string
          lot_number?: string | null
          medication_id?: string | null
          notes?: string | null
          organization_id?: string
          performed_by?: string
          prescription_id?: string | null
          product_id?: string | null
          quantity_after?: number
          quantity_before?: number
          quantity_change?: number
          witnessed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "controlled_substance_log_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controlled_substance_log_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controlled_substance_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          loyalty_points: number | null
          metadata: Json | null
          notes: string | null
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          loyalty_points?: number | null
          metadata?: Json | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          loyalty_points?: number | null
          metadata?: Json | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      drug_interactions: {
        Row: {
          created_at: string
          description: string
          id: string
          medication_1_id: string | null
          medication_2_id: string | null
          recommendation: string | null
          severity: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          medication_1_id?: string | null
          medication_2_id?: string | null
          recommendation?: string | null
          severity: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          medication_1_id?: string | null
          medication_2_id?: string | null
          recommendation?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "drug_interactions_medication_1_id_fkey"
            columns: ["medication_1_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drug_interactions_medication_2_id_fkey"
            columns: ["medication_2_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_rooms: {
        Row: {
          amenities: string[] | null
          capacity: number
          created_at: string
          floor: number | null
          housekeeping_status: string
          id: string
          location_id: string
          notes: string | null
          price_per_night: number
          room_number: string
          room_type: string
          status: string
          updated_at: string
        }
        Insert: {
          amenities?: string[] | null
          capacity?: number
          created_at?: string
          floor?: number | null
          housekeeping_status?: string
          id?: string
          location_id: string
          notes?: string | null
          price_per_night?: number
          room_number: string
          room_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amenities?: string[] | null
          capacity?: number
          created_at?: string
          floor?: number | null
          housekeeping_status?: string
          id?: string
          location_id?: string
          notes?: string | null
          price_per_night?: number
          room_number?: string
          room_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_rooms_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      housekeeping_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          id: string
          location_id: string
          notes: string | null
          priority: string
          room_id: string | null
          scheduled_date: string
          scheduled_time: string | null
          status: string
          task_type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          location_id: string
          notes?: string | null
          priority?: string
          room_id?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string
          task_type?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          location_id?: string
          notes?: string | null
          priority?: string
          room_id?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "housekeeping_tasks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hotel_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_claims: {
        Row: {
          amount_approved: number | null
          amount_claimed: number
          claim_number: string | null
          copay_amount: number | null
          created_at: string
          denial_reason: string | null
          id: string
          insurance_provider: string
          organization_id: string
          patient_id: string | null
          policy_number: string | null
          prescription_id: string
          processed_at: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          amount_approved?: number | null
          amount_claimed?: number
          claim_number?: string | null
          copay_amount?: number | null
          created_at?: string
          denial_reason?: string | null
          id?: string
          insurance_provider: string
          organization_id: string
          patient_id?: string | null
          policy_number?: string | null
          prescription_id: string
          processed_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          amount_approved?: number | null
          amount_claimed?: number
          claim_number?: string | null
          copay_amount?: number | null
          created_at?: string
          denial_reason?: string | null
          id?: string
          insurance_provider?: string
          organization_id?: string
          patient_id?: string | null
          policy_number?: string | null
          prescription_id?: string
          processed_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          phone: string | null
          settings: Json | null
          updated_at: string
          vertical: Database["public"]["Enums"]["business_vertical"]
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          phone?: string | null
          settings?: Json | null
          updated_at?: string
          vertical: Database["public"]["Enums"]["business_vertical"]
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
          settings?: Json | null
          updated_at?: string
          vertical?: Database["public"]["Enums"]["business_vertical"]
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          brand_names: string[] | null
          contraindications: string[] | null
          controlled_substance_schedule: string | null
          created_at: string
          dosage_forms: string[] | null
          drug_class: string | null
          generic_name: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          requires_prescription: boolean | null
          route_of_administration: string | null
          side_effects: string[] | null
          storage_requirements: string | null
          strengths: string[] | null
          updated_at: string
          warnings: string[] | null
        }
        Insert: {
          brand_names?: string[] | null
          contraindications?: string[] | null
          controlled_substance_schedule?: string | null
          created_at?: string
          dosage_forms?: string[] | null
          drug_class?: string | null
          generic_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          requires_prescription?: boolean | null
          route_of_administration?: string | null
          side_effects?: string[] | null
          storage_requirements?: string | null
          strengths?: string[] | null
          updated_at?: string
          warnings?: string[] | null
        }
        Update: {
          brand_names?: string[] | null
          contraindications?: string[] | null
          controlled_substance_schedule?: string | null
          created_at?: string
          dosage_forms?: string[] | null
          drug_class?: string | null
          generic_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          requires_prescription?: boolean | null
          route_of_administration?: string | null
          side_effects?: string[] | null
          storage_requirements?: string | null
          strengths?: string[] | null
          updated_at?: string
          warnings?: string[] | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          notes: string | null
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount_amount: number | null
          id: string
          location_id: string
          metadata: Json | null
          notes: string | null
          order_number: string
          organization_id: string
          payment_method: string | null
          payment_status: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string
          vertical: Database["public"]["Enums"]["business_vertical"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          location_id: string
          metadata?: Json | null
          notes?: string | null
          order_number: string
          organization_id: string
          payment_method?: string | null
          payment_status?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          vertical: Database["public"]["Enums"]["business_vertical"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          location_id?: string
          metadata?: Json | null
          notes?: string | null
          order_number?: string
          organization_id?: string
          payment_method?: string | null
          payment_status?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          vertical?: Database["public"]["Enums"]["business_vertical"]
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          primary_vertical: Database["public"]["Enums"]["business_vertical"]
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          primary_vertical?: Database["public"]["Enums"]["business_vertical"]
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          primary_vertical?: Database["public"]["Enums"]["business_vertical"]
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_profiles: {
        Row: {
          allergies: string[] | null
          blood_type: string | null
          created_at: string
          customer_id: string | null
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          gender: string | null
          id: string
          insurance_expiry: string | null
          insurance_group_number: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          medical_conditions: string[] | null
          notes: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          allergies?: string[] | null
          blood_type?: string | null
          created_at?: string
          customer_id?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gender?: string | null
          id?: string
          insurance_expiry?: string | null
          insurance_group_number?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          medical_conditions?: string[] | null
          notes?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          allergies?: string[] | null
          blood_type?: string | null
          created_at?: string
          customer_id?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gender?: string | null
          id?: string
          insurance_expiry?: string | null
          insurance_group_number?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          medical_conditions?: string[] | null
          notes?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_profiles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          copay_amount: number | null
          created_at: string
          days_supply: number | null
          directions: string
          dosage: string
          id: string
          insurance_amount: number | null
          medication_id: string | null
          medication_name: string
          prescription_id: string
          product_id: string | null
          quantity: number
          unit_price: number | null
        }
        Insert: {
          copay_amount?: number | null
          created_at?: string
          days_supply?: number | null
          directions: string
          dosage: string
          id?: string
          insurance_amount?: number | null
          medication_id?: string | null
          medication_name: string
          prescription_id: string
          product_id?: string | null
          quantity: number
          unit_price?: number | null
        }
        Update: {
          copay_amount?: number | null
          created_at?: string
          days_supply?: number | null
          directions?: string
          dosage?: string
          id?: string
          insurance_amount?: number | null
          medication_id?: string | null
          medication_name?: string
          prescription_id?: string
          product_id?: string | null
          quantity?: number
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_reminders: {
        Row: {
          created_at: string
          id: string
          message: string | null
          notification_method: string | null
          patient_id: string | null
          prescription_id: string
          reminder_type: string
          scheduled_date: string
          scheduled_time: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          notification_method?: string | null
          patient_id?: string | null
          prescription_id: string
          reminder_type: string
          scheduled_date: string
          scheduled_time?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          notification_method?: string | null
          patient_id?: string | null
          prescription_id?: string
          reminder_type?: string
          scheduled_date?: string
          scheduled_time?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_reminders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_reminders_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string
          created_by: string | null
          date_filled: string | null
          date_written: string
          dispensed_by: string | null
          id: string
          is_controlled_substance: boolean | null
          location_id: string
          notes: string | null
          organization_id: string
          patient_id: string | null
          prescriber_license: string | null
          prescriber_name: string
          prescriber_phone: string | null
          prescription_number: string
          refills_authorized: number | null
          refills_remaining: number | null
          status: string
          updated_at: string
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_filled?: string | null
          date_written?: string
          dispensed_by?: string | null
          id?: string
          is_controlled_substance?: boolean | null
          location_id: string
          notes?: string | null
          organization_id: string
          patient_id?: string | null
          prescriber_license?: string | null
          prescriber_name: string
          prescriber_phone?: string | null
          prescription_number: string
          refills_authorized?: number | null
          refills_remaining?: number | null
          status?: string
          updated_at?: string
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_filled?: string | null
          date_written?: string
          dispensed_by?: string | null
          id?: string
          is_controlled_substance?: boolean | null
          location_id?: string
          notes?: string | null
          organization_id?: string
          patient_id?: string | null
          prescriber_license?: string | null
          prescriber_name?: string
          prescriber_phone?: string | null
          prescription_number?: string
          refills_authorized?: number | null
          refills_remaining?: number | null
          status?: string
          updated_at?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          location_id: string | null
          low_stock_threshold: number | null
          metadata: Json | null
          name: string
          organization_id: string
          sku: string | null
          stock_quantity: number | null
          subcategory: string | null
          tax_rate: number | null
          unit_price: number
          updated_at: string
          vertical: Database["public"]["Enums"]["business_vertical"]
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          location_id?: string | null
          low_stock_threshold?: number | null
          metadata?: Json | null
          name: string
          organization_id: string
          sku?: string | null
          stock_quantity?: number | null
          subcategory?: string | null
          tax_rate?: number | null
          unit_price?: number
          updated_at?: string
          vertical: Database["public"]["Enums"]["business_vertical"]
        }
        Update: {
          barcode?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          location_id?: string | null
          low_stock_threshold?: number | null
          metadata?: Json | null
          name?: string
          organization_id?: string
          sku?: string | null
          stock_quantity?: number | null
          subcategory?: string | null
          tax_rate?: number | null
          unit_price?: number
          updated_at?: string
          vertical?: Database["public"]["Enums"]["business_vertical"]
        }
        Relationships: [
          {
            foreignKeyName: "products_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          check_in: string
          check_out: string | null
          created_at: string
          customer_id: string | null
          guest_count: number
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          location_id: string
          notes: string | null
          organization_id: string
          reservation_type: string
          room_id: string | null
          status: string
          table_id: string | null
          updated_at: string
        }
        Insert: {
          check_in: string
          check_out?: string | null
          created_at?: string
          customer_id?: string | null
          guest_count?: number
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          location_id: string
          notes?: string | null
          organization_id: string
          reservation_type: string
          room_id?: string | null
          status?: string
          table_id?: string | null
          updated_at?: string
        }
        Update: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          customer_id?: string | null
          guest_count?: number
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          organization_id?: string
          reservation_type?: string
          room_id?: string | null
          status?: string
          table_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hotel_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          capacity: number
          created_at: string
          id: string
          location_id: string
          notes: string | null
          position_x: number
          position_y: number
          shape: string
          status: string
          table_number: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          location_id: string
          notes?: string | null
          position_x?: number
          position_y?: number
          shape?: string
          status?: string
          table_number: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          location_id?: string
          notes?: string | null
          position_x?: number
          position_y?: number
          shape?: string
          status?: string
          table_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_schedules: {
        Row: {
          created_at: string
          end_time: string
          id: string
          location_id: string
          notes: string | null
          shift_date: string
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          location_id: string
          notes?: string | null
          shift_date: string
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          location_id?: string
          notes?: string | null
          shift_date?: string
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_location_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _organization_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "org_admin"
        | "location_manager"
        | "department_lead"
        | "staff"
      business_vertical: "restaurant" | "hotel" | "pharmacy" | "retail"
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
      app_role: [
        "super_admin",
        "org_admin",
        "location_manager",
        "department_lead",
        "staff",
      ],
      business_vertical: ["restaurant", "hotel", "pharmacy", "retail"],
    },
  },
} as const
