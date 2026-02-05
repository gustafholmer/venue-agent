export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'customer' | 'venue_owner' | 'admin'
export type BookingStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed' | 'paid_out'
export type VenueStatus = 'draft' | 'published' | 'paused'
export type NotificationType =
  | 'booking_request' | 'booking_accepted' | 'booking_declined' | 'booking_cancelled'
  | 'new_message' | 'new_match' | 'payment_completed' | 'payout_sent' | 'review_request'
export type EntityType = 'booking' | 'venue' | 'message' | 'search'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          user_type: UserRole
          company_name: string | null
          org_number: string | null
          stripe_account_id: string | null
          stripe_account_status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          user_type?: UserRole
          company_name?: string | null
          org_number?: string | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          user_type?: UserRole
          company_name?: string | null
          org_number?: string | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      venues: {
        Row: {
          id: string
          owner_id: string
          name: string
          slug: string | null
          description: string | null
          address: string
          city: string
          area: string | null
          latitude: number | null
          longitude: number | null
          capacity_standing: number | null
          capacity_seated: number | null
          capacity_conference: number | null
          min_guests: number
          price_per_hour: number | null
          price_half_day: number | null
          price_full_day: number | null
          price_evening: number | null
          price_notes: string | null
          amenities: string[]
          venue_types: string[]
          vibes: string[]
          website: string | null
          contact_email: string | null
          contact_phone: string | null
          status: VenueStatus
          description_embedding: number[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          slug?: string | null
          description?: string | null
          address: string
          city?: string
          area?: string | null
          latitude?: number | null
          longitude?: number | null
          capacity_standing?: number | null
          capacity_seated?: number | null
          capacity_conference?: number | null
          min_guests?: number
          price_per_hour?: number | null
          price_half_day?: number | null
          price_full_day?: number | null
          price_evening?: number | null
          price_notes?: string | null
          amenities?: string[]
          venue_types?: string[]
          vibes?: string[]
          website?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          status?: VenueStatus
          description_embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          slug?: string | null
          description?: string | null
          address?: string
          city?: string
          area?: string | null
          latitude?: number | null
          longitude?: number | null
          capacity_standing?: number | null
          capacity_seated?: number | null
          capacity_conference?: number | null
          min_guests?: number
          price_per_hour?: number | null
          price_half_day?: number | null
          price_full_day?: number | null
          price_evening?: number | null
          price_notes?: string | null
          amenities?: string[]
          venue_types?: string[]
          vibes?: string[]
          website?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          status?: VenueStatus
          description_embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
      }
      venue_photos: {
        Row: {
          id: string
          venue_id: string
          url: string
          alt_text: string | null
          sort_order: number
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          venue_id: string
          url: string
          alt_text?: string | null
          sort_order?: number
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          venue_id?: string
          url?: string
          alt_text?: string | null
          sort_order?: number
          is_primary?: boolean
          created_at?: string
        }
      }
      venue_blocked_dates: {
        Row: {
          id: string
          venue_id: string
          blocked_date: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          venue_id: string
          blocked_date: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          venue_id?: string
          blocked_date?: string
          reason?: string | null
          created_at?: string
        }
      }
      searches: {
        Row: {
          id: string
          customer_id: string | null
          event_type: string | null
          guest_count: number | null
          areas: string[]
          budget_min: number | null
          budget_max: number | null
          preferred_date: string | null
          preferred_time: string | null
          requirements: string[]
          vibe_description: string | null
          raw_input: string | null
          contact_email: string | null
          contact_name: string | null
          notify_new_matches: boolean
          notify_until: string | null
          last_notified_at: string | null
          search_embedding: number[] | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          event_type?: string | null
          guest_count?: number | null
          areas?: string[]
          budget_min?: number | null
          budget_max?: number | null
          preferred_date?: string | null
          preferred_time?: string | null
          requirements?: string[]
          vibe_description?: string | null
          raw_input?: string | null
          contact_email?: string | null
          contact_name?: string | null
          notify_new_matches?: boolean
          notify_until?: string | null
          last_notified_at?: string | null
          search_embedding?: number[] | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          event_type?: string | null
          guest_count?: number | null
          areas?: string[]
          budget_min?: number | null
          budget_max?: number | null
          preferred_date?: string | null
          preferred_time?: string | null
          requirements?: string[]
          vibe_description?: string | null
          raw_input?: string | null
          contact_email?: string | null
          contact_name?: string | null
          notify_new_matches?: boolean
          notify_until?: string | null
          last_notified_at?: string | null
          search_embedding?: number[] | null
          created_at?: string
        }
      }
      booking_requests: {
        Row: {
          id: string
          venue_id: string
          customer_id: string | null
          search_id: string | null
          event_type: string | null
          event_description: string | null
          guest_count: number | null
          event_date: string
          start_time: string | null
          end_time: string | null
          customer_name: string
          customer_email: string
          customer_phone: string | null
          company_name: string | null
          status: BookingStatus
          base_price: number
          platform_fee: number
          total_price: number
          venue_payout: number
          stripe_payment_intent_id: string | null
          stripe_payment_status: string | null
          verification_token: string | null
          created_at: string
          updated_at: string
          responded_at: string | null
          captured_at: string | null
          refunded_at: string | null
          decline_reason: string | null
          refund_amount: number | null
        }
        Insert: {
          id?: string
          venue_id: string
          customer_id?: string | null
          search_id?: string | null
          event_type?: string | null
          event_description?: string | null
          guest_count?: number | null
          event_date: string
          start_time?: string | null
          end_time?: string | null
          customer_name: string
          customer_email: string
          customer_phone?: string | null
          company_name?: string | null
          status?: BookingStatus
          base_price: number
          platform_fee: number
          total_price: number
          venue_payout: number
          stripe_payment_intent_id?: string | null
          stripe_payment_status?: string | null
          verification_token?: string | null
          created_at?: string
          updated_at?: string
          responded_at?: string | null
          captured_at?: string | null
          refunded_at?: string | null
          decline_reason?: string | null
          refund_amount?: number | null
        }
        Update: {
          id?: string
          venue_id?: string
          customer_id?: string | null
          search_id?: string | null
          event_type?: string | null
          event_description?: string | null
          guest_count?: number | null
          event_date?: string
          start_time?: string | null
          end_time?: string | null
          customer_name?: string
          customer_email?: string
          customer_phone?: string | null
          company_name?: string | null
          status?: BookingStatus
          base_price?: number
          platform_fee?: number
          total_price?: number
          venue_payout?: number
          stripe_payment_intent_id?: string | null
          stripe_payment_status?: string | null
          verification_token?: string | null
          created_at?: string
          updated_at?: string
          responded_at?: string | null
          captured_at?: string | null
          refunded_at?: string | null
          decline_reason?: string | null
          refund_amount?: number | null
        }
      }
      messages: {
        Row: {
          id: string
          booking_request_id: string
          sender_id: string
          content: string
          is_read: boolean
          read_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_request_id: string
          sender_id: string
          content: string
          is_read?: boolean
          read_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_request_id?: string
          sender_id?: string
          content?: string
          is_read?: boolean
          read_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          title: string
          message: string
          entity_type: EntityType
          entity_id: string
          is_read: boolean
          read_at: string | null
          created_by: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: NotificationType
          title: string
          message: string
          entity_type: EntityType
          entity_id: string
          is_read?: boolean
          read_at?: string | null
          created_by?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: NotificationType
          title?: string
          message?: string
          entity_type?: EntityType
          entity_id?: string
          is_read?: boolean
          read_at?: string | null
          created_by?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      notification_preferences: {
        Row: {
          user_id: string
          email_booking_request: boolean
          email_booking_accepted: boolean
          email_new_message: boolean
          email_new_match: boolean
          email_reminders: boolean
          email_review_request: boolean
          updated_at: string
        }
        Insert: {
          user_id: string
          email_booking_request?: boolean
          email_booking_accepted?: boolean
          email_new_message?: boolean
          email_new_match?: boolean
          email_reminders?: boolean
          email_review_request?: boolean
          updated_at?: string
        }
        Update: {
          user_id?: string
          email_booking_request?: boolean
          email_booking_accepted?: boolean
          email_new_message?: boolean
          email_new_match?: boolean
          email_reminders?: boolean
          email_review_request?: boolean
          updated_at?: string
        }
      }
      saved_venues: {
        Row: {
          id: string
          customer_id: string
          venue_id: string
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          venue_id: string
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          venue_id?: string
          created_at?: string
        }
      }
      shared_lists: {
        Row: {
          id: string
          share_token: string
          creator_id: string | null
          creator_email: string | null
          title: string | null
          venue_ids: string[]
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          share_token?: string
          creator_id?: string | null
          creator_email?: string | null
          title?: string | null
          venue_ids?: string[]
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          share_token?: string
          creator_id?: string | null
          creator_email?: string | null
          title?: string | null
          venue_ids?: string[]
          created_at?: string
          expires_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          booking_request_id: string
          venue_id: string
          customer_id: string
          rating: number
          review_text: string | null
          venue_response: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_request_id: string
          venue_id: string
          customer_id: string
          rating: number
          review_text?: string | null
          venue_response?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_request_id?: string
          venue_id?: string
          customer_id?: string
          rating?: number
          review_text?: string | null
          venue_response?: string | null
          created_at?: string
        }
      }
      agent_sessions: {
        Row: {
          id: string
          customer_id: string | null
          state: string
          requirements: Json
          matched_venues: Json | null
          messages: Json[]
          created_at: string
          updated_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          state?: string
          requirements?: Json
          matched_venues?: Json | null
          messages?: Json[]
          created_at?: string
          updated_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          state?: string
          requirements?: Json
          matched_venues?: Json | null
          messages?: Json[]
          created_at?: string
          updated_at?: string
          expires_at?: string
        }
      }
    }
    Functions: {
      match_venues: {
        Args: {
          query_embedding: number[]
          match_count?: number
          venue_ids?: string[] | null
        }
        Returns: {
          id: string
          name: string
          slug: string
          description: string
          address: string
          city: string
          area: string
          capacity_standing: number
          capacity_seated: number
          capacity_conference: number
          price_per_hour: number
          price_half_day: number
          price_full_day: number
          price_evening: number
          amenities: string[]
          venue_types: string[]
          vibes: string[]
          status: VenueStatus
          similarity: number
        }[]
      }
      check_venue_availability: {
        Args: {
          p_venue_id: string
          p_dates: string[]
        }
        Returns: {
          check_date: string
          is_available: boolean
        }[]
      }
      check_venues_availability_batch: {
        Args: {
          p_venue_ids: string[]
          p_dates: string[]
        }
        Returns: {
          venue_id: string
          check_date: string
          is_available: boolean
        }[]
      }
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Convenience aliases
export type Profile = Tables<'profiles'>
export type Venue = Tables<'venues'>
export type VenuePhoto = Tables<'venue_photos'>
export type VenueBlockedDate = Tables<'venue_blocked_dates'>
export type Search = Tables<'searches'>
export type BookingRequest = Tables<'booking_requests'>
export type Message = Tables<'messages'>
export type Notification = Tables<'notifications'>
export type NotificationPreference = Tables<'notification_preferences'>
export type SavedVenue = Tables<'saved_venues'>
export type SharedList = Tables<'shared_lists'>
export type Review = Tables<'reviews'>
export type AgentSession = Tables<'agent_sessions'>
