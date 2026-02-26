'use server'

import { createClient } from '@/lib/supabase/server'
import type { VenueInquiry, VenuePhoto } from '@/types/database'

export type InquiryStatusFilter = 'all' | 'open' | 'closed' | 'converted'

export interface CustomerInquiry extends VenueInquiry {
  venue: {
    id: string
    name: string
    slug: string | null
    city: string
    area: string | null
    primary_photo: VenuePhoto | null
  }
}

export interface GetCustomerInquiriesResult {
  success: boolean
  inquiries?: CustomerInquiry[]
  error?: string
}

export async function getCustomerInquiries(
  statusFilter: InquiryStatusFilter = 'all'
): Promise<GetCustomerInquiriesResult> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Build query
    let query = supabase
      .from('venue_inquiries')
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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply status filter
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data: inquiries, error: inquiriesError } = await query

    if (inquiriesError) {
      console.error('Error fetching customer inquiries:', inquiriesError)
      return { success: false, error: 'Kunde inte hämta förfrågningar' }
    }

    // Get primary photos for all venues
    const venueIds = [...new Set((inquiries || []).map(i => i.venue_id))]

    const { data: photos } = venueIds.length > 0
      ? await supabase
          .from('venue_photos')
          .select('*')
          .in('venue_id', venueIds)
          .eq('is_primary', true)
      : { data: [] }

    // Map photos to venues
    const photoMap = new Map<string, VenuePhoto>()
    photos?.forEach(photo => {
      photoMap.set(photo.venue_id, photo)
    })

    // Add photos to inquiries
    const inquiriesWithPhotos: CustomerInquiry[] = (inquiries || []).map(inquiry => ({
      ...inquiry,
      venue: {
        ...(inquiry.venue as unknown as { id: string; name: string; slug: string | null; city: string; area: string | null }),
        primary_photo: photoMap.get(inquiry.venue_id) || null,
      },
    }))

    return {
      success: true,
      inquiries: inquiriesWithPhotos,
    }
  } catch (error) {
    console.error('Unexpected error fetching customer inquiries:', error)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod',
    }
  }
}

export interface VenueInquiryWithProfile extends VenueInquiry {
  profile: {
    full_name: string | null
    email: string
  }
}

export interface GetVenueInquiriesResult {
  success: boolean
  inquiries?: VenueInquiryWithProfile[]
  error?: string
}

export async function getVenueInquiries(
  statusFilter: InquiryStatusFilter = 'all'
): Promise<GetVenueInquiriesResult> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Get venue for this owner
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (venueError || !venue) {
      return { success: false, error: 'Ingen lokal hittades' }
    }

    // Build query
    let query = supabase
      .from('venue_inquiries')
      .select(`
        *,
        profile:profiles!inner(
          full_name,
          email
        )
      `)
      .eq('venue_id', venue.id)
      .order('created_at', { ascending: false })

    // Apply status filter
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data: inquiries, error: inquiriesError } = await query

    if (inquiriesError) {
      console.error('Error fetching venue inquiries:', inquiriesError)
      return { success: false, error: 'Kunde inte hämta förfrågningar' }
    }

    return {
      success: true,
      inquiries: (inquiries || []) as VenueInquiryWithProfile[],
    }
  } catch (error) {
    console.error('Unexpected error fetching venue inquiries:', error)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod',
    }
  }
}
