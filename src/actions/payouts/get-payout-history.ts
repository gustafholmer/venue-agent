'use server'

import { createClient } from '@/lib/supabase/server'

export type PayoutStatusFilter = 'all' | 'paid_out' | 'pending'

export interface PayoutHistoryItem {
  id: string
  venueId: string
  venueName: string
  eventType: string
  eventDate: string
  venuePayout: number
  status: string
  capturedAt: string | null
  updatedAt: string
}

export interface PayoutHistoryResult {
  items: PayoutHistoryItem[]
  hasMore: boolean
}

export async function getPayoutHistory(
  filter: PayoutStatusFilter = 'all',
  limit: number = 20,
  offset: number = 0
): Promise<PayoutHistoryResult | null> {
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
    console.error('Error fetching venues for payout history:', venuesError)
    return null
  }

  if (!venues || venues.length === 0) {
    return { items: [], hasMore: false }
  }

  const venueIds = venues.map((v) => v.id)

  // Map filter to DB statuses
  const statusMap: Record<PayoutStatusFilter, string[]> = {
    paid_out: ['paid_out'],
    pending: ['completed'],
    all: ['completed', 'paid_out'],
  }
  const statuses = statusMap[filter]

  // Fetch limit+1 to determine hasMore
  const fetchCount = limit + 1

  const { data: bookings, error: bookingsError } = await supabase
    .from('booking_requests')
    .select(
      `
      id,
      venue_id,
      event_type,
      event_date,
      venue_payout,
      status,
      captured_at,
      updated_at,
      venue:venues!inner(name)
    `
    )
    .in('venue_id', venueIds)
    .in('status', statuses)
    .is('refunded_at', null)
    .order('updated_at', { ascending: false })
    .range(offset, offset + fetchCount - 1)

  if (bookingsError) {
    console.error('Error fetching payout history:', bookingsError)
    return null
  }

  if (!bookings) {
    return { items: [], hasMore: false }
  }

  const hasMore = bookings.length > limit
  const pageBookings = hasMore ? bookings.slice(0, limit) : bookings

  const items: PayoutHistoryItem[] = pageBookings.map((booking) => ({
    id: booking.id,
    venueId: booking.venue_id,
    venueName: (booking.venue as unknown as { name: string }).name,
    eventType: booking.event_type,
    eventDate: booking.event_date,
    venuePayout: booking.venue_payout ?? 0,
    status: booking.status,
    capturedAt: booking.captured_at,
    updatedAt: booking.updated_at,
  }))

  return { items, hasMore }
}
