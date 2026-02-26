'use server'

import { createClient } from '@/lib/supabase/server'
import type { VenueBlockedDate, BookingRequest } from '@/types/database'

export interface CalendarData {
  blockedDates: VenueBlockedDate[]
  bookings: Pick<BookingRequest, 'id' | 'event_date' | 'status' | 'customer_name' | 'event_type'>[]
  venueId: string | null
}

export async function getCalendarData(venueId: string, year: number, month: number): Promise<{
  success: boolean
  data?: CalendarData
  error?: string
}> {
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
      .eq('id', venueId)
      .eq('owner_id', user.id)
      .single()

    if (venueError || !venue) {
      return {
        success: true,
        data: {
          blockedDates: [],
          bookings: [],
          venueId: null
        }
      }
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // Last day of the month

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // Get blocked dates for this month
    const { data: blockedDates, error: blockedError } = await supabase
      .from('venue_blocked_dates')
      .select('*')
      .eq('venue_id', venue.id)
      .gte('blocked_date', startDateStr)
      .lte('blocked_date', endDateStr)

    if (blockedError) {
      console.error('Error fetching blocked dates:', blockedError)
      return { success: false, error: 'Kunde inte hamta blockerade datum' }
    }

    // Get bookings (accepted and pending) for this month
    const { data: bookings, error: bookingsError } = await supabase
      .from('booking_requests')
      .select('id, event_date, status, customer_name, event_type')
      .eq('venue_id', venue.id)
      .in('status', ['accepted', 'pending'])
      .gte('event_date', startDateStr)
      .lte('event_date', endDateStr)

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return { success: false, error: 'Kunde inte hamta bokningar' }
    }

    return {
      success: true,
      data: {
        blockedDates: blockedDates || [],
        bookings: bookings || [],
        venueId: venue.id,
      },
    }
  } catch (error) {
    console.error('Unexpected error in getCalendarData:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
