'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'

export interface MarkMessagesReadResult {
  success: boolean
  markedCount?: number
  error?: string
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Mark all unread messages in a thread as read for the current user.
 * Only marks messages that were NOT sent by the current user.
 */
export async function markMessagesAsRead(
  threadId: string,
  beforeTimestamp?: string,
  threadType: 'booking' | 'inquiry' = 'booking'
): Promise<MarkMessagesReadResult> {
  try {
    const supabase = await createClient()

    // Validate UUID format
    if (!UUID_REGEX.test(threadId)) {
      return { success: false, error: threadType === 'inquiry' ? 'Ogiltigt förfrågnings-ID' : 'Ogiltigt boknings-ID' }
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    if (threadType === 'inquiry') {
      return await markInquiryMessagesAsRead(supabase, threadId, user.id, beforeTimestamp)
    }

    return await markBookingMessagesAsRead(supabase, threadId, user.id, beforeTimestamp)
  } catch (error) {
    logger.error('Unexpected error marking messages as read', { error })
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}

async function markBookingMessagesAsRead(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookingId: string,
  userId: string,
  beforeTimestamp?: string
): Promise<MarkMessagesReadResult> {
  // Verify user has access to this booking
  const { data: booking, error: bookingError } = await supabase
    .from('booking_requests')
    .select(`
      id,
      customer_id,
      venue:venues!inner(owner_id)
    `)
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) {
    return { success: false, error: 'Bokningen hittades inte' }
  }

  const venue = booking.venue as unknown as { owner_id: string }
  const isCustomer = booking.customer_id === userId
  const isVenueOwner = venue.owner_id === userId

  if (!isCustomer && !isVenueOwner) {
    return { success: false, error: 'Du har inte behörighet' }
  }

  // Build the update query
  let query = supabase
    .from('messages')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('booking_request_id', bookingId)
    .eq('is_read', false)
    .neq('sender_id', userId) // Don't mark own messages

  // Optionally filter by timestamp
  if (beforeTimestamp) {
    query = query.lte('created_at', beforeTimestamp)
  }

  const { data: updated, error: updateError } = await query.select('id')

  if (updateError) {
    logger.error('Error marking messages as read', { updateError })
    return { success: false, error: 'Kunde inte markera meddelanden som lästa' }
  }

  return {
    success: true,
    markedCount: updated?.length || 0,
  }
}

async function markInquiryMessagesAsRead(
  supabase: Awaited<ReturnType<typeof createClient>>,
  inquiryId: string,
  userId: string,
  beforeTimestamp?: string
): Promise<MarkMessagesReadResult> {
  // Verify user has access to this inquiry
  const { data: inquiry, error: inquiryError } = await supabase
    .from('venue_inquiries')
    .select(`
      id,
      user_id,
      venue:venues!inner(owner_id)
    `)
    .eq('id', inquiryId)
    .single()

  if (inquiryError || !inquiry) {
    return { success: false, error: 'Förfrågan hittades inte' }
  }

  const venue = inquiry.venue as unknown as { owner_id: string }
  const isInquiryCreator = inquiry.user_id === userId
  const isVenueOwner = venue.owner_id === userId

  if (!isInquiryCreator && !isVenueOwner) {
    return { success: false, error: 'Du har inte behörighet' }
  }

  // Build the update query
  let query = supabase
    .from('messages')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('venue_inquiry_id', inquiryId)
    .eq('is_read', false)
    .neq('sender_id', userId) // Don't mark own messages

  // Optionally filter by timestamp
  if (beforeTimestamp) {
    query = query.lte('created_at', beforeTimestamp)
  }

  const { data: updated, error: updateError } = await query.select('id')

  if (updateError) {
    logger.error('Error marking messages as read', { updateError })
    return { success: false, error: 'Kunde inte markera meddelanden som lästa' }
  }

  return {
    success: true,
    markedCount: updated?.length || 0,
  }
}

/**
 * Get the count of unread messages for a thread.
 */
export async function getUnreadCount(
  threadId: string,
  threadType: 'booking' | 'inquiry' = 'booking'
): Promise<number> {
  try {
    const supabase = await createClient()

    // Validate UUID format
    if (!UUID_REGEX.test(threadId)) {
      return 0
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return 0
    }

    const fkColumn = threadType === 'inquiry' ? 'venue_inquiry_id' : 'booking_request_id'

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq(fkColumn, threadId)
      .eq('is_read', false)
      .neq('sender_id', user.id)

    if (error) {
      logger.error('Error getting unread count', { error })
      return 0
    }

    return count || 0
  } catch (error) {
    logger.error('Unexpected error getting unread count', { error })
    return 0
  }
}
