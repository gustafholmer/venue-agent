'use server'

import { createClient } from '@/lib/supabase/server'
import type { VenueResult } from '@/types/agent'

interface SaveSearchInput {
  sessionId: string
}

interface SaveSearchResult {
  success: boolean
  searchId?: string
  error?: string
}

// UUID regex pattern
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function saveSearchForSharing(
  input: SaveSearchInput
): Promise<SaveSearchResult> {
  const { sessionId } = input

  // Validate sessionId format
  if (!uuidRegex.test(sessionId)) {
    return {
      success: false,
      error: 'Ogiltig session',
    }
  }

  try {
    const supabase = await createClient()

    // Fetch the session to get the requirements and matched venues
    const { data: session, error: sessionError } = await supabase
      .from('agent_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return { success: false, error: 'Session hittades inte' }
    }

    // Get requirements from session
    const requirements = session.requirements as Record<string, unknown> || {}
    const matchedVenues = session.matched_venues as VenueResult[] | null

    // Create a search record
    const { data: search, error: searchError } = await supabase
      .from('searches')
      .insert({
        customer_id: session.customer_id,
        event_type: requirements.event_type as string | null,
        guest_count: requirements.guest_count as number | null,
        areas: (requirements.areas as string[] | null) || [],
        budget_min: requirements.budget_min as number | null,
        budget_max: requirements.budget_max as number | null,
        preferred_date: requirements.preferred_dates && (requirements.preferred_dates as string[]).length > 0
          ? (requirements.preferred_dates as string[])[0]
          : null,
        preferred_time: requirements.preferred_time as string | null,
        requirements: (requirements.requirements as string[] | null) || [],
        vibe_description: requirements.vibe_description as string | null,
        raw_input: null, // Could store the original message here if needed
        notify_new_matches: false,
      })
      .select('id')
      .single()

    if (searchError || !search) {
      console.error('Error creating search record:', searchError)
      return { success: false, error: 'Kunde inte spara sökningen' }
    }

    // If there are matched venues, create a shared list
    if (matchedVenues && matchedVenues.length > 0) {
      const venueIds = matchedVenues.map(v => v.id)

      // Set expiration to 30 days from now
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      const { error: listError } = await supabase
        .from('shared_lists')
        .insert({
          creator_id: session.customer_id,
          title: requirements.event_type
            ? `Lokaler för ${requirements.event_type}`
            : 'Sökresultat',
          venue_ids: venueIds,
          expires_at: expiresAt.toISOString(),
        })

      if (listError) {
        console.error('Error creating shared list:', listError)
        // Don't fail the whole operation, the search is still saved
      }
    }

    return {
      success: true,
      searchId: search.id,
    }
  } catch (error) {
    console.error('Error saving search:', error)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod',
    }
  }
}

export async function getSearchById(searchId: string): Promise<{
  success: boolean
  search?: {
    id: string
    event_type: string | null
    guest_count: number | null
    areas: string[]
    budget_min: number | null
    budget_max: number | null
    preferred_date: string | null
    preferred_time: string | null
    requirements: string[]
    vibe_description: string | null
    created_at: string
  }
  venues?: VenueResult[]
  error?: string
}> {
  // Validate searchId format
  if (!uuidRegex.test(searchId)) {
    return {
      success: false,
      error: 'Ogiltig sök-ID',
    }
  }

  try {
    const supabase = await createClient()

    // Fetch the search
    const { data: search, error: searchError } = await supabase
      .from('searches')
      .select('*')
      .eq('id', searchId)
      .single()

    if (searchError || !search) {
      return { success: false, error: 'Sökningen hittades inte' }
    }

    // Try to find venues that match the search criteria
    // First, check if there's a shared list associated with this search
    // by looking for lists created around the same time with matching venue types
    const { data: sharedList } = await supabase
      .from('shared_lists')
      .select('venue_ids')
      .eq('creator_id', search.customer_id)
      .gte('created_at', new Date(new Date(search.created_at).getTime() - 60000).toISOString())
      .lte('created_at', new Date(new Date(search.created_at).getTime() + 60000).toISOString())
      .single()

    let venues: VenueResult[] = []

    if (sharedList && sharedList.venue_ids.length > 0) {
      // Fetch the venues from the shared list
      const { data: venueData } = await supabase
        .from('venues')
        .select(`
          id,
          name,
          slug,
          area,
          city,
          capacity_standing,
          capacity_seated,
          price_evening,
          price_full_day
        `)
        .in('id', sharedList.venue_ids)
        .eq('status', 'published')

      if (venueData) {
        // Get photos for these venues
        const { data: photos } = await supabase
          .from('venue_photos')
          .select('venue_id, url')
          .in('venue_id', sharedList.venue_ids)
          .eq('is_primary', true)

        const photoMap = new Map<string, string>()
        if (photos) {
          photos.forEach((photo) => {
            photoMap.set(photo.venue_id, photo.url)
          })
        }

        venues = venueData.map((v) => ({
          id: v.id,
          name: v.name,
          slug: v.slug || v.id,
          area: v.area || v.city,
          price: v.price_evening || v.price_full_day || 0,
          capacity: Math.max(v.capacity_standing || 0, v.capacity_seated || 0),
          imageUrl: photoMap.get(v.id),
        }))
      }
    }

    return {
      success: true,
      search: {
        id: search.id,
        event_type: search.event_type,
        guest_count: search.guest_count,
        areas: search.areas || [],
        budget_min: search.budget_min,
        budget_max: search.budget_max,
        preferred_date: search.preferred_date,
        preferred_time: search.preferred_time,
        requirements: search.requirements || [],
        vibe_description: search.vibe_description,
        created_at: search.created_at,
      },
      venues,
    }
  } catch (error) {
    console.error('Error fetching search:', error)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod',
    }
  }
}
