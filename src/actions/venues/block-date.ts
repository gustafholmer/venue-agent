'use server'

import { createClient } from '@/lib/supabase/server'
import { syncToCalendar } from '@/lib/calendar/sync'

export async function blockDate(
  date: string,
  reason?: string
): Promise<{ success: boolean; error?: string; calendarSyncFailed?: boolean }> {
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

  // Check if date already has an accepted or pending booking
  const { data: existingBooking } = await supabase
    .from('booking_requests')
    .select('id, status')
    .eq('venue_id', venue.id)
    .eq('event_date', date)
    .in('status', ['accepted', 'pending'])
    .single()

  if (existingBooking) {
    const statusText = existingBooking.status === 'accepted' ? 'accepterad' : 'ventande'
    return {
      success: false,
      error: `Det finns redan en ${statusText} bokning detta datum`,
    }
  }

  // Check if date is already blocked
  const { data: existingBlock } = await supabase
    .from('venue_blocked_dates')
    .select('id')
    .eq('venue_id', venue.id)
    .eq('blocked_date', date)
    .single()

  if (existingBlock) {
    return { success: true } // Already blocked, consider it a success
  }

  // Insert blocked date
  const { data: insertedBlock, error: insertError } = await supabase
    .from('venue_blocked_dates')
    .insert({
      venue_id: venue.id,
      blocked_date: date,
      reason: reason || null,
    })
    .select('id')
    .single()

  if (insertError || !insertedBlock) {
    console.error('Error blocking date:', insertError)
    return { success: false, error: 'Kunde inte blockera datum' }
  }

  const syncResult = await syncToCalendar(venue.id, {
    entityType: 'blocked_date',
    entityId: insertedBlock.id,
    action: 'create',
    event: {
      title: 'Blockerad',
      description: reason || undefined,
      date,
      status: 'confirmed',
    },
  })

  return { success: true, calendarSyncFailed: syncResult.calendarSyncFailed }
}

export async function blockDateRange(
  startDate: string,
  endDate: string,
  reason?: string
): Promise<{ success: boolean; error?: string; blockedCount?: number; failedDates?: string[]; calendarSyncFailed?: boolean }> {
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

  // Generate all dates in range
  const dates: string[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0])
  }

  // Check for existing bookings on any of these dates
  const { data: existingBookings } = await supabase
    .from('booking_requests')
    .select('event_date, status')
    .eq('venue_id', venue.id)
    .in('event_date', dates)
    .in('status', ['accepted', 'pending'])

  const bookedDates = new Set(existingBookings?.map(b => b.event_date) || [])
  const failedDates = dates.filter(d => bookedDates.has(d))

  // Get already blocked dates
  const { data: existingBlocks } = await supabase
    .from('venue_blocked_dates')
    .select('blocked_date')
    .eq('venue_id', venue.id)
    .in('blocked_date', dates)

  const alreadyBlockedDates = new Set(existingBlocks?.map(b => b.blocked_date) || [])

  // Filter dates that can be blocked (not already blocked and no bookings)
  const datesToBlock = dates.filter(d => !bookedDates.has(d) && !alreadyBlockedDates.has(d))

  if (datesToBlock.length === 0) {
    if (failedDates.length > 0) {
      return {
        success: false,
        error: 'Alla datum har antingen bokningar eller ar redan blockerade',
        failedDates,
      }
    }
    return { success: true, blockedCount: 0 } // All dates already blocked
  }

  // Insert blocked dates
  const { data: insertedBlocks, error: insertError } = await supabase
    .from('venue_blocked_dates')
    .insert(
      datesToBlock.map(date => ({
        venue_id: venue.id,
        blocked_date: date,
        reason: reason || null,
      }))
    )
    .select('id, blocked_date')

  if (insertError) {
    console.error('Error blocking dates:', insertError)
    return { success: false, error: 'Kunde inte blockera datum' }
  }

  let calendarSyncFailed = false
  if (insertedBlocks) {
    for (const block of insertedBlocks) {
      const syncResult = await syncToCalendar(venue.id, {
        entityType: 'blocked_date',
        entityId: block.id,
        action: 'create',
        event: {
          title: 'Blockerad',
          description: reason || undefined,
          date: block.blocked_date,
          status: 'confirmed',
        },
      })
      if (syncResult.calendarSyncFailed) calendarSyncFailed = true
    }
  }

  return {
    success: true,
    blockedCount: datesToBlock.length,
    failedDates: failedDates.length > 0 ? failedDates : undefined,
    calendarSyncFailed: calendarSyncFailed || undefined,
  }
}
