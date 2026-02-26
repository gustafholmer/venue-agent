import type { SupabaseClient } from '@supabase/supabase-js'
import { dispatchNotification } from '@/lib/notifications/create-notification'
import type { Json } from '@/types/database'

interface EscalateToOwnerArgs {
  reason: string
  customerRequest: string
  context?: Record<string, unknown>
}

interface EscalateToOwnerContext {
  venueId: string
  conversationId: string
  customerId?: string
}

interface EscalateToOwnerResult {
  success: boolean
  actionId?: string
}

/**
 * Create an escalation action card for the venue owner.
 * Creates an agent_actions row, dispatches a notification, and
 * updates the conversation status to waiting_for_owner.
 */
export async function escalateToOwner(
  args: EscalateToOwnerArgs,
  context: EscalateToOwnerContext,
  venue: Record<string, unknown>,
  serviceClient: SupabaseClient
): Promise<EscalateToOwnerResult> {
  const { reason, customerRequest, context: additionalContext } = args
  const { venueId, conversationId } = context

  const summary = {
    reason,
    customerRequest,
    context: additionalContext || {},
  }

  // Create agent_actions row
  const { data: action, error: actionError } = await serviceClient
    .from('agent_actions')
    .insert({
      conversation_id: conversationId,
      venue_id: venueId,
      action_type: 'escalation',
      status: 'pending',
      summary: summary as unknown as Json,
    })
    .select('id')
    .single()

  if (actionError || !action) {
    return { success: false }
  }

  // Update conversation status to waiting_for_owner
  await serviceClient
    .from('agent_conversations')
    .update({ status: 'waiting_for_owner' })
    .eq('id', conversationId)

  // Dispatch notification to venue owner
  const ownerId = venue.owner_id as string
  if (ownerId) {
    await dispatchNotification({
      recipient: ownerId,
      category: 'agent_escalation',
      headline: 'Agenten behöver din hjälp',
      body: `En kund har en förfrågan som kräver ditt svar: ${customerRequest}`,
      reference: {
        kind: 'agent_action',
        id: action.id,
      },
      extra: {
        conversation_id: conversationId,
        venue_id: venueId,
        reason,
      },
    })
  }

  return {
    success: true,
    actionId: action.id,
  }
}
