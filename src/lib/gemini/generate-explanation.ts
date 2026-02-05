import { geminiModel } from './client'
import type { Venue } from '@/types/database'
import type { ParsedFilters } from '@/types/preferences'

interface ExplanationInput {
  venue: Pick<Venue, 'name' | 'description' | 'area' | 'capacity_standing' | 'capacity_seated' | 'price_evening' | 'amenities' | 'venue_types' | 'vibes'>
  filters: ParsedFilters
  vibe_description: string
}

interface BatchExplanationInput {
  venues: Array<ExplanationInput['venue'] & { id: string }>
  filters: ParsedFilters
  vibe_description: string
}

const BATCH_EXPLANATION_PROMPT = `Du är en expert på eventlokaler i Stockholm.

Kunden söker:
- Typ av event: {event_type}
- Antal gäster: {guest_count}
- Områden: {areas}
- Budget: {budget_min} - {budget_max} SEK
- Krav: {requirements}
- Känsla: {vibe_description}

Här är lokalerna som matchar:
{venues_json}

För varje lokal, skriv en kort (1-2 meningar) förklaring på svenska varför lokalen passar kundens behov.
Börja varje förklaring med "Matchar för att: " och fokusera på de viktigaste matchande faktorerna.
Var specifik och nämn konkreta detaljer.

Svara med ENBART giltig JSON i detta format (inga andra tecken):
{
  "venue_id_1": "Matchar för att: ...",
  "venue_id_2": "Matchar för att: ..."
}`

export async function generateExplanationsBatch(
  input: BatchExplanationInput
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const fallback = 'Matchar dina sökkriterier.'

  if (!geminiModel || input.venues.length === 0) {
    input.venues.forEach((v) => result.set(v.id, fallback))
    return result
  }

  const { venues, filters, vibe_description } = input

  const venuesJson = JSON.stringify(
    venues.map((v) => ({
      id: v.id,
      name: v.name,
      area: v.area || 'Stockholm',
      capacity_standing: v.capacity_standing,
      capacity_seated: v.capacity_seated,
      price_evening: v.price_evening,
      amenities: v.amenities,
      venue_types: v.venue_types,
      vibes: v.vibes,
      description: v.description?.slice(0, 200),
    })),
    null,
    2
  )

  const prompt = BATCH_EXPLANATION_PROMPT
    .replace('{event_type}', filters.event_type || 'ej specificerat')
    .replace('{guest_count}', filters.guest_count?.toString() || 'ej specificerat')
    .replace('{areas}', filters.areas?.join(', ') || 'ej specificerat')
    .replace('{budget_min}', filters.budget_min?.toString() || '0')
    .replace('{budget_max}', filters.budget_max?.toString() || 'obegränsad')
    .replace('{requirements}', filters.requirements?.join(', ') || 'inga specifika')
    .replace('{vibe_description}', vibe_description || 'ej specificerat')
    .replace('{venues_json}', venuesJson)

  try {
    const response = await geminiModel.generateContent(prompt)
    const text = response.response.text().trim()

    // Strip markdown code fences if present, then parse JSON
    const cleaned = text.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim()
    if (cleaned.startsWith('{')) {
      const parsed = JSON.parse(cleaned) as Record<string, string>
      for (const [id, explanation] of Object.entries(parsed)) {
        result.set(id, explanation)
      }
    }
  } catch (error) {
    console.error('Error generating batch explanations:', error)
  }

  // Fill in fallback for any missing venues
  venues.forEach((v) => {
    if (!result.has(v.id)) {
      result.set(v.id, fallback)
    }
  })

  return result
}
