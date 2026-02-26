'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'
import type { BookingRequest, VenuePhoto } from '@/types/database'

export type CustomerBookingStatusFilter = 'all' | 'pending' | 'accepted' | 'completed' | 'declined'

export interface CustomerBooking extends BookingRequest {
  venue: {
    id: string
    name: string
    slug: string | null
    city: string
    area: string | null
    primary_photo: VenuePhoto | null
  }
}

export interface GetCustomerBookingsResult {
  success: boolean
  bookings?: CustomerBooking[]
  error?: string
}

export async function getCustomerBookings(
  statusFilter: CustomerBookingStatusFilter = 'all'
): Promise<GetCustomerBookingsResult> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Build query
    let query = supabase
      .from('booking_requests')
      .select(`
        *,
        venue:venues!inner(
          id,
          name,
          slug,
          city,
          area
        )
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })

    // Apply status filter
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data: bookings, error: bookingsError } = await query

    if (bookingsError) {
      logger.error('Error fetching customer bookings', { bookingsError })
      return { success: false, error: 'Kunde inte hamta bokningar' }
    }

    // Get primary photos for all venues
    const venueIds = [...new Set((bookings || []).map(b => b.venue_id))]

    const { data: photos } = await supabase
      .from('venue_photos')
      .select('*')
      .in('venue_id', venueIds)
      .eq('is_primary', true)

    // Map photos to venues
    const photoMap = new Map<string, VenuePhoto>()
    photos?.forEach(photo => {
      photoMap.set(photo.venue_id, photo)
    })

    // Add photos to bookings
    const bookingsWithPhotos: CustomerBooking[] = (bookings || []).map(booking => ({
      ...booking,
      venue: {
        ...(booking.venue as unknown as { id: string; name: string; slug: string | null; city: string; area: string | null }),
        primary_photo: photoMap.get(booking.venue_id) || null,
      },
    }))

    return {
      success: true,
      bookings: bookingsWithPhotos,
    }
  } catch (error) {
    logger.error('Unexpected error fetching customer bookings', { error })
    return {
      success: false,
      error: 'Ett ovantat fel uppstod',
    }
  }
}

export interface BookingStats {
  total: number
  pending: number
  accepted: number
  completed: number
}

export async function getCustomerBookingStats(): Promise<{
  success: boolean
  stats?: BookingStats
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    const { data: bookings, error } = await supabase
      .from('booking_requests')
      .select('status')
      .eq('customer_id', user.id)

    if (error) {
      logger.error('Error fetching booking stats', { error })
      return { success: false, error: 'Kunde inte hamta bokningsstatistik' }
    }

    const stats: BookingStats = {
      total: bookings?.length || 0,
      pending: bookings?.filter(b => b.status === 'pending').length || 0,
      accepted: bookings?.filter(b => b.status === 'accepted').length || 0,
      completed: bookings?.filter(b => b.status === 'completed' || b.status === 'paid_out').length || 0,
    }

    return { success: true, stats }
  } catch (error) {
    logger.error('Unexpected error fetching booking stats', { error })
    return { success: false, error: 'Ett ovantat fel uppstod' }
  }
}
