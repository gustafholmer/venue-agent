'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'
import { dispatchNotification } from '@/lib/notifications/create-notification'
import { syncToCalendar } from '@/lib/calendar/sync'
import { updateContactBookingCompleted } from '@/actions/contacts/upsert-contact'

// UUID format validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface AcceptBookingResult {
  success: boolean
  error?: string
  calendarSyncFailed?: boolean
}

export async function acceptBooking(bookingId: string): Promise<AcceptBookingResult> {
  try {
    const supabase = await createClient()

    // Validate UUID format to prevent injection
    if (!UUID_REGEX.test(bookingId)) {
      return { success: false, error: 'Ogiltigt boknings-ID' }
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

    // Check if the date is already blocked
    const { data: blockedDate } = await supabase
      .from('venue_blocked_dates')
      .select('id')
      .eq('venue_id', booking.venue_id)
      .eq('blocked_date', booking.event_date)
      .single()

    if (blockedDate) {
      return { success: false, error: 'Detta datum är blockerat i kalendern' }
    }

    // Check if there's another accepted booking on the same date
    const { data: existingBooking } = await supabase
      .from('booking_requests')
      .select('id')
      .eq('venue_id', booking.venue_id)
      .eq('event_date', booking.event_date)
      .eq('status', 'accepted')
      .neq('id', bookingId)
      .single()

    if (existingBooking) {
      return { success: false, error: 'Det finns redan en godkänd bokning på detta datum' }
    }

    // Update booking status to accepted
    const { error: updateError } = await supabase
      .from('booking_requests')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    if (updateError) {
      logger.error('Error accepting booking', { updateError })
      return { success: false, error: 'Kunde inte godkänna bokningen' }
    }

    // Update contact completed_bookings and total_spend
    await updateContactBookingCompleted(
      booking.venue_id,
      booking.customer_email,
      booking.total_price
    )

    // Block the date in venue calendar to prevent double bookings
    const { error: blockError } = await supabase
      .from('venue_blocked_dates')
      .insert({
        venue_id: booking.venue_id,
        blocked_date: booking.event_date,
        reason: `Bokning: ${booking.customer_name}`,
      })

    if (blockError) {
      // Log but don't fail - the booking is already accepted
      logger.error('Error blocking date after accepting booking', { blockError })
    }

    // Sync to external calendar
    const syncResult = await syncToCalendar(booking.venue_id, {
      entityType: 'booking',
      entityId: booking.id,
      action: 'create',
      event: {
        title: `Bokning: ${booking.customer_name}${booking.event_type ? ' – ' + booking.event_type : ''}`,
        description: [
          booking.event_type && `Typ: ${booking.event_type}`,
          booking.guest_count && `Antal gäster: ${booking.guest_count}`,
          booking.start_time && `Tid: ${booking.start_time}${booking.end_time ? '–' + booking.end_time : ''}`,
          booking.event_description,
        ].filter(Boolean).join('\n'),
        date: booking.event_date,
        status: 'confirmed',
      },
    })

    // Create notification for customer (if they have an account)
    if (booking.customer_id) {
      await dispatchNotification({
        recipient: booking.customer_id,
        category: 'booking_accepted',
        headline: 'Bokningsförfrågan godkänd!',
        body: `Din bokning av ${venue.name} den ${formatDate(booking.event_date)} har godkänts!`,
        reference: { kind: 'booking', id: booking.id },
        author: user.id,
        extra: {
          venue_name: venue.name,
          event_date: booking.event_date,
        },
      })
    }

    return { success: true, calendarSyncFailed: syncResult.calendarSyncFailed }
  } catch (error) {
    logger.error('Unexpected error accepting booking', { error })
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
