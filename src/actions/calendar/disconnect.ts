'use server'
import { createClient } from '@/lib/supabase/server'

export async function disconnectCalendar(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Ej inloggad' }

    // Delete cascades to venue_calendar_mappings and calendar_sync_events
    const { error } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'google')

    if (error) {
      console.error('Failed to disconnect calendar:', error)
      return { success: false, error: 'Kunde inte koppla bort Google Kalender' }
    }
    return { success: true }
  } catch (error) {
    console.error('Failed to disconnect calendar:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
