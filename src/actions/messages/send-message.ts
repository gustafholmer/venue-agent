'use server'

import { createClient } from '@/lib/supabase/server'
import { dispatchNotification } from '@/lib/notifications/create-notification'
import { trackEvent } from '@/lib/analytics'
import type { Message } from '@/types/database'

export interface SendMessageResult {
  success: boolean
  message?: Message
  error?: string
}

// UUID format validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function sendMessage(
  bookingId: string,
  content: string
): Promise<SendMessageResult> {
  try {
    const supabase = await createClient()

    // Validate UUID format to prevent injection
    if (!UUID_REGEX.test(bookingId)) {
      return { success: false, error: 'Ogiltigt boknings-ID' }
    }

    // Validate content
    const trimmedContent = content?.trim()
    if (!trimmedContent) {
      return { success: false, error: 'Meddelandet kan inte vara tomt' }
    }

    if (trimmedContent.length > 5000) {
      return { success: false, error: 'Meddelandet får max vara 5000 tecken' }
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Get current user's profile for name
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const senderName = senderProfile?.full_name || 'Användare'

    // Get the booking to verify access and get recipient info
    const { data: booking, error: bookingError } = await supabase
      .from('booking_requests')
      .select(`
        id,
        customer_id,
        customer_name,
        venue:venues!inner(
          name,
          owner_id
        )
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return { success: false, error: 'Bokningen hittades inte' }
    }

    // Verify current user is a participant (customer or venue owner)
    const venue = booking.venue as unknown as { name: string; owner_id: string }
    const isCustomer = booking.customer_id === user.id
    const isVenueOwner = venue.owner_id === user.id

    if (!isCustomer && !isVenueOwner) {
      return { success: false, error: 'Du har inte behörighet att skicka meddelanden för denna bokning' }
    }

    // Determine recipient
    const recipientId = isCustomer ? venue.owner_id : booking.customer_id

    // Create the message
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        booking_request_id: bookingId,
        sender_id: user.id,
        content: trimmedContent,
        is_read: false,
      })
      .select()
      .single()

    if (insertError || !message) {
      console.error('Error creating message:', insertError)
      return { success: false, error: 'Kunde inte skicka meddelandet' }
    }

    // Create notification for recipient (if they have an account)
    if (recipientId) {
      await dispatchNotification({
        recipient: recipientId,
        category: 'new_message',
        headline: 'Nytt meddelande',
        body: `${senderName} har skickat ett meddelande angående bokningen på ${venue.name}`,
        reference: { kind: 'booking', id: bookingId },
        author: user.id,
        extra: {
          venue_name: venue.name,
          sender_name: senderName,
          message_preview: trimmedContent.slice(0, 100),
        },
      })
    }

    trackEvent('message_sent', { booking_id: bookingId }, user.id)

    return {
      success: true,
      message,
    }
  } catch (error) {
    console.error('Unexpected error sending message:', error)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod',
    }
  }
}
