'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo-mode'

export interface UnpublishVenueResult {
  success: boolean
  error?: string
}

export async function unpublishVenue(venueId: string): Promise<UnpublishVenueResult> {
  if (isDemoMode()) {
    return { success: true }
  }

  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return {
        success: false,
        error: 'Du maste vara inloggad',
      }
    }

    // Get venue
    const { data: venue } = await supabase
      .from('venues')
      .select('id')
      .eq('id', venueId)
      .eq('owner_id', user.id)
      .single()

    if (!venue) {
      return {
        success: false,
        error: 'Ingen lokal hittades',
      }
    }

    // Set status to paused
    const { error } = await supabase
      .from('venues')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString(),
      })
      .eq('id', venue.id)

    if (error) {
      logger.error('Error pausing venue', { error })
      return {
        success: false,
        error: 'Kunde inte pausa lokalen',
      }
    }

    return { success: true }
  } catch (error) {
    logger.error('Unexpected error in unpublishVenue', { error })
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
