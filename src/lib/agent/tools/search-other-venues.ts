import { parsePreferences } from '@/lib/gemini/parse-preferences'
import { searchVenues } from '@/actions/venues/search-venues'

interface SearchOtherVenuesArgs {
  requirements: string
}

interface VenueSuggestion {
  name: string
  slug: string
  capacity: number
  priceRange: string
  area: string
  matchExplanation: string
}

interface SearchOtherVenuesResult {
  found: boolean
  venues: VenueSuggestion[]
}

/**
 * Search for alternative venues using the existing search pipeline.
 * Parses natural language requirements, searches, and returns top 3 results.
 * If search fails, returns empty results (no error thrown).
 */
export async function searchOtherVenues(
  args: SearchOtherVenuesArgs,
  currentVenueId: string
): Promise<SearchOtherVenuesResult> {
  try {
    // Parse natural language requirements into structured filters
    const preferences = await parsePreferences(args.requirements)

    // Search for matching venues
    const result = await searchVenues({
      filters: preferences.filters,
      vibeDescription: preferences.vibe_description,
      limit: 5,
    })

    if (!result.success || !result.venues) {
      return { found: false, venues: [] }
    }

    // Filter out the current venue and take top 3
    const otherVenues = result.venues
      .filter((v) => v.id !== currentVenueId)
      .slice(0, 3)

    if (otherVenues.length === 0) {
      return { found: false, venues: [] }
    }

    const suggestions: VenueSuggestion[] = otherVenues.map((v) => ({
      name: v.name,
      slug: v.slug,
      capacity: v.capacity,
      priceRange: v.price > 0 ? `Från ${v.price} kr` : 'Kontakta för pris',
      area: v.area,
      matchExplanation: v.matchReason || 'Matchar dina sökkriterier.',
    }))

    return {
      found: true,
      venues: suggestions,
    }
  } catch (error) {
    console.error('Error searching other venues:', error)
    return { found: false, venues: [] }
  }
}
