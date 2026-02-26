'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'
import type { Notification } from '@/types/database'

export interface GetNotificationsResult {
  success: boolean
  notifications?: Notification[]
  unreadCount?: number
  error?: string
}

export async function getNotifications(limit: number = 20): Promise<GetNotificationsResult> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Fetch notifications for the user, newest first
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (notificationsError) {
      logger.error('Error fetching notifications', { notificationsError })
      return { success: false, error: 'Kunde inte hämta notifieringar' }
    }

    // Count unread notifications
    const { count: unreadCount, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (countError) {
      logger.error('Error counting unread notifications', { countError })
      // Don't fail the whole request, just log and continue
    }

    return {
      success: true,
      notifications: notifications || [],
      unreadCount: unreadCount ?? 0,
    }
  } catch (error) {
    logger.error('Unexpected error fetching notifications', { error })
    return {
      success: false,
      error: 'Ett ovantat fel uppstod',
    }
  }
}
