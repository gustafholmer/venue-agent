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

export async function getMessages(
  threadId: string,
  threadType: 'booking' | 'inquiry' = 'booking'
): Promise<GetMessagesResult> {
  try {
    const supabase = await createClient()

    // Validate UUID format to prevent injection
    if (!UUID_REGEX.test(threadId)) {
      return { success: false, error: threadType === 'inquiry' ? 'Ogiltigt förfrågnings-ID' : 'Ogiltigt boknings-ID' }
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    if (threadType === 'inquiry') {
      return await getInquiryMessages(supabase, threadId, user.id)
    }

    return await getBookingMessages(supabase, threadId, user.id)
  } catch (error) {
    console.error('Unexpected error fetching messages:', error)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod',
    }
  }
}

async function getBookingMessages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookingId: string,
  userId: string
): Promise<GetMessagesResult> {
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
  const isCustomer = booking.customer_id === userId
  const isVenueOwner = venue.owner_id === userId

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
  await markFetchedMessagesAsRead(supabase, messages || [], userId)

  // Transform messages to include sender info properly
  const messagesWithSender: MessageWithSender[] = (messages || []).map(msg => ({
    ...msg,
    sender: msg.sender as { id: string; full_name: string | null; email: string },
  }))

  return {
    success: true,
    messages: messagesWithSender,
  }
}

async function getInquiryMessages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  inquiryId: string,
  userId: string
): Promise<GetMessagesResult> {
  // Get the inquiry to verify access
  const { data: inquiry, error: inquiryError } = await supabase
    .from('venue_inquiries')
    .select(`
      id,
      user_id,
      venue:venues!inner(
        owner_id
      )
    `)
    .eq('id', inquiryId)
    .single()

  if (inquiryError || !inquiry) {
    return { success: false, error: 'Förfrågan hittades inte' }
  }

  // Verify current user is a participant (inquiry creator or venue owner)
  const venue = inquiry.venue as unknown as { owner_id: string }
  const isInquiryCreator = inquiry.user_id === userId
  const isVenueOwner = venue.owner_id === userId

  if (!isInquiryCreator && !isVenueOwner) {
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
    .eq('venue_inquiry_id', inquiryId)
    .order('created_at', { ascending: true })

  if (messagesError) {
    console.error('Error fetching messages:', messagesError)
    return { success: false, error: 'Kunde inte hämta meddelanden' }
  }

  // Mark unread messages sent TO current user as read
  await markFetchedMessagesAsRead(supabase, messages || [], userId)

  // Transform messages to include sender info properly
  const messagesWithSender: MessageWithSender[] = (messages || []).map(msg => ({
    ...msg,
    sender: msg.sender as { id: string; full_name: string | null; email: string },
  }))

  return {
    success: true,
    messages: messagesWithSender,
  }
}

/** Mark unread messages not sent by the current user as read. */
async function markFetchedMessagesAsRead(
  supabase: Awaited<ReturnType<typeof createClient>>,
  messages: Array<{ id: string; is_read: boolean; sender_id: string }>,
  userId: string
) {
  const unreadMessageIds = messages
    .filter(msg => !msg.is_read && msg.sender_id !== userId)
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
}
