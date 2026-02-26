'use server'

import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

export async function updateVenueCalendarMapping(
  venueId: string,
  calendarId: string,
  syncEnabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Ej inloggad' }

    // Verify venue ownership
    const { data: venue } = await supabase
      .from('venues')
      .select('id')
      .eq('id', venueId)
      .eq('owner_id', user.id)
      .single()

    if (!venue) return { success: false, error: 'Lokalen hittades inte' }

    // Get the user's calendar connection
    const { data: connection } = await supabase
      .from('calendar_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .single()

    if (!connection) return { success: false, error: 'Ingen Google Kalender-koppling hittades' }

    // Upsert the mapping (venue_id is unique)
    const { error } = await supabase
      .from('venue_calendar_mappings')
      .upsert(
        {
          venue_id: venueId,
          connection_id: connection.id,
          external_calendar_id: calendarId,
          sync_enabled: syncEnabled,
        },
        { onConflict: 'venue_id' }
      )

    if (error) {
      logger.error('Failed to update venue calendar mapping', { error })
      return { success: false, error: 'Kunde inte uppdatera kalenderkopplingen' }
    }
    return { success: true }
  } catch (error) {
    logger.error('Failed to update venue calendar mapping', { error })
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
