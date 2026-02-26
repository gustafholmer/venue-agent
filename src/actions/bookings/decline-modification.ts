'use server'

import { createClient } from '@/lib/supabase/server'
import { dispatchNotification } from '@/lib/notifications/create-notification'
import { revalidatePath } from 'next/cache'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface DeclineModificationResult {
  success: boolean
  error?: string
}

export async function declineModification(
  modificationId: string,
  declineReason: string
): Promise<DeclineModificationResult> {
  try {
    const supabase = await createClient()

    if (!UUID_REGEX.test(modificationId)) {
      return { success: false, error: 'Ogiltigt ändrings-ID' }
    }

    if (!declineReason || declineReason.trim().length === 0) {
      return { success: false, error: 'Ange en anledning' }
    }

    if (declineReason.length > 500) {
      return { success: false, error: 'Anledningen får vara max 500 tecken' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    const { data: modification, error: modError } = await supabase
      .from('booking_modifications')
      .select(`
        *,
        booking:booking_requests!inner(
          id,
          customer_id,
          venue:venues!inner(
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
      customer_id: string | null
      venue: { name: string; owner_id: string }
    }

    const isCustomer = booking.customer_id === user.id
    const isOwner = booking.venue.owner_id === user.id
    if (!isCustomer && !isOwner) {
      return { success: false, error: 'Du har inte behörighet' }
    }
    if (modification.proposed_by === user.id) {
      return { success: false, error: 'Du kan inte neka ditt eget förslag' }
    }

    const { error: updateError } = await supabase
      .from('booking_modifications')
      .update({
        status: 'declined',
        decline_reason: declineReason.trim(),
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', modificationId)

    if (updateError) {
      console.error('Error declining modification:', updateError)
      return { success: false, error: 'Kunde inte neka ändringsförslaget' }
    }

    await dispatchNotification({
      recipient: modification.proposed_by,
      category: 'booking_modification_declined',
      headline: 'Ändringsförslag nekat',
      body: `Ditt ändringsförslag för bokningen av ${booking.venue.name} har nekats.`,
      reference: { kind: 'booking', id: booking.id },
      author: user.id,
      extra: {
        venue_name: booking.venue.name,
        decline_reason: declineReason.trim(),
      },
    })

    revalidatePath('/account/bookings')
    revalidatePath(`/account/bookings/${booking.id}`)
    revalidatePath('/dashboard/bookings')
    revalidatePath(`/dashboard/bookings/${booking.id}`)

    return { success: true }
  } catch (error) {
    console.error('Unexpected error declining modification:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
