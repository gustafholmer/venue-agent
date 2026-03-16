'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { replyToEscalation } from '@/actions/agent-actions/reply-to-escalation'
import type { AgentConversationMessage } from '@/types/agent-booking'

interface ReplyResult {
  success: boolean
  error?: string
}

export async function replyToConversation(
  conversationId: string,
  response: string,
  pendingEscalationId?: string
): Promise<ReplyResult> {
  try {
    const trimmed = response.trim()
    if (!trimmed) return { success: false, error: 'Meddelandet kan inte vara tomt' }
    if (trimmed.length > 2000) return { success: false, error: 'Meddelandet är för långt (max 2000 tecken)' }

    if (pendingEscalationId) {
      return replyToEscalation(pendingEscalationId, trimmed)
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Ej inloggad' }

    const { data: conversation, error } = await supabase
      .from('agent_conversations')
      .select('id, venue_id, messages, venues!inner(owner_id)')
      .eq('id', conversationId)
      .single()

    if (error || !conversation) {
      return { success: false, error: 'Konversation hittades inte' }
    }

    const venue = conversation.venues as unknown as { owner_id: string }
    if (venue.owner_id !== user.id) {
      return { success: false, error: 'Behörighet saknas' }
    }

    const existingMessages = (conversation.messages ?? []) as unknown as AgentConversationMessage[]
    const ownerMessage: AgentConversationMessage = {
      id: `owner_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      role: 'system',
      content: `[Svar från lokalägaren]: ${trimmed}`,
      timestamp: new Date().toISOString(),
    }

    const serviceClient = createServiceClient()
    const { error: updateError } = await serviceClient
      .from('agent_conversations')
      .update({
        messages: [...existingMessages, ownerMessage] as unknown as Record<string, unknown>[],
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)

    if (updateError) {
      console.error('[reply-to-conversation] Update error:', updateError)
      return { success: false, error: 'Kunde inte skicka meddelandet' }
    }

    await serviceClient.channel(`agent:${conversationId}`).send({
      type: 'broadcast',
      event: 'action_update',
      payload: { status: 'owner_reply', ownerResponse: trimmed },
    })

    return { success: true }
  } catch (error) {
    console.error('[reply-to-conversation]', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
