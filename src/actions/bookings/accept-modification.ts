'use server'

import { createClient } from '@/lib/supabase/server'
import { dispatchNotification } from '@/lib/notifications/create-notification'
import { revalidatePath } from 'next/cache'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface AcceptModificationResult {
  success: boolean
  error?: string
}

export async function acceptModification(
  modificationId: string
): Promise<AcceptModificationResult> {
  try {
    const supabase = await createClient()

    if (!UUID_REGEX.test(modificationId)) {
      return { success: false, error: 'Ogiltigt ändrings-ID' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Fetch modification with booking and venue
    const { data: modification, error: modError } = await supabase
      .from('booking_modifications')
      .select(`
        *,
        booking:booking_requests!inner(
          *,
          venue:venues!inner(
            id,
            name,
            owner_id
          )
        )
      `)
      .eq('id', modificationId)
      .single()

    if (modError || !modification) {
      return { success: false, error: 'Ändringsförslaget hittades inte' }
    }

    if (modification.status !== 'pending') {
      return { success: false, error: 'Ändringsförslaget är inte längre aktivt' }
    }

    const booking = modification.booking as unknown as {
      id: string
      venue_id: string
      event_date: string
      customer_id: string | null
      customer_name: string
      status: string
      venue: { id: string; name: string; owner_id: string }
    }

    // The acceptor must be the OTHER party (not the proposer)
    const isCustomer = booking.customer_id === user.id
    const isOwner = booking.venue.owner_id === user.id
    if (!isCustomer && !isOwner) {
      return { success: false, error: 'Du har inte behörighet' }
    }
    if (modification.proposed_by === user.id) {
      return { success: false, error: 'Du kan inte godkänna ditt eget förslag' }
    }

    // If date is changing on an accepted booking, handle calendar
    if (modification.proposed_event_date && booking.status === 'accepted') {
      const newDate = modification.proposed_event_date

      // Check new date is not blocked
      const { data: blockedDate } = await supabase
        .from('venue_blocked_dates')
        .select('id')
        .eq('venue_id', booking.venue_id)
        .eq('blocked_date', newDate)
        .single()

      if (blockedDate) {
        return { success: false, error: 'Det nya datumet är inte längre tillgängligt' }
      }

      // Check no other accepted booking on new date
      const { data: existingBooking } = await supabase
        .from('booking_requests')
        .select('id')
        .eq('venue_id', booking.venue_id)
        .eq('event_date', newDate)
        .eq('status', 'accepted')
        .neq('id', booking.id)
        .single()

      if (existingBooking) {
        return { success: false, error: 'Det nya datumet är inte längre tillgängligt' }
      }

      // Remove old blocked date
      await supabase
        .from('venue_blocked_dates')
        .delete()
        .eq('venue_id', booking.venue_id)
        .eq('blocked_date', booking.event_date)
        .eq('reason', `Bokning: ${booking.customer_name}`)

      // Insert new blocked date
      await supabase
        .from('venue_blocked_dates')
        .insert({
          venue_id: booking.venue_id,
          blocked_date: newDate,
          reason: `Bokning: ${booking.customer_name}`,
        })
    }

    // Build update object with only non-null proposed fields
    const bookingUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (modification.proposed_event_date) {
      bookingUpdate.event_date = modification.proposed_event_date
    }
    if (modification.proposed_start_time) {
      bookingUpdate.start_time = modification.proposed_start_time
    }
    if (modification.proposed_end_time) {
      bookingUpdate.end_time = modification.proposed_end_time
    }
    if (modification.proposed_guest_count !== null) {
      bookingUpdate.guest_count = modification.proposed_guest_count
    }
    if (modification.proposed_base_price !== null) {
      bookingUpdate.base_price = modification.proposed_base_price
      bookingUpdate.platform_fee = modification.proposed_platform_fee
      bookingUpdate.total_price = modification.proposed_total_price
      bookingUpdate.venue_payout = modification.proposed_venue_payout
    }

    // Update the booking
    const { error: updateError } = await supabase
      .from('booking_requests')
      .update(bookingUpdate)
      .eq('id', booking.id)

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return { success: false, error: 'Kunde inte uppdatera bokningen' }
    }

    // Mark modification as accepted
    const { error: modUpdateError } = await supabase
      .from('booking_modifications')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', modificationId)

    if (modUpdateError) {
      console.error('Error updating modification status:', modUpdateError)
    }

    // Notify the proposer
    await dispatchNotification({
      recipient: modification.proposed_by,
      category: 'booking_modification_accepted',
      headline: 'Ändringsförslag godkänt',
      body: `Ditt ändringsförslag för bokningen av ${booking.venue.name} har godkänts.`,
      reference: { kind: 'booking', id: booking.id },
      author: user.id,
      extra: {
        venue_name: booking.venue.name,
        event_date: modification.proposed_event_date || booking.event_date,
      },
    })

    revalidatePath('/account/bookings')
    revalidatePath(`/account/bookings/${booking.id}`)
    revalidatePath('/dashboard/bookings')
    revalidatePath(`/dashboard/bookings/${booking.id}`)

    return { success: true }
  } catch (error) {
    console.error('Unexpected error accepting modification:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
