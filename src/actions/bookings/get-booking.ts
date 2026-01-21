'use server'

import { createClient } from '@/lib/supabase/server'
import type { BookingRequest, VenuePhoto } from '@/types/database'

export interface BookingWithVenue extends BookingRequest {
  venue: {
    name: string
    slug: string | null
    city: string
    area: string | null
    owner_id: string
    primary_photo: VenuePhoto | null
  }
}

// UUID format validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getBooking(bookingId: string, token?: string): Promise<{
  success: boolean
  booking?: BookingWithVenue
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Validate UUID format to prevent injection
    if (!UUID_REGEX.test(bookingId)) {
      return { success: false, error: 'Ogiltigt boknings-ID' }
    }

    const { data: booking, error } = await supabase
      .from('booking_requests')
      .select(`
        *,
        venue:venues!inner(
          name,
          slug,
          city,
          area,
          owner_id
        )
      `)
      .eq('id', bookingId)
      .single()

    if (error || !booking) {
      return { success: false, error: 'Bokningen hittades inte' }
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    // Authorization check: user must be logged in as customer/venue owner, OR provide valid token
    const isCustomer = user && booking.customer_id === user.id
    const isVenueOwner = user && (booking.venue as unknown as { owner_id: string }).owner_id === user.id
    const hasValidToken = token && booking.verification_token === token

    if (!isCustomer && !isVenueOwner && !hasValidToken) {
      return { success: false, error: 'Du har inte behörighet att se denna bokning' }
    }

    // Get venue primary photo
    const { data: photos } = await supabase
      .from('venue_photos')
      .select('*')
      .eq('venue_id', booking.venue_id)
      .eq('is_primary', true)
      .limit(1)

    const primaryPhoto = photos?.[0] || null

    return {
      success: true,
      booking: {
        ...booking,
        venue: {
          ...(booking.venue as unknown as { name: string; slug: string | null; city: string; area: string | null; owner_id: string }),
          primary_photo: primaryPhoto,
        },
      },
    }
  } catch (error) {
    console.error('Error fetching booking:', error)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod',
    }
  }
}
