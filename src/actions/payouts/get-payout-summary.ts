'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'

export interface PayoutSummary {
  totalEarned: number
  pendingPayout: number
  lastPayoutAmount: number | null
  lastPayoutDate: string | null
}

export async function getPayoutSummary(): Promise<PayoutSummary | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    // Get all venue IDs owned by this user
    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('id')
      .eq('owner_id', user.id)

    if (venuesError) {
      logger.error('Error fetching venues for payout summary', { venuesError })
      return { totalEarned: 0, pendingPayout: 0, lastPayoutAmount: null, lastPayoutDate: null }
    }

    if (!venues || venues.length === 0) {
      return { totalEarned: 0, pendingPayout: 0, lastPayoutAmount: null, lastPayoutDate: null }
    }

    const venueIds = venues.map((v) => v.id)

    // Query completed and paid_out bookings that haven't been refunded
    const { data: bookings, error: bookingsError } = await supabase
      .from('booking_requests')
      .select('status, venue_payout, updated_at')
      .in('venue_id', venueIds)
      .in('status', ['completed', 'paid_out'])
      .is('refunded_at', null)

    if (bookingsError) {
      logger.error('Error fetching payout bookings', { bookingsError })
      return { totalEarned: 0, pendingPayout: 0, lastPayoutAmount: null, lastPayoutDate: null }
    }

    if (!bookings) {
      return { totalEarned: 0, pendingPayout: 0, lastPayoutAmount: null, lastPayoutDate: null }
    }

    let totalEarned = 0
    let pendingPayout = 0
    let lastPayoutAmount: number | null = null
    let lastPayoutDate: string | null = null

    for (const booking of bookings) {
      const payout = booking.venue_payout ?? 0

      if (booking.status === 'paid_out') {
        totalEarned += payout

        // Track most recent payout by updated_at (ISO 8601 sorts lexicographically)
        if (!lastPayoutDate || booking.updated_at > lastPayoutDate) {
          lastPayoutDate = booking.updated_at
          lastPayoutAmount = payout
        }
      } else if (booking.status === 'completed') {
        pendingPayout += payout
      }
    }

    return { totalEarned, pendingPayout, lastPayoutAmount, lastPayoutDate }
  } catch (error) {
    logger.error('Unexpected error in getPayoutSummary', { error })
    return null
  }
}
