'use server'

import { createClient } from '@/lib/supabase/server'
import type { AgentConversationMessage } from '@/types/agent-booking'

export interface ConversationWithMessages {
  id: string
  venue_id: string
  customer_id: string | null
  status: string
  messages: AgentConversationMessage[]
  created_at: string
  updated_at: string
  customer_name: string | null
  customer_email: string | null
  venue_name: string
  pending_escalation_id: string | null
  pending_escalation_summary: {
    customerRequest: string
    reasons: string[]
  } | null
}

export async function getConversationMessages(
  conversationId: string
): Promise<{ success: boolean; conversation?: ConversationWithMessages; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Ej inloggad' }

    const { data: conversation, error } = await supabase
      .from('agent_conversations')
      .select('id, venue_id, customer_id, status, messages, created_at, updated_at, venues!inner(name, owner_id), profiles(full_name, email)')
      .eq('id', conversationId)
      .single()

    if (error || !conversation) {
      return { success: false, error: 'Konversation hittades inte' }
    }

    const venue = conversation.venues as unknown as { name: string; owner_id: string }
    if (venue.owner_id !== user.id) {
      return { success: false, error: 'Behörighet saknas' }
    }

    const profile = conversation.profiles as unknown as { full_name: string | null; email: string } | null

    const { data: pendingAction } = await supabase
      .from('agent_actions')
      .select('id, summary')
      .eq('conversation_id', conversationId)
      .eq('status', 'pending')
      .eq('action_type', 'escalation')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let escalationSummary: ConversationWithMessages['pending_escalation_summary'] = null
    if (pendingAction) {
      const summary = pendingAction.summary as Record<string, unknown>
      escalationSummary = {
        customerRequest: (summary?.customerRequest as string) ?? '',
        reasons: (summary?.reasons as string[]) ?? [],
      }
    }

    return {
      success: true,
      conversation: {
        id: conversation.id,
        venue_id: conversation.venue_id,
        customer_id: conversation.customer_id,
        status: conversation.status,
        messages: (conversation.messages ?? []) as unknown as AgentConversationMessage[],
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        customer_name: profile?.full_name ?? null,
        customer_email: profile?.email ?? null,
        venue_name: venue.name,
        pending_escalation_id: pendingAction?.id ?? null,
        pending_escalation_summary: escalationSummary,
      },
    }
  } catch (error) {
    console.error('[get-conversation-messages]', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
