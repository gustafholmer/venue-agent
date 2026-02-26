import type { VenueAgentConfig } from '@/types/agent-booking'
import type {
  PricingRules,
  BookingParams,
  EventTypeConfig,
  PolicyConfig,
  FaqEntry,
} from '@/types/agent-booking'

export interface VenueData {
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
  website: string | null
  contact_email: string | null
  contact_phone: string | null
}

export interface CalendarData {
  blockedDates: string[]
  bookedDates: string[]
}

const WEEKDAY_NAMES_SV = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag']

function formatDateRange(dates: string[]): string {
  if (dates.length === 0) return 'Inga'
  // Show at most 90 days from today; dates are already filtered to 3 months by caller
  return dates.join(', ')
}

function buildIdentitySection(venueName: string, lang: string): string {
  const today = new Date().toISOString().split('T')[0]

  if (lang === 'en') {
    return `# Identity & Behavior

You are a booking assistant for the event venue "${venueName}". You help potential customers with questions and guide them through the booking process.

## Rules
- Warm, competent, and professional tone
- Keep responses short and focused — do not over-explain
- NEVER confirm a booking on your own — all bookings require owner approval
- NEVER invent information — if you are unsure, escalate to the owner
- Extract booking intent progressively through the conversation (date, time, number of guests, event type)
- Suggest alternatives when a requested date or configuration is unavailable
- Always answer in the same language the customer uses

Today's date: ${today}`
  }

  return `# Identitet & Beteende

Du är en bokningsassistent för eventlokalen "${venueName}". Du hjälper potentiella kunder med frågor och guidar dem genom bokningsprocessen.

## Regler
- Varm, kompetent och professionell ton
- Håll svaren korta och fokuserade — överdrivna förklaringar undviks
- BEKRÄFTA ALDRIG en bokning på egen hand — alla bokningar kräver ägarens godkännande
- HITTA INTE PÅ INFORMATION — om du är osäker, eskalera till ägaren
- Kartlägg bokningsavsikten successivt under samtalet (datum, tid, antal gäster, evenemangstyp)
- Föreslå alternativ när ett önskat datum eller en konfiguration inte är tillgänglig
- Svara alltid på det språk kunden skriver på

Dagens datum: ${today}`
}

function buildVenueProfileSection(venue: VenueData, lang: string): string {
  const isSwedish = lang !== 'en'

  const location = venue.area ? `${venue.area}, ${venue.city}` : venue.city

  const capacities: string[] = []
  if (venue.capacity_standing) {
    capacities.push(isSwedish ? `${venue.capacity_standing} stående` : `${venue.capacity_standing} standing`)
  }
  if (venue.capacity_seated) {
    capacities.push(isSwedish ? `${venue.capacity_seated} sittande` : `${venue.capacity_seated} seated`)
  }
  if (venue.capacity_conference) {
    capacities.push(isSwedish ? `${venue.capacity_conference} konferens` : `${venue.capacity_conference} conference`)
  }

  const lines: string[] = []

  if (isSwedish) {
    lines.push(`# Lokalprofil`)
    lines.push(`**Lokal:** ${venue.name}`)
    lines.push(`**Plats:** ${location}`)
    lines.push(`**Adress:** ${venue.address}`)
    if (venue.description) lines.push(`**Beskrivning:** ${venue.description}`)
    if (capacities.length > 0) lines.push(`**Kapacitet:** ${capacities.join(', ')}`)
    if (venue.min_guests > 1) lines.push(`**Minsta antal gäster:** ${venue.min_guests}`)
    if (venue.amenities && venue.amenities.length > 0) lines.push(`**Faciliteter:** ${venue.amenities.join(', ')}`)
    if (venue.venue_types && venue.venue_types.length > 0) lines.push(`**Passar för:** ${venue.venue_types.join(', ')}`)
    if (venue.vibes && venue.vibes.length > 0) lines.push(`**Känsla:** ${venue.vibes.join(', ')}`)
    if (venue.website) lines.push(`**Webbplats:** ${venue.website}`)
    if (venue.contact_email) lines.push(`**E-post:** ${venue.contact_email}`)
    if (venue.contact_phone) lines.push(`**Telefon:** ${venue.contact_phone}`)
  } else {
    lines.push(`# Venue Profile`)
    lines.push(`**Venue:** ${venue.name}`)
    lines.push(`**Location:** ${location}`)
    lines.push(`**Address:** ${venue.address}`)
    if (venue.description) lines.push(`**Description:** ${venue.description}`)
    if (capacities.length > 0) lines.push(`**Capacity:** ${capacities.join(', ')}`)
    if (venue.min_guests > 1) lines.push(`**Minimum guests:** ${venue.min_guests}`)
    if (venue.amenities && venue.amenities.length > 0) lines.push(`**Amenities:** ${venue.amenities.join(', ')}`)
    if (venue.venue_types && venue.venue_types.length > 0) lines.push(`**Suitable for:** ${venue.venue_types.join(', ')}`)
    if (venue.vibes && venue.vibes.length > 0) lines.push(`**Vibe:** ${venue.vibes.join(', ')}`)
    if (venue.website) lines.push(`**Website:** ${venue.website}`)
    if (venue.contact_email) lines.push(`**Email:** ${venue.contact_email}`)
    if (venue.contact_phone) lines.push(`**Phone:** ${venue.contact_phone}`)
  }

  return lines.join('\n')
}

