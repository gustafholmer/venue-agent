'use server'

import { createClient } from '@/lib/supabase/server'
import type { BookingRequest } from '@/types/database'

export type BookingStatusFilter = 'all' | 'pending' | 'accepted' | 'declined'

export interface VenueBooking extends BookingRequest {
  venue: {
    name: string
  }
}

export interface GetVenueBookingsResult {
  success: boolean
  bookings?: VenueBooking[]
  error?: string
}

export async function getVenueBookings(
  statusFilter: BookingStatusFilter = 'all'
): Promise<GetVenueBookingsResult> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Get venue for this owner
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (venueError || !venue) {
      return { success: false, error: 'Ingen lokal hittades' }
    }

    // Build query
    let query = supabase
      .from('booking_requests')
      .select(`
        *,
        venue:venues!inner(
          name
        )
      `)
      .eq('venue_id', venue.id)
      .order('created_at', { ascending: false })

    // Apply status filter
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data: bookings, error: bookingsError } = await query

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return { success: false, error: 'Kunde inte hämta bokningar' }
    }

    return {
      success: true,
      bookings: (bookings || []) as VenueBooking[],
    }
  } catch (error) {
    console.error('Unexpected error fetching venue bookings:', error)
    return {
      success: false,
      error: 'Ett ovantat fel uppstod',
    }
  }
}
