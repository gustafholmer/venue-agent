'use server'

import { createClient } from '@/lib/supabase/server'

export interface MarkMessagesReadResult {
  success: boolean
  markedCount?: number
  error?: string
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Mark all unread messages in a booking as read for the current user.
 * Only marks messages that were NOT sent by the current user.
 */
export async function markMessagesAsRead(
  bookingId: string,
  beforeTimestamp?: string
): Promise<MarkMessagesReadResult> {
  try {
    const supabase = await createClient()

    // Validate UUID format
    if (!UUID_REGEX.test(bookingId)) {
      return { success: false, error: 'Ogiltigt boknings-ID' }
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

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
    const isCustomer = booking.customer_id === user.id
    const isVenueOwner = venue.owner_id === user.id

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
      .neq('sender_id', user.id) // Don't mark own messages

    // Optionally filter by timestamp
    if (beforeTimestamp) {
      query = query.lte('created_at', beforeTimestamp)
    }

    const { data: updated, error: updateError } = await query.select('id')

    if (updateError) {
      console.error('Error marking messages as read:', updateError)
      return { success: false, error: 'Kunde inte markera meddelanden som lästa' }
    }

    return {
      success: true,
      markedCount: updated?.length || 0,
    }
  } catch (error) {
    console.error('Unexpected error marking messages as read:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}

/**
 * Get the count of unread messages for a booking.
 */
export async function getUnreadCount(bookingId: string): Promise<number> {
  try {
    const supabase = await createClient()

    // Validate UUID format
    if (!UUID_REGEX.test(bookingId)) {
      return 0
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return 0
    }

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('booking_request_id', bookingId)
      .eq('is_read', false)
      .neq('sender_id', user.id)

    if (error) {
      console.error('Error getting unread count:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Unexpected error getting unread count:', error)
    return 0
  }
}
