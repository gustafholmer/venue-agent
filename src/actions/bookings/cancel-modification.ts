'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface CancelModificationResult {
  success: boolean
  error?: string
}

export async function cancelModification(
  modificationId: string
): Promise<CancelModificationResult> {
  try {
    const supabase = await createClient()

    if (!UUID_REGEX.test(modificationId)) {
      return { success: false, error: 'Ogiltigt ändrings-ID' }
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
          id
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

    if (modification.proposed_by !== user.id) {
      return { success: false, error: 'Bara den som föreslog ändringen kan dra tillbaka den' }
    }

    const bookingId = (modification.booking as unknown as { id: string }).id

    const { error: deleteError } = await supabase
      .from('booking_modifications')
      .delete()
      .eq('id', modificationId)

    if (deleteError) {
      logger.error('Error cancelling modification', { deleteError })
      return { success: false, error: 'Kunde inte dra tillbaka ändringsförslaget' }
    }

    revalidatePath('/account/bookings')
    revalidatePath(`/account/bookings/${bookingId}`)
    revalidatePath('/dashboard/bookings')
    revalidatePath(`/dashboard/bookings/${bookingId}`)

    return { success: true }
  } catch (error) {
    logger.error('Unexpected error cancelling modification', { error })
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
