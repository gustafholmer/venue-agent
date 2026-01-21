'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// UUID format validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function saveVenue(venueId: string): Promise<{
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
      return { success: false, error: 'Du maste vara inloggad for att spara lokaler' }
    }

    // Check if already saved
    const { data: existing } = await supabase
      .from('saved_venues')
      .select('id')
      .eq('customer_id', user.id)
      .eq('venue_id', venueId)
      .single()

    if (existing) {
      return { success: true } // Already saved, treat as success
    }

    // Save the venue
    const { error: insertError } = await supabase
      .from('saved_venues')
      .insert({
        customer_id: user.id,
        venue_id: venueId,
      })

    if (insertError) {
      console.error('Error saving venue:', insertError)
      return { success: false, error: 'Kunde inte spara lokalen' }
    }

    revalidatePath('/account/saved')
    revalidatePath(`/venues/${venueId}`)

    return { success: true }
  } catch (error) {
    console.error('Unexpected error saving venue:', error)
    return {
      success: false,
      error: 'Ett ovantat fel uppstod',
    }
  }
}