function buildPricingSection(venue: VenueData, pricingRules: PricingRules, lang: string): string {
  const isSwedish = lang !== 'en'
  const lines: string[] = []

  if (isSwedish) {
    lines.push(`# Prissättning`)
    lines.push(`**OBS:** En plattformsavgift på 12% tillkommer på alla priser.`)
    lines.push('')

    if (pricingRules.basePrice) {
      lines.push(`**Grundpris:** ${pricingRules.basePrice} kr`)
    } else {
      // Fall back to venue price fields
      const prices: string[] = []
      if (venue.price_per_hour) prices.push(`${venue.price_per_hour} kr/timme`)
      if (venue.price_half_day) prices.push(`${venue.price_half_day} kr halvdag`)
      if (venue.price_full_day) prices.push(`${venue.price_full_day} kr heldag`)
      if (venue.price_evening) prices.push(`${venue.price_evening} kr kväll`)
      if (prices.length > 0) lines.push(`**Priser:** ${prices.join(', ')}`)
    }

    if (pricingRules.perPersonRate) {
      lines.push(`**Per person:** ${pricingRules.perPersonRate} kr`)
    }

    if (pricingRules.minimumSpend) {
      lines.push(`**Minimibelopp:** ${pricingRules.minimumSpend} kr`)
    }

    if (pricingRules.packages && pricingRules.packages.length > 0) {
      lines.push('')
      lines.push('**Paket:**')
      for (const pkg of pricingRules.packages) {
        const perPersonNote = pkg.perPerson ? '/person' : ''
        lines.push(`- ${pkg.name}: ${pkg.price} kr${perPersonNote} — ${pkg.description}`)
      }
    }

    const notes = pricingRules.notes || venue.price_notes
    if (notes) {
      lines.push('')
      lines.push(`**Prisinfo:** ${notes}`)
    }
  } else {
    lines.push(`# Pricing`)
    lines.push(`**Note:** A 12% platform fee applies to all prices.`)
    lines.push('')

    if (pricingRules.basePrice) {
      lines.push(`**Base price:** ${pricingRules.basePrice} SEK`)
    } else {
      const prices: string[] = []
      if (venue.price_per_hour) prices.push(`${venue.price_per_hour} SEK/hour`)
      if (venue.price_half_day) prices.push(`${venue.price_half_day} SEK half day`)
      if (venue.price_full_day) prices.push(`${venue.price_full_day} SEK full day`)
      if (venue.price_evening) prices.push(`${venue.price_evening} SEK evening`)
      if (prices.length > 0) lines.push(`**Prices:** ${prices.join(', ')}`)
    }

    if (pricingRules.perPersonRate) {
      lines.push(`**Per person:** ${pricingRules.perPersonRate} SEK`)
    }

    if (pricingRules.minimumSpend) {
      lines.push(`**Minimum spend:** ${pricingRules.minimumSpend} SEK`)
    }

    if (pricingRules.packages && pricingRules.packages.length > 0) {
      lines.push('')
      lines.push('**Packages:**')
      for (const pkg of pricingRules.packages) {
        const perPersonNote = pkg.perPerson ? '/person' : ''
        lines.push(`- ${pkg.name}: ${pkg.price} SEK${perPersonNote} — ${pkg.description}`)
      }
    }

    const notes = pricingRules.notes || venue.price_notes
    if (notes) {
      lines.push('')
      lines.push(`**Price notes:** ${notes}`)
    }
  }

  return lines.join('\n')
}

