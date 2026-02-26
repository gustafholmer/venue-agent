'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'
import { uuidSchema } from '@/lib/validation/schemas'
import { createBookingRequest } from '@/actions/bookings/create-booking-request'
import { dispatchNotification } from '@/lib/notifications/create-notification'
import type { BookingApprovalSummary } from '@/types/agent-booking'

interface ApproveResult {
  success: boolean
  bookingId?: string
  error?: string
}

export async function approveAction(actionId: string): Promise<ApproveResult> {
  try {
    // Validate actionId
    const parsed = uuidSchema.safeParse(actionId)
    if (!parsed.success) {
      return { success: false, error: 'Ogiltigt åtgärds-ID' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Load action — RLS enforces venue ownership
    const { data: action, error: actionError } = await supabase
      .from('agent_actions')
      .select('*, venues!inner ( owner_id, name )')
      .eq('id', actionId)
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
      return { success: false, error: 'Åtgärden är inte en bokningsförfrågan' }
    }

    // Extract booking data from summary
    const summary = action.summary as unknown as BookingApprovalSummary

    // Load conversation to get customer_id
    const { data: conversation, error: convError } = await supabase
      .from('agent_conversations')
      .select('id, customer_id, status')
      .eq('id', action.conversation_id)
      .single()

    if (convError || !conversation) {
      return { success: false, error: 'Konversationen hittades inte' }
    }

    // Create the actual booking
    const bookingResult = await createBookingRequest({
      venueId: action.venue_id,
      eventDate: summary.date,
      startTime: summary.startTime,
      endTime: summary.endTime,
      eventType: summary.eventType,
      guestCount: summary.guestCount,
      customerName: summary.customerName ?? 'Okänd kund',
      customerEmail: summary.customerEmail ?? '',
      companyName: summary.companyName,
    })

    if (!bookingResult.success || !bookingResult.bookingId) {
      return { success: false, error: bookingResult.error ?? 'Kunde inte skapa bokning' }
    }

    // Update action: approved
    const { error: updateError } = await supabase
      .from('agent_actions')
      .update({
        status: 'approved',
        resolved_at: new Date().toISOString(),
        booking_request_id: bookingResult.bookingId,
      })
      .eq('id', actionId)

    if (updateError) {
      logger.error('Failed to update action', { updateError })
      return { success: false, error: 'Kunde inte uppdatera åtgärden' }
    }

    // Update conversation: completed
    await supabase
      .from('agent_conversations')
      .update({ status: 'completed' })
      .eq('id', action.conversation_id)

    // Notify customer if we have their id
    if (conversation.customer_id) {
      await dispatchNotification({
        recipient: conversation.customer_id,
        category: 'agent_booking_approval',
        headline: 'Bokning godkänd',
        body: `Din bokning av ${venue.name} den ${summary.date} har godkänts.`,
        reference: { kind: 'booking', id: bookingResult.bookingId },
        author: user.id,
        extra: {
          venue_name: venue.name,
          event_date: summary.date,
          event_type: summary.eventType,
        },
      })
    }

    // Broadcast update on Realtime channel
    const channel = supabase.channel(`agent:${action.conversation_id}`)
    await channel.send({
      type: 'broadcast',
      event: 'action_update',
      payload: { actionId, status: 'approved', bookingId: bookingResult.bookingId },
    })
    await supabase.removeChannel(channel)

    return { success: true, bookingId: bookingResult.bookingId }
  } catch (error) {
    logger.error('Error approving action', { error })
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
