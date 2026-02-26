'use server'

import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo-mode'

export interface VenueListItem {
  id: string
  name: string
  status: string
  city: string
  capacity_standing: number | null
  capacity_seated: number | null
  primary_photo_url: string | null
}

export async function getVenues(): Promise<{
  success: boolean
  venues?: VenueListItem[]
  error?: string
}> {
  try {
    if (isDemoMode()) {
      return { success: true, venues: [] }
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Fetch all venues owned by the user
    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('id, name, status, city, capacity_standing, capacity_seated')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (venuesError) {
      console.error('Error fetching venues:', venuesError)
      return { success: false, error: 'Kunde inte hamta lokaler' }
    }

    if (!venues || venues.length === 0) {
      return { success: true, venues: [] }
    }

    // Get primary photos for all venues
    const venueIds = venues.map(v => v.id)
    const { data: photos } = await supabase
      .from('venue_photos')
      .select('venue_id, url')
      .in('venue_id', venueIds)
      .eq('is_primary', true)

    const photoMap = new Map<string, string>()
    if (photos) {
      photos.forEach(photo => {
        photoMap.set(photo.venue_id, photo.url)
      })
    }

    // Combine venues with primary photos
    const venueList: VenueListItem[] = venues.map(venue => ({
      id: venue.id,
      name: venue.name,
      status: venue.status,
      city: venue.city,
      capacity_standing: venue.capacity_standing,
      capacity_seated: venue.capacity_seated,
      primary_photo_url: photoMap.get(venue.id) || null,
    }))

    return { success: true, venues: venueList }
  } catch (error) {
    console.error('Error fetching venues:', error)
    return { success: false, error: 'Ett ovantat fel uppstod' }
  }
}