function buildBookingParamsSection(bookingParams: BookingParams, lang: string): string {
  const isSwedish = lang !== 'en'
  const lines: string[] = []

  if (isSwedish) {
    lines.push('# Bokningsparametrar')
    if (bookingParams.minGuests !== undefined) lines.push(`**Minsta antal gäster:** ${bookingParams.minGuests}`)
    if (bookingParams.maxGuests !== undefined) lines.push(`**Maximalt antal gäster:** ${bookingParams.maxGuests}`)
    if (bookingParams.minDurationHours !== undefined) lines.push(`**Minsta bokningslängd:** ${bookingParams.minDurationHours} timmar`)
    if (bookingParams.maxDurationHours !== undefined) lines.push(`**Maximala bokningslängd:** ${bookingParams.maxDurationHours} timmar`)
    if (bookingParams.minAdvanceDays !== undefined) lines.push(`**Minsta förbokningstid:** ${bookingParams.minAdvanceDays} dagar`)
    if (bookingParams.maxAdvanceMonths !== undefined) lines.push(`**Maximalt förbok i förväg:** ${bookingParams.maxAdvanceMonths} månader`)
    if (bookingParams.blockedWeekdays && bookingParams.blockedWeekdays.length > 0) {
      const dayNames = bookingParams.blockedWeekdays.map(d => WEEKDAY_NAMES_SV[d]).join(', ')
      lines.push(`**Stängda veckodagar:** ${dayNames}`)
    }
  } else {
    lines.push('# Booking Parameters')
    if (bookingParams.minGuests !== undefined) lines.push(`**Minimum guests:** ${bookingParams.minGuests}`)
    if (bookingParams.maxGuests !== undefined) lines.push(`**Maximum guests:** ${bookingParams.maxGuests}`)
    if (bookingParams.minDurationHours !== undefined) lines.push(`**Minimum duration:** ${bookingParams.minDurationHours} hours`)
    if (bookingParams.maxDurationHours !== undefined) lines.push(`**Maximum duration:** ${bookingParams.maxDurationHours} hours`)
    if (bookingParams.minAdvanceDays !== undefined) lines.push(`**Minimum advance booking:** ${bookingParams.minAdvanceDays} days`)
    if (bookingParams.maxAdvanceMonths !== undefined) lines.push(`**Maximum advance booking:** ${bookingParams.maxAdvanceMonths} months`)
    if (bookingParams.blockedWeekdays && bookingParams.blockedWeekdays.length > 0) {
      const WEEKDAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const dayNames = bookingParams.blockedWeekdays.map(d => WEEKDAY_NAMES_EN[d]).join(', ')
      lines.push(`**Blocked weekdays:** ${dayNames}`)
    }
  }

  return lines.join('\n')
}

