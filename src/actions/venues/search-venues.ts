'use server'

import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo-mode'
import { MOCK_VENUES, filterMockVenues } from '@/lib/mock-data'
import { generateEmbedding } from '@/lib/gemini/embeddings'
import { generateExplanation } from '@/lib/gemini/generate-explanation'
import { isGeminiConfigured } from '@/lib/gemini/client'
import type { ParsedFilters } from '@/types/preferences'
import type { VenueResult } from '@/types/agent'
import type { Database } from '@/types/database'

type MatchedVenue = Database['public']['Functions']['match_venues']['Returns'][number]
type AvailabilityResult = Database['public']['Functions']['check_venue_availability']['Returns'][number]

export interface SearchVenuesInput {
  filters: ParsedFilters
  vibeDescription: string
  limit?: number
}

export interface SearchVenuesResult {
  success: boolean
  venues?: VenueResult[]
  error?: string
}

function buildSearchQuery(filters: ParsedFilters, vibeDescription: string): string {
  const parts: string[] = []

  if (filters.event_type) {
    parts.push(filters.event_type)
  }

  if (filters.guest_count) {
    parts.push(`${filters.guest_count} personer`)
  }

  if (filters.areas && filters.areas.length > 0) {
    parts.push(filters.areas.join(', '))
  }

  if (filters.requirements && filters.requirements.length > 0) {
    parts.push(filters.requirements.join(', '))
  }

  if (vibeDescription) {
    parts.push(vibeDescription)
  }

  return parts.join(' ') || 'eventlokal Stockholm'
}

function filterVenuesByCapacity(
  venues: MatchedVenue[],
  guestCount: number | null
): MatchedVenue[] {
  if (!guestCount) return venues

  return venues.filter((venue) => {
    // Check if venue can accommodate guests (standing or seated)
    const maxCapacity = Math.max(
      venue.capacity_standing || 0,
      venue.capacity_seated || 0,
      venue.capacity_conference || 0
    )
    return maxCapacity >= guestCount
  })
}

function filterVenuesByPrice(
  venues: MatchedVenue[],
  budgetMax: number | null
): MatchedVenue[] {
  if (!budgetMax) return venues

  return venues.filter((venue) => {
    // Check evening price first, then other prices
    const price = venue.price_evening || venue.price_full_day || venue.price_half_day
    if (!price) return true // Include venues without price (contact for pricing)
    return price <= budgetMax
  })
}

function filterVenuesByArea(
  venues: MatchedVenue[],
  areas: string[] | null
): MatchedVenue[] {
  if (!areas || areas.length === 0) return venues

  const normalizedAreas = areas.map((a) => a.toLowerCase())

  return venues.filter((venue) => {
    if (!venue.area) return false
    return normalizedAreas.includes(venue.area.toLowerCase())
  })
}

// Mock search for demo mode
function searchMockVenues(input: SearchVenuesInput): VenueResult[] {
  const { filters, vibeDescription, limit = 10 } = input

  // Filter mock venues based on filters
  let filtered = filterMockVenues({
    area: filters.areas?.[0],
    capacity: filters.guest_count || undefined,
    priceMax: filters.budget_max || undefined,
  })

  // Take only the requested limit
  filtered = filtered.slice(0, limit)

  // Convert to VenueResult format with simple explanations
  return filtered.map((venue) => ({
    id: venue.id,
    name: venue.name,
    slug: venue.slug || venue.id,
    area: venue.area || 'Stockholm',
    price: venue.price_evening || venue.price_full_day || 0,
    capacity: Math.max(
      venue.capacity_standing || 0,
      venue.capacity_seated || 0
    ),
    availableDates: undefined,
    matchReason: generateSimpleExplanation(venue, filters, vibeDescription),
    imageUrl: venue.primaryPhotoUrl || undefined,
  }))
}

// Simple explanation generator for demo mode (no AI)
function generateSimpleExplanation(
  venue: (typeof MOCK_VENUES)[0],
  filters: ParsedFilters,
  vibeDescription: string
): string {
  const parts: string[] = []

  if (filters.event_type && venue.venue_types?.includes(filters.event_type)) {
    parts.push(`Perfekt for ${filters.event_type.toLowerCase()}`)
  }

  if (filters.guest_count) {
    const capacity = Math.max(venue.capacity_standing || 0, venue.capacity_seated || 0)
    parts.push(`Kapacitet for ${capacity} gaester`)
  }

  if (venue.area) {
    parts.push(`Belaget i ${venue.area}`)
  }

  if (venue.vibes && venue.vibes.length > 0) {
    parts.push(`${venue.vibes.slice(0, 2).join(' och ').toLowerCase()} atmosfar`)
  }

  if (parts.length === 0) {
    return 'Matchar dina sokkriterier.'
  }

  return parts.join('. ') + '.'
}

