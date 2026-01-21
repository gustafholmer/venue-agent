'use server'

import { createClient } from '@/lib/supabase/server'

export interface VenueAvailability {
  blockedDates: string[]
  bookedDates: string[]
}

export async function getVenueAvailability(
  venueId: string,
  year: number,
  month: number
): Promise<{ success: boolean; data?: VenueAvailability; error?: string }> {
  try {
    const supabase = await createClient()

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // Last day of the month

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // Get blocked dates for this month
    const { data: blockedDates, error: blockedError } = await supabase
      .from('venue_blocked_dates')
      .select('blocked_date')
      .eq('venue_id', venueId)
      .gte('blocked_date', startDateStr)
      .lte('blocked_date', endDateStr)

    if (blockedError) {
      console.error('Error fetching blocked dates:', blockedError)
      return { success: false, error: 'Kunde inte hämta tillgänglighet' }
    }

    // Get bookings (accepted and pending) for this month
    const { data: bookings, error: bookingsError } = await supabase
      .from('booking_requests')
      .select('event_date')
      .eq('venue_id', venueId)
      .in('status', ['accepted', 'pending'])
      .gte('event_date', startDateStr)
      .lte('event_date', endDateStr)

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return { success: false, error: 'Kunde inte hämta bokningar' }
    }

    return {
      success: true,
      data: {
        blockedDates: blockedDates?.map((d) => d.blocked_date) || [],
        bookedDates: bookings?.map((b) => b.event_date) || [],
      },
    }
  } catch (error) {
    console.error('Unexpected error fetching availability:', error)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod',
    }
  }
}
