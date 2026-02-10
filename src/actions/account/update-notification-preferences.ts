'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface NotificationPreferencesData {
  email_booking_request?: boolean
  email_booking_accepted?: boolean
  email_new_message?: boolean
  email_new_match?: boolean
  email_reminders?: boolean
}

export async function updateNotificationPreferences(data: NotificationPreferencesData): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Check if preferences exist
    const { data: existing } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      // Update existing preferences
      const { error: updateError } = await supabase
        .from('notification_preferences')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error updating notification preferences:', updateError)
        return { success: false, error: 'Kunde inte uppdatera aviseringsinställningar' }
      }
    } else {
      // Insert new preferences
      const { error: insertError } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: user.id,
          ...data,
        })

      if (insertError) {
        console.error('Error inserting notification preferences:', insertError)
        return { success: false, error: 'Kunde inte spara aviseringsinställningar' }
      }
    }

    revalidatePath('/account/settings')

    return { success: true }
  } catch (error) {
    console.error('Unexpected error updating notification preferences:', error)
    return {
      success: false,
      error: 'Ett ovantat fel uppstod',
    }
  }
}

export async function getNotificationPreferences(): Promise<{
  success: boolean
  preferences?: NotificationPreferencesData
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching notification preferences:', error)
      return { success: false, error: 'Kunde inte hämta aviseringsinställningar' }
    }

    // Return defaults if no preferences exist
    const defaultPreferences: NotificationPreferencesData = {
      email_booking_request: true,
      email_booking_accepted: true,
      email_new_message: true,
      email_new_match: true,
      email_reminders: true,
    }

    return {
      success: true,
      preferences: preferences || defaultPreferences,
    }
  } catch (error) {
    console.error('Unexpected error fetching notification preferences:', error)
    return {
      success: false,
      error: 'Ett ovantat fel uppstod',
    }
  }
}
