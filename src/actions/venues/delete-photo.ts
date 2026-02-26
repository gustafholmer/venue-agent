'use server'

import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo-mode'
import { revalidatePath } from 'next/cache'

export async function deletePhoto(venueId: string, photoId: string) {
  if (isDemoMode()) {
    return { success: false, error: 'Demo mode - deletion disabled' }
  }

  try {
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
      .eq('id', venueId)
      .eq('owner_id', user.id)
      .single()

    if (!venue) {
      return { success: false, error: 'Ingen lokal hittad' }
    }

    // Get photo to delete (verify it belongs to user's venue)
    const { data: photo } = await supabase
      .from('venue_photos')
      .select('id, url, is_primary, venue_id')
      .eq('id', photoId)
      .eq('venue_id', venue.id)
      .single()

    if (!photo) {
      return { success: false, error: 'Bilden hittades inte' }
    }

    // Extract storage path from URL
    const urlParts = photo.url.split('/venue-photos/')
    const storagePath = urlParts[1] || null

    // Delete from Supabase Storage
    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from('venue-photos')
        .remove([storagePath])

      if (storageError) {
        console.error('Storage delete error:', storageError)
        // Continue to delete from database even if storage fails
      }
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('venue_photos')
      .delete()
      .eq('id', photoId)

    if (dbError) {
      console.error('Database delete error:', dbError)
      return { success: false, error: 'Kunde inte ta bort bilden' }
    }

    // If deleted photo was primary, set another photo as primary
    if (photo.is_primary) {
      const { data: remainingPhotos } = await supabase
        .from('venue_photos')
        .select('id')
        .eq('venue_id', venue.id)
        .order('sort_order', { ascending: true })
        .limit(1)

      if (remainingPhotos && remainingPhotos.length > 0) {
        await supabase
          .from('venue_photos')
          .update({ is_primary: true })
          .eq('id', remainingPhotos[0].id)
      }
    }

    revalidatePath(`/dashboard/venue/${venueId}`)
    return { success: true }
  } catch (error) {
    console.error('Unexpected error in deletePhoto:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
