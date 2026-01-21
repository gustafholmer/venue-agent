'use server'

import { createClient } from '@/lib/supabase/server'
import type { Venue, VenuePhoto } from '@/types/database'

export interface SavedVenueWithDetails {
  id: string
  venue_id: string
  created_at: string
  venue: {
    id: string
    name: string
    slug: string | null
    city: string
    area: string | null
    capacity_standing: number | null
    capacity_seated: number | null
    price_per_hour: number | null
    price_half_day: number | null
    price_full_day: number | null
    price_evening: number | null
    primary_photo: VenuePhoto | null
  }
}

export async function getSavedVenues(): Promise<{
  success: boolean
  venues?: SavedVenueWithDetails[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Get saved venues with venue details
    const { data: savedVenues, error: fetchError } = await supabase
      .from('saved_venues')
      .select(`
        id,
        venue_id,
        created_at,
        venue:venues!inner(
          id,
          name,
          slug,
          city,
          area,
          capacity_standing,
          capacity_seated,
          price_per_hour,
          price_half_day,
          price_full_day,
          price_evening,
          status
        )
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching saved venues:', fetchError)
      return { success: false, error: 'Kunde inte hamta sparade lokaler' }
    }

    // Filter out unpublished venues
    const publishedVenues = (savedVenues || []).filter(sv => {
      const venue = sv.venue as unknown as { status: string }
      return venue.status === 'published'
    })

    // Get primary photos for all venues
    const venueIds = publishedVenues.map(sv => sv.venue_id)

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

    // Add photos to saved venues
    const venuesWithPhotos: SavedVenueWithDetails[] = publishedVenues.map(sv => ({
      id: sv.id,
      venue_id: sv.venue_id,
      created_at: sv.created_at,
      venue: {
        ...(sv.venue as unknown as {
          id: string
          name: string
          slug: string | null
          city: string
          area: string | null
          capacity_standing: number | null
          capacity_seated: number | null
          price_per_hour: number | null
          price_half_day: number | null
          price_full_day: number | null
          price_evening: number | null
        }),
        primary_photo: photoMap.get(sv.venue_id) || null,
      },
    }))

    return {
      success: true,
      venues: venuesWithPhotos,
    }
  } catch (error) {
    console.error('Unexpected error fetching saved venues:', error)
    return {
      success: false,
      error: 'Ett ovantat fel uppstod',
    }
  }
}

export async function isVenueSaved(venueId: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return false
    }

    const { data } = await supabase
      .from('saved_venues')
      .select('id')
      .eq('customer_id', user.id)
      .eq('venue_id', venueId)
      .single()

    return !!data
  } catch {
    return false
  }
}
