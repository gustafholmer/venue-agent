'use server'

import { revalidatePath } from 'next/cache'

export async function requestViewing(listingId: string, message?: string) {
  const { createClient } = await import('@/lib/supabase/server')
  const { isDemoMode } = await import('@/lib/demo-mode')

  if (isDemoMode()) {
    return { success: true, demo: true }
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Du måste vara inloggad för att boka visning' }
  }

  // Get listing with mäklare info
  const { data: listing } = await supabase
    .from('listings')
    .select('id, maklare_id')
    .eq('id', listingId)
    .single()

  if (!listing) {
    return { error: 'Objektet hittades inte' }
  }

  // Check if already booked
  const { data: existingBooking } = await supabase
    .from('bookings')
    .select('id')
    .eq('buyer_id', user.id)
    .eq('listing_id', listingId)
    .single()

  if (existingBooking) {
    return { error: 'Du har redan begärt visning för detta objekt' }
  }

  // Create booking
  const { error } = await supabase
    .from('bookings')
    .insert({
      buyer_id: user.id,
      listing_id: listingId,
      maklare_id: listing.maklare_id,
      buyer_message: message,
      status: 'pending',
    })

  if (error) {
    console.error('Error creating booking:', error)
    return { error: 'Kunde inte skapa bokningen' }
  }

  revalidatePath('/results')
  return { success: true }
}
