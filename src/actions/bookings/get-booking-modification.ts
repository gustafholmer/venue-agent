'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'
import type { BookingModification } from '@/types/database'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getBookingModification(bookingId: string): Promise<{
  success: boolean
  modification?: BookingModification
  error?: string
}> {
  try {
    const supabase = await createClient()

    if (!UUID_REGEX.test(bookingId)) {
      return { success: false, error: 'Ogiltigt boknings-ID' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Check user is a party to this booking
    const { data: booking } = await supabase
      .from('booking_requests')
      .select(`
        customer_id,
        venue:venues!inner(owner_id)
      `)
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return { success: false, error: 'Bokningen hittades inte' }
    }

    const venue = booking.venue as unknown as { owner_id: string }
    if (booking.customer_id !== user.id && venue.owner_id !== user.id) {
      return { success: false, error: 'Du har inte behörighet' }
    }

    // Fetch pending modification
    const { data: modification } = await supabase
      .from('booking_modifications')
      .select('*')
      .eq('booking_request_id', bookingId)
      .eq('status', 'pending')
      .single()

    return {
      success: true,
      modification: modification || undefined,
    }
  } catch (error) {
    logger.error('Error fetching modification', { error })
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