function buildEventTypesSection(eventTypes: EventTypeConfig[], lang: string): string {
  const isSwedish = lang !== 'en'
  const lines: string[] = []

  if (isSwedish) {
    lines.push('# Evenemangstyper')

    const welcome = eventTypes.filter(e => e.status === 'welcome')
    const declined = eventTypes.filter(e => e.status === 'declined')
    const askOwner = eventTypes.filter(e => e.status === 'ask_owner')

    if (welcome.length > 0) {
      lines.push('**Välkomna evenemang:**')
      for (const e of welcome) {
        lines.push(`- ${e.label}${e.note ? ` — ${e.note}` : ''}`)
      }
    }

    if (declined.length > 0) {
      lines.push('**Ej tillgängliga:**')
      for (const e of declined) {
        lines.push(`- ${e.label}${e.note ? ` — ${e.note}` : ''}`)
      }
    }

    if (askOwner.length > 0) {
      lines.push('**Kräver ägarens godkännande (eskalera):**')
      for (const e of askOwner) {
        lines.push(`- ${e.label}${e.note ? ` — ${e.note}` : ''}`)
      }
    }
  } else {
    lines.push('# Event Types')

    const welcome = eventTypes.filter(e => e.status === 'welcome')
    const declined = eventTypes.filter(e => e.status === 'declined')
    const askOwner = eventTypes.filter(e => e.status === 'ask_owner')

    if (welcome.length > 0) {
      lines.push('**Welcome events:**')
      for (const e of welcome) {
        lines.push(`- ${e.label}${e.note ? ` — ${e.note}` : ''}`)
      }
    }

    if (declined.length > 0) {
      lines.push('**Not available:**')
      for (const e of declined) {
        lines.push(`- ${e.label}${e.note ? ` — ${e.note}` : ''}`)
      }
    }

    if (askOwner.length > 0) {
      lines.push('**Requires owner approval (escalate):**')
      for (const e of askOwner) {
        lines.push(`- ${e.label}${e.note ? ` — ${e.note}` : ''}`)
      }
    }
  }

  return lines.join('\n')
}

function buildPoliciesSection(policies: PolicyConfig, lang: string): string {
  const isSwedish = lang !== 'en'
  const lines: string[] = []

  if (isSwedish) {
    lines.push('# Policyer')
    if (policies.cancellation) lines.push(`**Avbokningspolicy:** ${policies.cancellation}`)
    if (policies.deposit) lines.push(`**Depositionsvillkor:** ${policies.deposit}`)
    if (policies.houseRules) lines.push(`**Ordningsregler:** ${policies.houseRules}`)
  } else {
    lines.push('# Policies')
    if (policies.cancellation) lines.push(`**Cancellation policy:** ${policies.cancellation}`)
    if (policies.deposit) lines.push(`**Deposit terms:** ${policies.deposit}`)
    if (policies.houseRules) lines.push(`**House rules:** ${policies.houseRules}`)
  }

  return lines.join('\n')
}

