import type { SupabaseClient } from '@supabase/supabase-js'

interface CheckAvailabilityArgs {
  date: string
  startTime?: string
  endTime?: string
}

interface CheckAvailabilityResult {
  available: boolean
  reason?: string
  alternatives?: string[]
}

/**
 * Check if a specific date is available for booking at a venue.
 * Queries venue_blocked_dates and booking_requests tables.
 * If unavailable, finds nearest 3 available dates within +/-30 days.
 */
export async function checkAvailability(
  args: CheckAvailabilityArgs,
  venueId: string,
  serviceClient: SupabaseClient
): Promise<CheckAvailabilityResult> {
  const { date, startTime, endTime } = args

  // Reject dates in the past
  const requestedDate = new Date(date + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (requestedDate < today) {
    return {
      available: false,
      reason: 'Datumet har redan passerat.',
    }
  }

  // Check venue_blocked_dates
  const { data: blockedDates } = await serviceClient
    .from('venue_blocked_dates')
    .select('blocked_date, reason')
    .eq('venue_id', venueId)
    .eq('blocked_date', date)

  if (blockedDates && blockedDates.length > 0) {
    const alternatives = await findAlternativeDates(date, venueId, serviceClient)
    return {
      available: false,
      reason: blockedDates[0].reason || 'Datumet är blockerat av lokalägaren.',
      alternatives,
    }
  }

  // Check existing booking_requests (pending or accepted)
  let query = serviceClient
    .from('booking_requests')
    .select('id, start_time, end_time')
    .eq('venue_id', venueId)
    .eq('event_date', date)
    .in('status', ['pending', 'accepted'])

  // If time range specified, check for overlapping bookings
  if (startTime && endTime) {
    // A booking overlaps if its start is before our end AND its end is after our start
    query = query.lt('start_time', endTime).gt('end_time', startTime)
  }

  const { data: existingBookings } = await query

  if (existingBookings && existingBookings.length > 0) {
    const alternatives = await findAlternativeDates(date, venueId, serviceClient)
    return {
      available: false,
      reason: 'Datumet är redan bokat.',
      alternatives,
    }
  }

  return { available: true }
}

/**
 * Find the nearest 3 available dates within +/-30 days of the target date.
 */
async function findAlternativeDates(
  targetDate: string,
  venueId: string,
  serviceClient: SupabaseClient
): Promise<string[]> {
  const target = new Date(targetDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Generate candidate dates: +/-30 days from target
  const candidates: string[] = []
  for (let offset = -30; offset <= 30; offset++) {
    if (offset === 0) continue
    const candidate = new Date(target)
    candidate.setDate(candidate.getDate() + offset)
    if (candidate >= today) {
      candidates.push(candidate.toISOString().split('T')[0])
    }
  }

  // Sort candidates by distance from target date
  candidates.sort((a, b) => {
    const distA = Math.abs(new Date(a).getTime() - target.getTime())
    const distB = Math.abs(new Date(b).getTime() - target.getTime())
    return distA - distB
  })

  if (candidates.length === 0) return []

  // Fetch all blocked dates in the range
  const minDate = candidates[candidates.length - 1] < candidates[0]
    ? candidates[candidates.length - 1]
    : candidates.reduce((min, d) => (d < min ? d : min), candidates[0])
  const maxDate = candidates.reduce((max, d) => (d > max ? d : max), candidates[0])

  const { data: blockedDates } = await serviceClient
    .from('venue_blocked_dates')
    .select('blocked_date')
    .eq('venue_id', venueId)
    .gte('blocked_date', minDate)
    .lte('blocked_date', maxDate)

  const blockedSet = new Set((blockedDates || []).map((d) => d.blocked_date))

  // Fetch all booked dates in the range
  const { data: bookedDates } = await serviceClient
    .from('booking_requests')
    .select('event_date')
    .eq('venue_id', venueId)
    .gte('event_date', minDate)
    .lte('event_date', maxDate)
    .in('status', ['pending', 'accepted'])

  const bookedSet = new Set((bookedDates || []).map((d) => d.event_date))

  // Filter to available dates, take first 3
  const alternatives: string[] = []
  for (const candidate of candidates) {
    if (!blockedSet.has(candidate) && !bookedSet.has(candidate)) {
      alternatives.push(candidate)
      if (alternatives.length >= 3) break
    }
  }

  return alternatives
}
