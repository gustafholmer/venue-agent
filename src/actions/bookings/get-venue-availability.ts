'use server'

import { logger } from '@/lib/logger'

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

    // Run both queries in parallel
    const [blockedResult, bookingsResult] = await Promise.all([
      supabase
        .from('venue_blocked_dates')
        .select('blocked_date')
        .eq('venue_id', venueId)
        .gte('blocked_date', startDateStr)
        .lte('blocked_date', endDateStr),
      supabase
        .from('booking_requests')
        .select('event_date')
        .eq('venue_id', venueId)
        .in('status', ['accepted', 'pending'])
        .gte('event_date', startDateStr)
        .lte('event_date', endDateStr),
    ])

    if (blockedResult.error) {
      logger.error('Error fetching blocked dates', { error: blockedResult.error })
      return { success: false, error: 'Kunde inte hämta tillgänglighet' }
    }

    if (bookingsResult.error) {
      logger.error('Error fetching bookings', { error: bookingsResult.error })
      return { success: false, error: 'Kunde inte hämta bokningar' }
    }

    return {
      success: true,
      data: {
        blockedDates: blockedResult.data?.map((d) => d.blocked_date) || [],
        bookedDates: bookingsResult.data?.map((b) => b.event_date) || [],
      },
    }
  } catch (error) {
    logger.error('Unexpected error fetching availability', { error })
    return {
      success: false,
      error: 'Ett oväntat fel uppstod',
    }
  }
}
