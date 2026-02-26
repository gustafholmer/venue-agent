import type { SupabaseClient } from '@supabase/supabase-js'
import { dispatchNotification } from '@/lib/notifications/create-notification'
import type { Json } from '@/types/database'

interface ProposeBookingArgs {
  date: string
  startTime: string
  endTime: string
  guestCount: number
  eventType: string
  price: number
  extras?: string[]
  customerNote?: string
}

interface ProposeBookingContext {
  venueId: string
  conversationId: string
  customerId?: string
}

interface ProposeBookingResult {
  success: boolean
  actionId?: string
  summary?: Record<string, unknown>
}

/**
 * Create a booking approval action card for the venue owner.
 * Creates an agent_actions row, dispatches a notification, and
 * updates the conversation status to waiting_for_owner.
 */
export async function proposeBooking(
  args: ProposeBookingArgs,
  context: ProposeBookingContext,
  venue: Record<string, unknown>,
  serviceClient: SupabaseClient
): Promise<ProposeBookingResult> {
  const { date, startTime, endTime, guestCount, eventType, price, extras, customerNote } = args
  const { venueId, conversationId } = context

  const summary = {
    eventType,
    guestCount,
    date,
    startTime,
    endTime,
    price,
    extras: extras || [],
    customerNote: customerNote || null,
  }

  // Create agent_actions row
  const { data: action, error: actionError } = await serviceClient
    .from('agent_actions')
    .insert({
      conversation_id: conversationId,
      venue_id: venueId,
      action_type: 'booking_approval',
      status: 'pending',
      summary: summary as unknown as Json,
    })
    .select('id')
    .single()

  if (actionError || !action) {
    return {
      success: false,
    }
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
      category: 'agent_booking_approval',
      headline: 'Ny bokningsförfrågan via agenten',
      body: `En kund vill boka ${venue.name || 'din lokal'} den ${date} (${startTime}–${endTime}) för ${guestCount} gäster.`,
      reference: {
        kind: 'agent_action',
        id: action.id,
      },
      extra: {
        conversation_id: conversationId,
        venue_id: venueId,
      },
    })
  }

  return {
    success: true,
    actionId: action.id,
    summary,
  }
}
