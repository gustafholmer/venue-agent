'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo-mode'

export async function getVenue(venueId: string): Promise<{
  success: boolean
  venue?: { id: string; name: string; status: string }
  error?: string
}> {
  try {
    if (isDemoMode()) {
      return {
        success: true,
        venue: { id: venueId, name: 'Demo-lokal', status: 'draft' },
      }
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Fetch venue with ownership check
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id, name, status')
      .eq('id', venueId)
      .eq('owner_id', user.id)
      .single()

    if (venueError || !venue) {
      return { success: false, error: 'Ingen lokal hittades' }
    }

    return { success: true, venue }
  } catch (error) {
    logger.error('Error fetching venue', { error })
    return { success: false, error: 'Ett ovantat fel uppstod' }
  }
}
