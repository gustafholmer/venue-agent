'use server'

import { logger } from '@/lib/logger'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { dispatchNotification } from '@/lib/notifications/create-notification'
import { dateSchema, timeSchema } from '@/lib/validation/schemas'
import type { BookingApprovalSummary } from '@/types/agent-booking'
import type { Json } from '@/types/database'

interface ModifyInput {
  actionId: string
  adjustedPrice?: number
  suggestedDate?: string
  suggestedStartTime?: string
  suggestedEndTime?: string
  note?: string
}

interface ModifyResult {
  success: boolean
  counterOfferId?: string
  error?: string
}

export async function modifyAction(input: ModifyInput): Promise<ModifyResult> {
  try {
    // Validate optional fields
    const modifyInputSchema = z.object({
      adjustedPrice: z.number().positive('Priset måste vara positivt').optional(),
      note: z.string().max(2000, 'Meddelandet är för långt').optional(),
      suggestedDate: dateSchema.optional(),
      suggestedStartTime: timeSchema.optional(),
      suggestedEndTime: timeSchema.optional(),
    })

    const parsed = modifyInputSchema.safeParse({
      adjustedPrice: input.adjustedPrice,
      note: input.note,
      suggestedDate: input.suggestedDate,
      suggestedStartTime: input.suggestedStartTime,
      suggestedEndTime: input.suggestedEndTime,
    })

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Load original action — RLS enforces venue ownership
    const { data: action, error: actionError } = await supabase
      .from('agent_actions')
      .select('*, venues!inner ( owner_id, name )')
      .eq('id', input.actionId)
      .single()

    if (actionError || !action) {
      return { success: false, error: 'Åtgärden hittades inte' }
    }

    const venue = action.venues as unknown as { owner_id: string; name: string }

    // Verify ownership
    if (venue.owner_id !== user.id) {
      return { success: false, error: 'Behörighet saknas' }
    }

    // Must be pending booking_approval
    if (action.status !== 'pending') {
      return { success: false, error: 'Åtgärden är redan hanterad' }
    }

    if (action.action_type !== 'booking_approval') {
      return { success: false, error: 'Åtgärden kan inte modifieras' }
    }

    const originalSummary = action.summary as unknown as BookingApprovalSummary

    const ownerResponse = {
      adjustedPrice: input.adjustedPrice,
      suggestedDate: input.suggestedDate,
      suggestedStartTime: input.suggestedStartTime,
      suggestedEndTime: input.suggestedEndTime,
      note: input.note,
    }

    // Mark original action as modified
    const { error: updateError } = await supabase
      .from('agent_actions')
      .update({
        status: 'modified',
        resolved_at: new Date().toISOString(),
        owner_response: ownerResponse as unknown as Json,
      })
      .eq('id', input.actionId)

    if (updateError) {
      logger.error('Failed to modify action', { updateError })
      return { success: false, error: 'Kunde inte uppdatera åtgärden' }
    }

    // Build counter-offer summary: merge original data with modifications
    const counterOfferSummary: BookingApprovalSummary = {
      ...originalSummary,
      date: input.suggestedDate ?? originalSummary.date,
      startTime: input.suggestedStartTime ?? originalSummary.startTime,
      endTime: input.suggestedEndTime ?? originalSummary.endTime,
      price: input.adjustedPrice ?? originalSummary.price,
    }

    // Create new counter_offer action
    const { data: counterOffer, error: insertError } = await supabase
      .from('agent_actions')
      .insert({
        venue_id: action.venue_id,
        conversation_id: action.conversation_id,
        customer_id: action.customer_id,
        action_type: 'counter_offer',
        status: 'pending',
        summary: {
          ...counterOfferSummary,
          originalActionId: input.actionId,
          ownerNote: input.note,
        } as unknown as Json,
      })
      .select('id')
      .single()

    if (insertError || !counterOffer) {
      logger.error('Failed to create counter-offer', { insertError })
      return { success: false, error: 'Kunde inte skapa motförslag' }
    }

    // Update conversation status to active
    await supabase
      .from('agent_conversations')
      .update({ status: 'active' })
      .eq('id', action.conversation_id)

    // Load conversation for customer_id
    const { data: conversation } = await supabase
      .from('agent_conversations')
      .select('customer_id')
      .eq('id', action.conversation_id)
      .single()

    // Notify customer about counter-offer
    if (conversation?.customer_id) {
      await dispatchNotification({
        recipient: conversation.customer_id,
        category: 'agent_counter_offer',
        headline: 'Motförslag från lokalägare',
        body: `${venue.name} har skickat ett motförslag för din bokning.`,
        reference: { kind: 'agent_action', id: counterOffer.id },
        author: user.id,
        extra: {
          venue_name: venue.name,
          original_action_id: input.actionId,
        },
      })
    }

    // Broadcast update on Realtime channel
    const channel = supabase.channel(`agent:${action.conversation_id}`)
    await channel.send({
      type: 'broadcast',
      event: 'action_update',
      payload: {
        actionId: input.actionId,
        status: 'modified',
        counterOfferId: counterOffer.id,
      },
    })
    await supabase.removeChannel(channel)

    return { success: true, counterOfferId: counterOffer.id }
  } catch (error) {
    logger.error('Error modifying action', { error })
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
