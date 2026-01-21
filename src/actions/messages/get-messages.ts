'use server'

import { createClient } from '@/lib/supabase/server'
import type { Message, Profile } from '@/types/database'

export interface MessageWithSender extends Message {
  sender: {
    id: string
    full_name: string | null
    email: string
  }
}

export interface GetMessagesResult {
  success: boolean
  messages?: MessageWithSender[]
  error?: string
}

// UUID format validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getMessages(bookingId: string): Promise<GetMessagesResult> {
  try {
    const supabase = await createClient()

    // Validate UUID format to prevent injection
    if (!UUID_REGEX.test(bookingId)) {
      return { success: false, error: 'Ogiltigt boknings-ID' }
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Get the booking to verify access
    const { data: booking, error: bookingError } = await supabase
      .from('booking_requests')
      .select(`
        id,
        customer_id,
        venue:venues!inner(
          owner_id
        )
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return { success: false, error: 'Bokningen hittades inte' }
    }

    // Verify current user is a participant (customer or venue owner)
    const venue = booking.venue as unknown as { owner_id: string }
    const isCustomer = booking.customer_id === user.id
    const isVenueOwner = venue.owner_id === user.id

    if (!isCustomer && !isVenueOwner) {
      return { success: false, error: 'Du har inte behörighet att se dessa meddelanden' }
    }

    // Fetch messages with sender info (oldest first)
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id(
          id,
          full_name,
          email
        )
      `)
      .eq('booking_request_id', bookingId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return { success: false, error: 'Kunde inte hämta meddelanden' }
    }

    // Mark unread messages sent TO current user as read
    const unreadMessageIds = (messages || [])
      .filter(msg => !msg.is_read && msg.sender_id !== user.id)
      .map(msg => msg.id)

    if (unreadMessageIds.length > 0) {
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', unreadMessageIds)

      if (updateError) {
        // Log but don't fail - messages are still readable
        console.error('Error marking messages as read:', updateError)
      }
    }

    // Transform messages to include sender info properly
    const messagesWithSender: MessageWithSender[] = (messages || []).map(msg => ({
      ...msg,
      sender: msg.sender as { id: string; full_name: string | null; email: string },
    }))

    return {
      success: true,
      messages: messagesWithSender,
    }
  } catch (error) {
    console.error('Unexpected error fetching messages:', error)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod',
    }
  }
}
