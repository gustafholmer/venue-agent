'use server'

import { createClient } from '@/lib/supabase/server'

export async function unblockDate(
  venueId: string,
  date: string
): Promise<{ success: boolean; error?: string }> {
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
    return { success: false, error: 'Ingen lokal hittades' }
  }

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

  return { success: true }
}
