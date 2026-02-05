import { geminiModel } from './client'
import { withRetry } from './retry'
import { ParsedFiltersSchema, type ParsedPreferences } from '@/types/preferences'

const PARSE_PROMPT = `Du är en expert på eventlokaler i Stockholm.

Analysera följande text och extrahera information om vad användaren söker.

Extrahera:
1. event_type: typ av event (aw, konferens, fest, workshop, möte, kick-off, middag, lansering, fotografering, etc.)
2. guest_count: antal personer (heltal)
3. areas: önskade områden i Stockholm (array, t.ex. ["Södermalm", "Vasastan"])
4. budget_min: minsta budget i SEK (heltal)
5. budget_max: högsta budget i SEK (heltal)
6. preferred_dates: önskade datum (array av ISO-strängar YYYY-MM-DD)
   - "nästa fredag" → beräkna datumet
   - "någon fredag i mars" → alla fredagar i mars
   - "15 mars" → ["2026-03-15"]
7. preferred_time: tid på dagen ("morning", "afternoon", "evening")
8. requirements: specifika krav (array, t.ex. ["projektor", "catering", "bar", "utomhus"])
9. vibe_description: fritext om känsla/stil de söker
10. flexible_dates: true om användaren är flexibel med datum

Dagens datum är ${new Date().toISOString().split('T')[0]}.

Svara ENDAST med JSON i detta format:
{
  "filters": {
    "event_type": string eller null,
    "guest_count": number eller null,
    "areas": ["område1"] eller null,
    "budget_min": number eller null,
    "budget_max": number eller null,
    "preferred_dates": ["YYYY-MM-DD"] eller null,
    "preferred_time": "morning" | "afternoon" | "evening" | null,
    "requirements": ["krav1"] eller null
  },
  "vibe_description": "beskrivning av känsla/stil",
  "flexible_dates": true/false
}

Stockholmsområden inkluderar: Södermalm, Vasastan, Östermalm, Kungsholmen, Norrmalm, Gamla Stan, Djurgården, Hammarby Sjöstad, Nacka, Solna, Sundbyberg.

Användarens text:`

export async function parsePreferences(input: string): Promise<ParsedPreferences> {
  if (!geminiModel) {
    throw new Error('Gemini API key not configured')
  }

  const model = geminiModel
  const result = await withRetry(() => model.generateContent(PARSE_PROMPT + '\n\n' + input))
  const response = result.response.text()

  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Could not parse preferences from response')
  }

  const parsed = JSON.parse(jsonMatch[0])

  // Validate filters
  const filters = ParsedFiltersSchema.parse(parsed.filters)

  return {
    filters,
    vibe_description: parsed.vibe_description || '',
    flexible_dates: parsed.flexible_dates || false,
  }
}
