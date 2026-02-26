'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// UUID format validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function cancelBooking(bookingId: string, reason?: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Validate UUID format
    if (!UUID_REGEX.test(bookingId)) {
      return { success: false, error: 'Ogiltigt boknings-ID' }
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Get the booking
    const { data: booking, error: bookingError } = await supabase
      .from('booking_requests')
      .select(`
        *,
        venue:venues!inner(
          id,
          name,
          owner_id
        )
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return { success: false, error: 'Bokningen hittades inte' }
    }

    // Check authorization - only the customer who made the booking can cancel
    if (booking.customer_id !== user.id) {
      return { success: false, error: 'Du har inte behörighet att avboka denna bokning' }
    }

    // Check if booking can be cancelled (only pending or accepted bookings)
    if (!['pending', 'accepted'].includes(booking.status)) {
      return { success: false, error: 'Denna bokning kan inte avbokas' }
    }

    // Update the booking status
    const { error: updateError } = await supabase
      .from('booking_requests')
      .update({
        status: 'cancelled',
        decline_reason: reason || 'Avbokad av kund',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    if (updateError) {
      console.error('Error cancelling booking:', updateError)
      return { success: false, error: 'Kunde inte avboka bokningen' }
    }

    // If the booking was accepted, unblock the date in the calendar
    if (booking.status === 'accepted') {
      await supabase
        .from('venue_blocked_dates')
        .delete()
        .eq('venue_id', booking.venue_id)
        .eq('blocked_date', booking.event_date)
        .eq('reason', `Bokning: ${bookingId}`)
    }

    // Create notification for the venue owner
    const venueOwnerId = (booking.venue as unknown as { owner_id: string }).owner_id
    const venueName = (booking.venue as unknown as { name: string }).name

    await supabase.from('notifications').insert({
      user_id: venueOwnerId,
      type: 'booking_cancelled',
      title: 'Bokning avbokad',
      message: `${booking.customer_name} har avbokat bokningen for ${venueName} den ${new Date(booking.event_date).toLocaleDateString('sv-SE')}.`,
      entity_type: 'booking',
      entity_id: bookingId,
    })

    revalidatePath('/account/bookings')
    revalidatePath(`/account/bookings/${bookingId}`)
    revalidatePath(`/dashboard/venue/${booking.venue_id}/bookings`)
    revalidatePath(`/dashboard/venue/${booking.venue_id}/bookings/${bookingId}`)

    return { success: true }
  } catch (error) {
    console.error('Unexpected error cancelling booking:', error)
    return {
      success: false,
      error: 'Ett ovantat fel uppstod',
    }
  }
}
