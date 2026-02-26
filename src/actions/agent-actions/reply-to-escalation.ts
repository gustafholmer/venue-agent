'use server'

import { logger } from '@/lib/logger'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'
import type { AgentConversationMessage } from '@/types/agent-booking'

interface ReplyResult {
  success: boolean
  error?: string
}

export async function replyToEscalation(
  actionId: string,
  response: string
): Promise<ReplyResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    const parsed = z.string().min(1, 'Svar krävs').max(2000, 'Meddelandet är för långt').safeParse(response)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    // Load action — RLS enforces venue ownership
    const { data: action, error: actionError } = await supabase
      .from('agent_actions')
      .select('*, venues!inner ( owner_id )')
      .eq('id', actionId)
      .single()

    if (actionError || !action) {
      return { success: false, error: 'Åtgärden hittades inte' }
    }

    const venue = action.venues as unknown as { owner_id: string }

    // Verify ownership
    if (venue.owner_id !== user.id) {
      return { success: false, error: 'Behörighet saknas' }
    }

    // Must be pending escalation
    if (action.status !== 'pending') {
      return { success: false, error: 'Åtgärden är redan hanterad' }
    }

    if (action.action_type !== 'escalation') {
      return { success: false, error: 'Åtgärden är inte en eskalering' }
    }

    // Update action: approved (meaning "responded")
    const { error: updateError } = await supabase
      .from('agent_actions')
      .update({
        status: 'approved',
        resolved_at: new Date().toISOString(),
        owner_response: { message: response } as unknown as Json,
      })
      .eq('id', actionId)

    if (updateError) {
      logger.error('Failed to update escalation', { updateError })
      return { success: false, error: 'Kunde inte uppdatera åtgärden' }
    }

    // Load conversation to inject owner response as system message
    const { data: conversation, error: convError } = await supabase
      .from('agent_conversations')
      .select('id, messages')
      .eq('id', action.conversation_id)
      .single()

    if (convError || !conversation) {
      logger.error('Failed to load conversation', { convError })
      return { success: false, error: 'Konversationen hittades inte' }
    }

    // Inject owner's response as a system message
    const ownerMessage: AgentConversationMessage = {
      id: `owner_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      role: 'system',
      content: `[Svar från lokalägaren]: ${response}`,
      timestamp: new Date().toISOString(),
    }

    const existingMessages = (conversation.messages ?? []) as unknown as AgentConversationMessage[]
    const updatedMessages = [...existingMessages, ownerMessage]

    // Update conversation: inject message + set active
    await supabase
      .from('agent_conversations')
      .update({
        status: 'active',
        messages: updatedMessages as unknown as Json[],
      })
      .eq('id', action.conversation_id)

    // Broadcast update so agent has new context
    const channel = supabase.channel(`agent:${action.conversation_id}`)
    await channel.send({
      type: 'broadcast',
      event: 'action_update',
      payload: {
        actionId,
        status: 'approved',
        ownerResponse: response,
      },
    })
    await supabase.removeChannel(channel)

    return { success: true }
  } catch (error) {
    logger.error('Error replying to escalation', { error })
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
