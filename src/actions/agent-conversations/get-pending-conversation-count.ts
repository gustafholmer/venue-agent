'use server'

import { createClient } from '@/lib/supabase/server'

export async function getPendingConversationCount(): Promise<number> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { data: venues } = await supabase
      .from('venues')
      .select('id')
      .eq('owner_id', user.id)

    if (!venues || venues.length === 0) return 0

    const venueIds = venues.map(v => v.id)

    const { count } = await supabase
      .from('agent_actions')
      .select('conversation_id', { count: 'exact', head: true })
      .in('venue_id', venueIds)
      .eq('status', 'pending')
      .eq('action_type', 'escalation')

    return count ?? 0
  } catch {
    return 0
  }
}
