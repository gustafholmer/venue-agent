'use server'

import { createClient } from '@/lib/supabase/server'
import type { AgentConversationMessage } from '@/types/agent-booking'

export interface ConversationListItem {
  id: string
  venue_id: string
  customer_id: string | null
  status: string
  messages: AgentConversationMessage[]
  created_at: string
  updated_at: string
  customer_name: string | null
  customer_email: string | null
  venue_name: string | null
  pending_escalation_id: string | null
  pending_escalation_reason: string | null
}

interface GetVenueConversationsOptions {
  venueId?: string
  limit?: number
}

export async function getVenueConversations(
  options: GetVenueConversationsOptions = {}
): Promise<{ success: boolean; conversations?: ConversationListItem[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Ej inloggad' }

    // Get owner's venue IDs
    let venueIds: string[]
    if (options.venueId) {
      const { data: venue } = await supabase
        .from('venues')
        .select('id')
        .eq('id', options.venueId)
        .eq('owner_id', user.id)
        .single()
      if (!venue) return { success: false, error: 'Lokal hittades inte' }
      venueIds = [venue.id]
    } else {
      const { data: venues } = await supabase
        .from('venues')
        .select('id')
        .eq('owner_id', user.id)
      if (!venues || venues.length === 0) return { success: true, conversations: [] }
      venueIds = venues.map(v => v.id)
    }

    const { data: conversations, error } = await supabase
      .from('agent_conversations')
      .select('id, venue_id, customer_id, status, messages, created_at, updated_at, venues!inner(name), profiles(full_name, email)')
      .in('venue_id', venueIds)
      .neq('status', 'expired')
      .order('updated_at', { ascending: false })
      .limit(options.limit ?? 50)

    if (error) {
      console.error('[get-venue-conversations]', error)
      return { success: false, error: 'Kunde inte hämta konversationer' }
    }

    const conversationIds = (conversations ?? []).map(c => c.id)
    const { data: pendingActions } = conversationIds.length > 0
      ? await supabase
          .from('agent_actions')
          .select('id, conversation_id, summary')
          .in('conversation_id', conversationIds)
          .eq('status', 'pending')
          .eq('action_type', 'escalation')
      : { data: [] }

    const escalationMap = new Map<string, { id: string; reason: string }>()
    for (const action of pendingActions ?? []) {
      const summary = action.summary as Record<string, unknown>
      escalationMap.set(action.conversation_id, {
        id: action.id,
        reason: (summary?.customerRequest as string) ?? '',
      })
    }

    const items: ConversationListItem[] = (conversations ?? []).map(c => {
      const venue = c.venues as unknown as { name: string } | null
      const profile = c.profiles as unknown as { full_name: string | null; email: string } | null
      const escalation = escalationMap.get(c.id)
      return {
        id: c.id,
        venue_id: c.venue_id,
        customer_id: c.customer_id,
        status: c.status,
        messages: (c.messages ?? []) as unknown as AgentConversationMessage[],
        created_at: c.created_at,
        updated_at: c.updated_at,
        customer_name: profile?.full_name ?? null,
        customer_email: profile?.email ?? null,
        venue_name: venue?.name ?? null,
        pending_escalation_id: escalation?.id ?? null,
        pending_escalation_reason: escalation?.reason ?? null,
      }
    })

    return { success: true, conversations: items }
  } catch (error) {
    console.error('[get-venue-conversations]', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
