'use server'

import { createClient } from '@/lib/supabase/server'

// UUID format validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface MarkNotificationsReadResult {
  success: boolean
  error?: string
}

/**
 * Mark specific notification(s) as read
 */
export async function markNotificationsRead(
  notificationIds: string[]
): Promise<MarkNotificationsReadResult> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Validate all IDs are valid UUIDs
    for (const id of notificationIds) {
      if (!UUID_REGEX.test(id)) {
        return { success: false, error: 'Ogiltigt notifierings-ID' }
      }
    }

    if (notificationIds.length === 0) {
      return { success: true } // Nothing to mark
    }

    // Mark notifications as read (RLS ensures user can only update their own)
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .in('id', notificationIds)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error marking notifications as read:', error)
      return { success: false, error: 'Kunde inte markera notifieringar som lästa' }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error marking notifications as read:', error)
    return {
      success: false,
      error: 'Ett ovantat fel uppstod',
    }
  }
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsRead(): Promise<MarkNotificationsReadResult> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Mark all unread notifications as read
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
      console.error('Error marking all notifications as read:', error)
      return { success: false, error: 'Kunde inte markera notifieringar som lästa' }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error marking all notifications as read:', error)
    return {
      success: false,
      error: 'Ett ovantat fel uppstod',
    }
  }
}
