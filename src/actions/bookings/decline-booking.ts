'use server'

import { createClient } from '@/lib/supabase/server'
import { dispatchNotification } from '@/lib/notifications/create-notification'

// UUID format validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface DeclineBookingResult {
  success: boolean
  error?: string
}

export async function declineBooking(
  bookingId: string,
  declineReason: string
): Promise<DeclineBookingResult> {
  try {
    const supabase = await createClient()

    // Validate UUID format to prevent injection
    if (!UUID_REGEX.test(bookingId)) {
      return { success: false, error: 'Ogiltigt boknings-ID' }
    }

    // Validate decline reason
    if (!declineReason?.trim()) {
      return { success: false, error: 'Ange en anledning till nekandet' }
    }

    if (declineReason.length > 500) {
      return { success: false, error: 'Anledningen får max vara 500 tecken' }
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Get the booking with venue info
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

    // Verify the current user owns this venue
    const venue = booking.venue as { id: string; name: string; owner_id: string }
    if (venue.owner_id !== user.id) {
      return { success: false, error: 'Du har inte behörighet att hantera denna bokning' }
    }

    // Check if booking is still pending
    if (booking.status !== 'pending') {
      const statusMap: Record<string, string> = {
        accepted: 'redan godkänd',
        declined: 'redan nekad',
        cancelled: 'avbokad',
        completed: 'genomförd',
        paid_out: 'utbetald',
      }
      return {
        success: false,
        error: `Denna bokning är ${statusMap[booking.status] || booking.status}`,
      }
    }

    // Update booking status to declined
    const { error: updateError } = await supabase
      .from('booking_requests')
      .update({
        status: 'declined',
        decline_reason: declineReason.trim(),
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    if (updateError) {
      console.error('Error declining booking:', updateError)
      return { success: false, error: 'Kunde inte neka bokningen' }
    }

    // Clean up any pending modification
    await supabase
      .from('booking_modifications')
      .delete()
      .eq('booking_request_id', bookingId)
      .eq('status', 'pending')

    // Create notification for customer (if they have an account)
    if (booking.customer_id) {
      await dispatchNotification({
        recipient: booking.customer_id,
        category: 'booking_declined',
        headline: 'Bokningsförfrågan nekad',
        body: `Din bokning av ${venue.name} den ${formatDate(booking.event_date)} har nekats.`,
        reference: { kind: 'booking', id: booking.id },
        author: user.id,
        extra: {
          venue_name: venue.name,
          event_date: booking.event_date,
          decline_reason: declineReason.trim(),
        },
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error declining booking:', error)
    return {
      success: false,
      error: 'Ett ovantat fel uppstod',
    }
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
