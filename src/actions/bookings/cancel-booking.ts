'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { dispatchNotification } from '@/lib/notifications/create-notification'
import { syncToCalendar } from '@/lib/calendar/sync'

// UUID format validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function cancelBooking(bookingId: string, reason?: string): Promise<{
  success: boolean
  error?: string
  calendarSyncFailed?: boolean
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

    // Clean up any pending modification
    await supabase
      .from('booking_modifications')
      .delete()
      .eq('booking_request_id', bookingId)
      .eq('status', 'pending')

    // If the booking was accepted, unblock the date in the calendar
    if (booking.status === 'accepted') {
      await supabase
        .from('venue_blocked_dates')
        .delete()
        .eq('venue_id', booking.venue_id)
        .eq('blocked_date', booking.event_date)
        .eq('reason', `Bokning: ${booking.customer_name}`)
    }

    // Sync deletion to external calendar
    let calendarSyncFailed: boolean | undefined
    if (booking.status === 'accepted') {
      const syncResult = await syncToCalendar(booking.venue_id, {
        entityType: 'booking',
        entityId: booking.id,
        action: 'delete',
      })
      calendarSyncFailed = syncResult.calendarSyncFailed
    }

    // Create notification for the venue owner
    const venueOwnerId = (booking.venue as unknown as { owner_id: string }).owner_id
    const venueName = (booking.venue as unknown as { name: string }).name

    await dispatchNotification({
      recipient: venueOwnerId,
      category: 'booking_cancelled',
      headline: 'Bokning avbokad',
      body: `${booking.customer_name} har avbokat bokningen för ${venueName} den ${new Date(booking.event_date).toLocaleDateString('sv-SE')}.`,
      reference: { kind: 'booking', id: bookingId },
      author: user.id,
      extra: {
        customer_name: booking.customer_name,
        venue_name: venueName,
        event_date: booking.event_date,
      },
    })

    revalidatePath('/account/bookings')
    revalidatePath(`/account/bookings/${bookingId}`)
    revalidatePath(`/dashboard/venue/${booking.venue_id}/bookings`)
    revalidatePath(`/dashboard/venue/${booking.venue_id}/bookings/${bookingId}`)

    return { success: true, calendarSyncFailed }
  } catch (error) {
    console.error('Unexpected error cancelling booking:', error)
    return {
      success: false,
      error: 'Ett ovantat fel uppstod',
    }
  }
}
