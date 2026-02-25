'use server'

import { createClient } from '@/lib/supabase/server'
import { syncToCalendar } from '@/lib/calendar/sync'

export async function unblockDate(
  date: string
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

  // Get the blocked date's ID before deleting (needed for calendar sync)
  const { data: blockedDate } = await supabase
    .from('venue_blocked_dates')
    .select('id')
    .eq('venue_id', venue.id)
    .eq('blocked_date', date)
    .single()

  // Delete the blocked date
  const { error: deleteError } = await supabase
    .from('venue_blocked_dates')
    .delete()
    .eq('venue_id', venue.id)
    .eq('blocked_date', date)

  if (deleteError) {
    console.error('Error unblocking date:', deleteError)
    return { success: false, error: 'Kunde inte avblockera datum' }
  }

  let calendarSyncFailed: boolean | undefined
  if (blockedDate) {
    const syncResult = await syncToCalendar(venue.id, {
      entityType: 'blocked_date',
      entityId: blockedDate.id,
      action: 'delete',
    })
    calendarSyncFailed = syncResult.calendarSyncFailed
  }

  return { success: true, calendarSyncFailed }
}
