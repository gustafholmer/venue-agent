'use server'

import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo-mode'
import { revalidatePath } from 'next/cache'

interface PhotoOrder {
  id: string
  sort_order: number
}

export async function reorderPhotos(venueId: string, photoOrders: PhotoOrder[]) {
  if (isDemoMode()) {
    return { success: false, error: 'Demo mode - reordering disabled' }
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

    // Verify all photos belong to user's venue
    const photoIds = photoOrders.map(p => p.id)
    const { data: photos, error: fetchError } = await supabase
      .from('venue_photos')
      .select('id')
      .eq('venue_id', venue.id)
      .in('id', photoIds)

    if (fetchError || !photos) {
      return { success: false, error: 'Kunde inte verifiera bilder' }
    }

    if (photos.length !== photoIds.length) {
      return { success: false, error: 'Vissa bilder tillhor inte din lokal' }
    }

    // Update sort orders
    const updatePromises = photoOrders.map(({ id, sort_order }) =>
      supabase
        .from('venue_photos')
        .update({ sort_order })
        .eq('id', id)
    )

    const results = await Promise.all(updatePromises)
    const hasError = results.some(result => result.error)

    if (hasError) {
      console.error('Error updating photo orders:', results)
      return { success: false, error: 'Kunde inte uppdatera ordningen' }
    }

    revalidatePath(`/dashboard/venue/${venueId}`)
    return { success: true }
  } catch (error) {
    console.error('Unexpected error in reorderPhotos:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
