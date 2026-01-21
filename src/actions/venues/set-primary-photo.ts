'use server'

import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo-mode'
import { revalidatePath } from 'next/cache'

export async function setPrimaryPhoto(photoId: string) {
  if (isDemoMode()) {
    return { success: false, error: 'Demo mode - updates disabled' }
  }

  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Ej inloggad' }
  }

  // Get venue owned by user
  const { data: venue } = await supabase
    .from('venues')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!venue) {
    return { success: false, error: 'Ingen lokal hittad' }
  }

  // Verify the photo belongs to user's venue
  const { data: photo } = await supabase
    .from('venue_photos')
    .select('id')
    .eq('id', photoId)
    .eq('venue_id', venue.id)
    .single()

  if (!photo) {
    return { success: false, error: 'Bilden hittades inte' }
  }

  // Set all photos for this venue to non-primary
  const { error: resetError } = await supabase
    .from('venue_photos')
    .update({ is_primary: false })
    .eq('venue_id', venue.id)

  if (resetError) {
    console.error('Error resetting primary photos:', resetError)
    return { success: false, error: 'Kunde inte uppdatera bilder' }
  }

  // Set the selected photo as primary
  const { error: updateError } = await supabase
    .from('venue_photos')
    .update({ is_primary: true })
    .eq('id', photoId)

  if (updateError) {
    console.error('Error setting primary photo:', updateError)
    return { success: false, error: 'Kunde inte satta primarbild' }
  }

  revalidatePath('/dashboard/venue/photos')
  return { success: true }
}
