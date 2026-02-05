import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { rateLimit, RATE_LIMITS, RATE_LIMIT_ERROR } from '@/lib/rate-limit'
import type { Suggestion, SuggestionType } from '@/types/agent'
import { EVENT_TYPES, TIME_OPTIONS } from '@/lib/constants'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

interface VenueAssistantRequest {
  message: string
  venueId: string
  isBookingPage: boolean
}

interface VenueData {
  id: string
  name: string
  description: string | null
  area: string | null
  city: string
  address: string
  capacity_standing: number | null
  capacity_seated: number | null
  capacity_conference: number | null
  min_guests: number
  amenities: string[] | null
  venue_types: string[] | null
  vibes: string[] | null
  price_per_hour: number | null
  price_half_day: number | null
  price_full_day: number | null
  price_evening: number | null
  price_notes: string | null
}

function buildVenueContext(venue: VenueData): string {
  const parts = [
    `Lokal: ${venue.name}`,
    `Plats: ${venue.area ? `${venue.area}, ` : ''}${venue.city}`,
    `Adress: ${venue.address}`,
  ]

  if (venue.description) {
    parts.push(`Beskrivning: ${venue.description}`)
  }

  const capacities: string[] = []
  if (venue.capacity_standing) capacities.push(`${venue.capacity_standing} stående`)
  if (venue.capacity_seated) capacities.push(`${venue.capacity_seated} sittande`)
  if (venue.capacity_conference) capacities.push(`${venue.capacity_conference} konferens`)
  if (capacities.length > 0) {
    parts.push(`Kapacitet: ${capacities.join(', ')}`)
  }

  if (venue.min_guests > 1) {
    parts.push(`Minsta antal gäster: ${venue.min_guests}`)
  }

  const prices: string[] = []
  if (venue.price_per_hour) prices.push(`${venue.price_per_hour} kr/timme`)
  if (venue.price_half_day) prices.push(`${venue.price_half_day} kr halvdag`)
  if (venue.price_full_day) prices.push(`${venue.price_full_day} kr heldag`)
  if (venue.price_evening) prices.push(`${venue.price_evening} kr kväll`)
  if (prices.length > 0) {
    parts.push(`Priser: ${prices.join(', ')}`)
  }
  if (venue.price_notes) {
    parts.push(`Prisinfo: ${venue.price_notes}`)
  }

  if (venue.amenities && venue.amenities.length > 0) {
    parts.push(`Faciliteter: ${venue.amenities.join(', ')}`)
  }

  if (venue.venue_types && venue.venue_types.length > 0) {
    parts.push(`Passar för: ${venue.venue_types.join(', ')}`)
  }

  if (venue.vibes && venue.vibes.length > 0) {
    parts.push(`Känsla: ${venue.vibes.join(', ')}`)
  }

  return parts.join('\n')
}

function buildSystemPrompt(venue: VenueData, isBookingPage: boolean): string {
  const venueContext = buildVenueContext(venue)

  const basePrompt = `Du är en hjälpsam assistent för eventlokalen "${venue.name}". Svara alltid på svenska. Var vänlig och professionell.

LOKAL-INFORMATION:
${venueContext}

Svara kort och koncist. Om användaren frågar om något du inte har information om, säg att de kan kontakta lokalen direkt.`

  if (!isBookingPage) {
    return basePrompt
  }

  return `${basePrompt}

BOKNINGSSIDA:
Användaren är på bokningssidan. Du kan hjälpa dem fylla i formuläret genom att föreslå värden.

VIKTIGT - FÖRSLAG:
Om användaren beskriver sitt event (t.ex. "Vi ska ha AW för 30 personer på fredag kväll"), extrahera informationen och föreslå värden i följande JSON-format i slutet av ditt svar:

<suggestions>
[
  {"type": "eventType", "value": "aw", "label": "AW / Afterwork"},
  {"type": "guestCount", "value": "30", "label": "30 gäster"},
  {"type": "startTime", "value": "17:00", "label": "17:00"},
  {"type": "endTime", "value": "21:00", "label": "21:00"}
]
</suggestions>

Giltiga eventType-värden: ${EVENT_TYPES.map(t => `"${t.value}"`).join(', ')}
Giltiga tider: ${TIME_OPTIONS.join(', ')}
Datum ska vara i formatet YYYY-MM-DD

Föreslå ENDAST värden som användaren nämner eller som logiskt följer. Gissa inte.`
}

function parseSuggestions(text: string): { content: string; suggestions: Suggestion[] } {
  const suggestionMatch = text.match(/<suggestions>([\s\S]*?)<\/suggestions>/)

  if (!suggestionMatch) {
    return { content: text.trim(), suggestions: [] }
  }

  const content = text.replace(/<suggestions>[\s\S]*?<\/suggestions>/, '').trim()

  try {
    const parsed = JSON.parse(suggestionMatch[1])
    const suggestions: Suggestion[] = parsed.map((s: { type: string; value: string | number; label: string }) => ({
      type: s.type as SuggestionType,
      value: s.value,
      label: s.label,
    }))
    return { content, suggestions }
  } catch {
    return { content: text.trim(), suggestions: [] }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = await rateLimit('venue-assistant', RATE_LIMITS.venueAssistant)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: RATE_LIMIT_ERROR },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    const body: VenueAssistantRequest = await request.json()
    const { message, venueId, isBookingPage } = body

    if (!message || !venueId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch venue data
    const supabase = await createClient()
    const { data: venue, error } = await supabase
      .from('venues')
      .select('id, name, description, area, city, address, capacity_standing, capacity_seated, capacity_conference, min_guests, amenities, venue_types, vibes, price_per_hour, price_half_day, price_full_day, price_evening, price_notes')
      .eq('id', venueId)
      .single()

    if (error || !venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    // Generate response with Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const systemPrompt = buildSystemPrompt(venue, isBookingPage)

    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Förstått! Jag hjälper gärna till med frågor om lokalen.' }] },
        { role: 'user', parts: [{ text: message }] },
      ],
    })

    const responseText = result.response.text()
    const { content, suggestions } = parseSuggestions(responseText)

    return NextResponse.json({
      message: content,
      suggestions: isBookingPage ? suggestions : [],
    })
  } catch (error) {
    console.error('Venue assistant error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