export async function searchVenues(
  input: SearchVenuesInput
): Promise<SearchVenuesResult> {
  try {
    const { filters, vibeDescription, limit = 10 } = input

    // Check if we're in demo mode or services not configured
    if (isDemoMode() || !isSupabaseConfigured() || !isGeminiConfigured()) {
      return {
        success: true,
        venues: searchMockVenues(input),
      }
    }

    const supabase = await createClient()

    // Step 1: Build search query and generate embedding
    const searchQuery = buildSearchQuery(filters, vibeDescription)
    let embedding: number[]

    try {
      embedding = await generateEmbedding(searchQuery)
    } catch (error) {
      console.error('Error generating embedding:', error)
      // Fall back to mock data if embedding fails
      return {
        success: true,
        venues: searchMockVenues(input),
      }
    }

    // Step 2: Call match_venues RPC with embedding for semantic search
    // Request more than limit to allow for filtering
    const { data: matchedVenues, error: matchError } = await supabase.rpc(
      'match_venues',
      {
        query_embedding: embedding,
        match_count: limit * 3, // Fetch extra to account for filtering
      }
    )

    if (matchError) {
      console.error('Error matching venues:', matchError)
      return {
        success: false,
        error: 'Kunde inte soka efter lokaler.',
      }
    }

    if (!matchedVenues || matchedVenues.length === 0) {
      return {
        success: true,
        venues: [],
      }
    }

    // Step 3: Apply hard filters
    let filteredVenues = matchedVenues as MatchedVenue[]

    // Filter by capacity
    filteredVenues = filterVenuesByCapacity(filteredVenues, filters.guest_count)

    // Filter by price
    filteredVenues = filterVenuesByPrice(filteredVenues, filters.budget_max)

    // Filter by area (if specified)
    filteredVenues = filterVenuesByArea(filteredVenues, filters.areas)

    // Take only the top results after filtering
    filteredVenues = filteredVenues.slice(0, limit)

    if (filteredVenues.length === 0) {
      return {
        success: true,
        venues: [],
      }
    }

    // Step 4: Get venue photos
    const venueIds = filteredVenues.map((v) => v.id)
    const { data: photos } = await supabase
      .from('venue_photos')
      .select('venue_id, url')
      .in('venue_id', venueIds)
      .eq('is_primary', true)

    const photoMap = new Map<string, string>()
    if (photos) {
      photos.forEach((photo) => {
        photoMap.set(photo.venue_id, photo.url)
      })
    }

    // Step 5: Check availability for preferred dates
    let availabilityMap = new Map<string, string[]>()

    if (filters.preferred_dates && filters.preferred_dates.length > 0) {
      // Check availability for each venue
      const availabilityPromises = filteredVenues.map(async (venue) => {
        const { data: availability } = await supabase.rpc(
          'check_venue_availability',
          {
            p_venue_id: venue.id,
            p_dates: filters.preferred_dates!,
          }
        )

        if (availability) {
          const availableDates = (availability as AvailabilityResult[])
            .filter((a) => a.is_available)
            .map((a) => a.check_date)
          return { venueId: venue.id, availableDates }
        }
        return { venueId: venue.id, availableDates: [] }
      })

      const availabilityResults = await Promise.all(availabilityPromises)
      availabilityResults.forEach((result) => {
        availabilityMap.set(result.venueId, result.availableDates)
      })

      // Filter out venues with no available dates
      filteredVenues = filteredVenues.filter((venue) => {
        const availableDates = availabilityMap.get(venue.id)
        return availableDates && availableDates.length > 0
      })
    }

    // Step 6: Generate AI explanations for each match
    const venueResults: VenueResult[] = await Promise.all(
      filteredVenues.map(async (venue) => {
        // Generate explanation
        let matchReason: string
        try {
          matchReason = await generateExplanation({
            venue: {
              name: venue.name,
              description: venue.description,
              area: venue.area,
              capacity_standing: venue.capacity_standing,
              capacity_seated: venue.capacity_seated,
              price_evening: venue.price_evening,
              amenities: venue.amenities,
              venue_types: venue.venue_types,
              vibes: venue.vibes,
            },
            filters,
            vibe_description: vibeDescription,
          })
        } catch (error) {
          console.error('Error generating explanation for venue:', venue.id, error)
          matchReason = 'Matchar dina sokkriterier.'
        }

        return {
          id: venue.id,
          name: venue.name,
          slug: venue.slug,
          area: venue.area || 'Stockholm',
          price: venue.price_evening || venue.price_full_day || 0,
          capacity: Math.max(
            venue.capacity_standing || 0,
            venue.capacity_seated || 0
          ),
          availableDates: availabilityMap.get(venue.id),
          matchReason,
          imageUrl: photoMap.get(venue.id),
        }
      })
    )

    return {
      success: true,
      venues: venueResults,
    }
  } catch (error) {
    console.error('Error in searchVenues:', error)
    return {
      success: false,
      error: 'Ett ovantat fel uppstod vid sokning.',
    }
  }
}
