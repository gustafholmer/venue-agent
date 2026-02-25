'use server'

import { createClient } from '@/lib/supabase/server'
import { calculatePricing } from '@/lib/pricing'
import { dispatchNotification } from '@/lib/notifications/create-notification'
import { revalidatePath } from 'next/cache'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface ProposeModificationInput {
  bookingId: string
  proposedEventDate?: string
  proposedStartTime?: string
  proposedEndTime?: string
  proposedGuestCount?: number
  proposedBasePrice?: number
  reason?: string
}

export interface ProposeModificationResult {
  success: boolean
  modificationId?: string
  error?: string
}

export async function proposeModification(
  input: ProposeModificationInput
): Promise<ProposeModificationResult> {
  try {
    const supabase = await createClient()

    if (!UUID_REGEX.test(input.bookingId)) {
      return { success: false, error: 'Ogiltigt boknings-ID' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Fetch booking with venue
    const { data: booking, error: bookingError } = await supabase
      .from('booking_requests')
      .select(`
        *,
        venue:venues!inner(
          id,
          name,
          owner_id,
          max_guests
        )
      `)
      .eq('id', input.bookingId)
      .single()

    if (bookingError || !booking) {
      return { success: false, error: 'Bokningen hittades inte' }
    }

    const venue = booking.venue as unknown as {
      id: string; name: string; owner_id: string; max_guests: number | null
    }

    // Check authorization — must be customer or venue owner
    const isCustomer = booking.customer_id === user.id
    const isOwner = venue.owner_id === user.id
    if (!isCustomer && !isOwner) {
      return { success: false, error: 'Du har inte behörighet att ändra denna bokning' }
    }

    // Customers cannot propose price changes — only venue owners can
    if (isCustomer && input.proposedBasePrice !== undefined) {
      return { success: false, error: 'Bara lokalägaren kan föreslå prisändringar' }
    }

    // Check booking status
    if (!['pending', 'accepted'].includes(booking.status)) {
      return { success: false, error: 'Denna bokning kan inte ändras' }
    }

    // Check no pending modification exists
    const { data: pendingMod } = await supabase
      .from('booking_modifications')
      .select('id')
      .eq('booking_request_id', input.bookingId)
      .eq('status', 'pending')
      .single()

    if (pendingMod) {
      return { success: false, error: 'Det finns redan ett pågående ändringsförslag' }
    }

    // Validate at least one change is proposed
    const hasChange = input.proposedEventDate || input.proposedStartTime ||
      input.proposedEndTime || input.proposedGuestCount !== undefined ||
      input.proposedBasePrice !== undefined
    if (!hasChange) {
      return { success: false, error: 'Inga ändringar föreslagna' }
    }

    // Validate proposed date is in the future
    if (input.proposedEventDate) {
      const proposedDate = new Date(input.proposedEventDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (proposedDate <= today) {
        return { success: false, error: 'Datumet måste vara i framtiden' }
      }
    }

    // Validate guest count within venue capacity
    if (input.proposedGuestCount !== undefined) {
      if (input.proposedGuestCount < 1) {
        return { success: false, error: 'Antal gäster måste vara minst 1' }
      }
      if (venue.max_guests && input.proposedGuestCount > venue.max_guests) {
        return {
          success: false,
          error: `Lokalen har max ${venue.max_guests} gäster`,
        }
      }
    }

    // Validate price
    if (input.proposedBasePrice !== undefined && input.proposedBasePrice <= 0) {
      return { success: false, error: 'Priset måste vara större än 0' }
    }

    // Calculate pricing if base price is proposed
    let pricingFields: {
      proposed_platform_fee: number | null
      proposed_total_price: number | null
      proposed_venue_payout: number | null
    } = {
      proposed_platform_fee: null,
      proposed_total_price: null,
      proposed_venue_payout: null,
    }

    if (input.proposedBasePrice !== undefined) {
      const pricing = calculatePricing(input.proposedBasePrice)
      pricingFields = {
        proposed_platform_fee: pricing.platformFee,
        proposed_total_price: pricing.totalPrice,
        proposed_venue_payout: pricing.venuePayout,
      }
    }

    // Validate reason length
    if (input.reason && input.reason.length > 500) {
      return { success: false, error: 'Anledningen får vara max 500 tecken' }
    }

    // Insert modification
    const { data: modification, error: insertError } = await supabase
      .from('booking_modifications')
      .insert({
        booking_request_id: input.bookingId,
        proposed_by: user.id,
        status: 'pending',
        proposed_event_date: input.proposedEventDate || null,
        proposed_start_time: input.proposedStartTime || null,
        proposed_end_time: input.proposedEndTime || null,
        proposed_guest_count: input.proposedGuestCount ?? null,
        proposed_base_price: input.proposedBasePrice ?? null,
        ...pricingFields,
        reason: input.reason || null,
      })
      .select('id')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return { success: false, error: 'Det finns redan ett pågående ändringsförslag' }
      }
      console.error('Error creating modification:', insertError)
      return { success: false, error: 'Kunde inte skapa ändringsförslaget' }
    }

    // Notify the other party
    const recipientId = isCustomer ? venue.owner_id : booking.customer_id
    if (recipientId) {
      await dispatchNotification({
        recipient: recipientId,
        category: 'booking_modification_proposed',
        headline: 'Ändringsförslag',
        body: `Ett ändringsförslag har skapats för bokningen av ${venue.name} den ${formatDate(booking.event_date)}.`,
        reference: { kind: 'booking', id: input.bookingId },
        author: user.id,
        extra: {
          venue_name: venue.name,
          event_date: booking.event_date,
          proposed_event_date: input.proposedEventDate || null,
          proposed_guest_count: input.proposedGuestCount ?? null,
        },
      })
    }

    revalidatePath('/account/bookings')
    revalidatePath(`/account/bookings/${input.bookingId}`)
    revalidatePath('/dashboard/bookings')
    revalidatePath(`/dashboard/bookings/${input.bookingId}`)

    return { success: true, modificationId: modification.id }
  } catch (error) {
    console.error('Unexpected error proposing modification:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
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
