'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// UUID format validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function unsaveVenue(venueId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Validate UUID format
    if (!UUID_REGEX.test(venueId)) {
      return { success: false, error: 'Ogiltigt lokal-ID' }
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Remove from saved venues
    const { error: deleteError } = await supabase
      .from('saved_venues')
      .delete()
      .eq('customer_id', user.id)
      .eq('venue_id', venueId)

    if (deleteError) {
      logger.error('Error unsaving venue', { deleteError })
      return { success: false, error: 'Kunde inte ta bort lokalen fran sparade' }
    }

    revalidatePath('/account/saved')
    revalidatePath(`/venues/${venueId}`)

    return { success: true }
  } catch (error) {
    logger.error('Unexpected error unsaving venue', { error })
    return {
      success: false,
      error: 'Ett ovantat fel uppstod',
    }
  }
}
