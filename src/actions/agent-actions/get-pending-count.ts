'use server'

import { createClient } from '@/lib/supabase/server'

export async function getPendingActionCount(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  // Get all venues for this owner
  const { data: venues } = await supabase
    .from('venues')
    .select('id')
    .eq('owner_id', user.id)

  if (!venues || venues.length === 0) return 0

  const venueIds = venues.map(v => v.id)

  const { count } = await supabase
    .from('agent_actions')
    .select('id', { count: 'exact', head: true })
    .in('venue_id', venueIds)
    .eq('status', 'pending')

  return count ?? 0
}
