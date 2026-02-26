'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'

/**
 * Checks if the current logged-in user has an existing inquiry or booking
 * with the given venue. Used to gate contact info on the venue detail page.
 */
export async function hasExistingThread(venueId: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return false
    }

    // Check for existing venue inquiry
    const { data: inquiry } = await supabase
      .from('venue_inquiries')
      .select('id')
      .eq('venue_id', venueId)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (inquiry) {
      return true
    }

    // Check for existing booking request
    const { data: booking } = await supabase
      .from('booking_requests')
      .select('id')
      .eq('venue_id', venueId)
      .eq('customer_id', user.id)
      .limit(1)
      .maybeSingle()

    if (booking) {
      return true
    }

    return false
  } catch (error) {
    logger.error('Error checking existing thread', { error })
    return false
  }
}
