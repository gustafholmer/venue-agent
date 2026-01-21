import { geminiModel } from './client'
import type { Venue } from '@/types/database'
import type { ParsedFilters } from '@/types/preferences'

interface ExplanationInput {
  venue: Pick<Venue, 'name' | 'description' | 'area' | 'capacity_standing' | 'capacity_seated' | 'price_evening' | 'amenities' | 'venue_types' | 'vibes'>
  filters: ParsedFilters
  vibe_description: string
}

const EXPLANATION_PROMPT = `Du är en expert på eventlokaler i Stockholm.

Kunden söker:
- Typ av event: {event_type}
- Antal gäster: {guest_count}
- Områden: {areas}
- Budget: {budget_min} - {budget_max} SEK
- Krav: {requirements}
- Känsla: {vibe_description}

Lokalen:
- Namn: {venue_name}
- Område: {venue_area}
- Kapacitet: {capacity_standing} stående, {capacity_seated} sittande
- Pris: {price} SEK (kväll)
- Faciliteter: {amenities}
- Typ: {venue_types}
- Stil: {vibes}
- Beskrivning: {description}

Skriv en kort (1-2 meningar) förklaring på svenska varför denna lokal passar kundens behov.
Börja med "Matchar för att: " och fokusera på de viktigaste matchande faktorerna.
Var specifik och nämn konkreta detaljer.`

export async function generateExplanation(input: ExplanationInput): Promise<string> {
  if (!geminiModel) {
    return 'Matchar dina sökkriterier.'
  }

  const { venue, filters, vibe_description } = input

  const prompt = EXPLANATION_PROMPT
    .replace('{event_type}', filters.event_type || 'ej specificerat')
    .replace('{guest_count}', filters.guest_count?.toString() || 'ej specificerat')
    .replace('{areas}', filters.areas?.join(', ') || 'ej specificerat')
    .replace('{budget_min}', filters.budget_min?.toString() || '0')
    .replace('{budget_max}', filters.budget_max?.toString() || 'obegränsad')
    .replace('{requirements}', filters.requirements?.join(', ') || 'inga specifika')
    .replace('{vibe_description}', vibe_description || 'ej specificerat')
    .replace('{venue_name}', venue.name)
    .replace('{venue_area}', venue.area || 'Stockholm')
    .replace('{capacity_standing}', venue.capacity_standing?.toString() || 'ej angivet')
    .replace('{capacity_seated}', venue.capacity_seated?.toString() || 'ej angivet')
    .replace('{price}', venue.price_evening?.toString() || 'kontakta för pris')
    .replace('{amenities}', venue.amenities?.join(', ') || 'ej angivet')
    .replace('{venue_types}', venue.venue_types?.join(', ') || 'ej angivet')
    .replace('{vibes}', venue.vibes?.join(', ') || 'ej angivet')
    .replace('{description}', venue.description || '')

  try {
    const result = await geminiModel.generateContent(prompt)
    return result.response.text().trim()
  } catch (error) {
    console.error('Error generating explanation:', error)
    return 'Matchar dina sökkriterier.'
  }
}