function buildFaqSection(faqEntries: FaqEntry[], lang: string): string {
  const isSwedish = lang !== 'en'
  const lines: string[] = []

  if (isSwedish) {
    lines.push('# Vanliga frågor')
  } else {
    lines.push('# FAQ')
  }

  for (const entry of faqEntries) {
    lines.push(`**F: ${entry.question}**`)
    lines.push(`S: ${entry.answer}`)
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

function buildCalendarSection(calendar: CalendarData, lang: string): string {
  const isSwedish = lang !== 'en'

  // Filter dates to next 3 months
  const now = new Date()
  const threeMonthsFromNow = new Date(now)
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)

  const todayStr = now.toISOString().split('T')[0]
  const maxStr = threeMonthsFromNow.toISOString().split('T')[0]

  const filterDates = (dates: string[]) =>
    dates.filter(d => d >= todayStr && d <= maxStr).sort()

  const blockedFiltered = filterDates(calendar.blockedDates)
  const bookedFiltered = filterDates(calendar.bookedDates)

  const lines: string[] = []

  if (isSwedish) {
    lines.push('# Kalender (nästa 3 månader)')
    lines.push(`**Blockerade datum:** ${formatDateRange(blockedFiltered)}`)
    lines.push(`**Bokade datum:** ${formatDateRange(bookedFiltered)}`)
    lines.push('')
    lines.push('Använd verktyget `check_availability` för att verifiera tillgänglighet för ett specifikt datum innan du kommunicerar det till kunden.')
  } else {
    lines.push('# Calendar (next 3 months)')
    lines.push(`**Blocked dates:** ${formatDateRange(blockedFiltered)}`)
    lines.push(`**Booked dates:** ${formatDateRange(bookedFiltered)}`)
    lines.push('')
    lines.push('Use the `check_availability` tool to verify availability for a specific date before communicating it to the customer.')
  }

  return lines.join('\n')
}

function buildEscalationSection(lang: string): string {
  if (lang === 'en') {
    return `# Escalation Rules

Use the \`escalate_to_owner\` tool when:
- The customer asks about something not covered in this prompt
- The customer requests a special arrangement or exception
- The event type is marked as "ask owner"
- The customer expresses dissatisfaction or makes a complaint
- The booking value is unusually high or the situation is complex
- You are uncertain about any information and cannot find it here

When escalating, provide a clear summary of the customer's request and the reason for escalation.`
  }

  return `# Eskaleringsregler

Använd verktyget \`escalate_to_owner\` när:
- Kunden frågar om något som inte täcks av denna prompt
- Kunden begär ett specialarrangemang eller undantag
- Evenemangstypen är markerad som "fråga ägaren"
- Kunden uttrycker missnöje eller lämnar ett klagomål
- Bokningsvärdet är ovanligt högt eller situationen är komplex
- Du är osäker på information och inte hittar den här

Vid eskalering ska du ge en tydlig sammanfattning av kundens begäran och orsaken till eskaleringen.`
}

export function buildAgentSystemPrompt(
  venue: VenueData,
  config: VenueAgentConfig | null,
  calendar: CalendarData
): string {
  // Determine language from config (default: Swedish)
  const lang = 'sv' // Swedish by default; extend config to support 'en' when needed

  // Cast JSONB fields from config to their TypeScript types
  const pricingRules = (config?.pricing_rules ?? {}) as PricingRules
  const bookingParams = (config?.booking_params ?? {}) as BookingParams
  const eventTypes = (config?.event_types ?? []) as unknown as EventTypeConfig[]
  const policies = (config?.policy_config ?? {}) as PolicyConfig
  const faqEntries = (config?.faq_entries ?? []) as unknown as FaqEntry[]

  const sections: string[] = []

  // 1. Identity + behavior rules
  sections.push(buildIdentitySection(venue.name, lang))

  // 2. Venue profile
  sections.push(buildVenueProfileSection(venue, lang))

  // 3. Pricing
  sections.push(buildPricingSection(venue, pricingRules, lang))

  // 4. Booking parameters
  const hasBookingParams = Object.keys(bookingParams).length > 0
  if (hasBookingParams) {
    sections.push(buildBookingParamsSection(bookingParams, lang))
  }

  // 5. Event types
  if (eventTypes.length > 0) {
    sections.push(buildEventTypesSection(eventTypes, lang))
  }

  // 6. Policies
  const hasPolicies = policies.cancellation || policies.deposit || policies.houseRules
  if (hasPolicies) {
    sections.push(buildPoliciesSection(policies, lang))
  }

  // 7. FAQ
  if (faqEntries.length > 0) {
    sections.push(buildFaqSection(faqEntries, lang))
  }

  // 8. Calendar
  sections.push(buildCalendarSection(calendar, lang))

  // 9. Escalation rules
  sections.push(buildEscalationSection(lang))

  return sections.join('\n\n---\n\n')
}
