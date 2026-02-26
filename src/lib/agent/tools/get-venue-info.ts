import type { VenueAgentConfig } from '@/types/agent-booking'
import type { FaqEntry, PolicyConfig } from '@/types/agent-booking'

interface GetVenueInfoArgs {
  topic: string
}

interface GetVenueInfoResult {
  found: boolean
  answer: string
}

type VenueData = Record<string, unknown>

/**
 * Look up specific venue information by topic.
 * Pure function (no DB calls).
 *
 * Checks FAQ entries first, then venue data fields.
 * Returns structured answer in Swedish.
 */
export function getVenueInfo(
  args: GetVenueInfoArgs,
  venue: VenueData,
  config: VenueAgentConfig
): GetVenueInfoResult {
  const topic = args.topic.toLowerCase().trim()

  // 1. Check FAQ entries first
  const faqEntries = (config.faq_entries as FaqEntry[] | null) || []
  const faqMatch = findFaqMatch(topic, faqEntries)
  if (faqMatch) {
    return { found: true, answer: faqMatch }
  }

  // 2. Check topic-specific venue data
  const topicHandlers: Record<string, () => GetVenueInfoResult> = {
    parking: () => handleParking(venue),
    parkering: () => handleParking(venue),
    amenities: () => handleAmenities(venue),
    faciliteter: () => handleAmenities(venue),
    utrustning: () => handleAmenities(venue),
    policies: () => handlePolicies(config),
    regler: () => handlePolicies(config),
    villkor: () => handlePolicies(config),
    cancellation: () => handleCancellation(config),
    avbokning: () => handleCancellation(config),
    catering: () => handleCatering(venue, faqEntries),
    mat: () => handleCatering(venue, faqEntries),
    equipment: () => handleEquipment(venue),
    teknik: () => handleEquipment(venue),
    accessibility: () => handleAccessibility(venue),
    tillganglighet: () => handleAccessibility(venue),
    location: () => handleLocation(venue),
    plats: () => handleLocation(venue),
    adress: () => handleLocation(venue),
    capacity: () => handleCapacity(venue),
    kapacitet: () => handleCapacity(venue),
    pricing: () => handlePricing(venue, config),
    pris: () => handlePricing(venue, config),
    priser: () => handlePricing(venue, config),
  }

  // Direct topic match
  const handler = topicHandlers[topic]
  if (handler) {
    return handler()
  }

  // Partial match: check if topic contains any known keyword
  for (const [keyword, keyHandler] of Object.entries(topicHandlers)) {
    if (topic.includes(keyword)) {
      return keyHandler()
    }
  }

  return {
    found: false,
    answer: 'Jag har tyvärr inte specifik information om det ämnet. Vill du att jag kontaktar lokalägaren?',
  }
}

function findFaqMatch(topic: string, faqEntries: FaqEntry[]): string | null {
  for (const entry of faqEntries) {
    const question = entry.question.toLowerCase()
    if (
      question.includes(topic) ||
      topic.includes(question) ||
      topicMatchesQuestion(topic, question)
    ) {
      return entry.answer
    }
  }
  return null
}

function topicMatchesQuestion(topic: string, question: string): boolean {
  // Split both into words and check for significant overlap
  const topicWords = topic.split(/\s+/).filter((w) => w.length > 2)
  const questionWords = question.split(/\s+/).filter((w) => w.length > 2)
  const matches = topicWords.filter((w) => questionWords.some((qw) => qw.includes(w) || w.includes(qw)))
  return matches.length > 0 && matches.length >= topicWords.length * 0.5
}

function handleParking(venue: VenueData): GetVenueInfoResult {
  const amenities = (venue.amenities as string[]) || []
  const hasParking = amenities.some(
    (a) => a.toLowerCase().includes('parkering') || a.toLowerCase().includes('parking')
  )

  if (hasParking) {
    return {
      found: true,
      answer: 'Ja, det finns parkering tillgänglig vid lokalen.',
    }
  }

  return {
    found: true,
    answer: 'Det finns ingen specifik information om parkering. Kontakta lokalägaren för mer detaljer.',
  }
}

function handleAmenities(venue: VenueData): GetVenueInfoResult {
  const amenities = (venue.amenities as string[]) || []
  if (amenities.length === 0) {
    return {
      found: false,
      answer: 'Ingen information om faciliteter finns tillgänglig.',
    }
  }

  return {
    found: true,
    answer: `Lokalen erbjuder: ${amenities.join(', ')}.`,
  }
}

function handlePolicies(config: VenueAgentConfig): GetVenueInfoResult {
  const policies = config.policy_config as PolicyConfig | null
  if (!policies) {
    return {
      found: false,
      answer: 'Ingen specifik policyinformation finns tillgänglig. Kontakta lokalägaren för mer detaljer.',
    }
  }

  const parts: string[] = []
  if (policies.houseRules) parts.push(`Ordningsregler: ${policies.houseRules}`)
  if (policies.deposit) parts.push(`Deposition: ${policies.deposit}`)
  if (policies.cancellation) parts.push(`Avbokning: ${policies.cancellation}`)

  if (parts.length === 0) {
    return {
      found: false,
      answer: 'Ingen specifik policyinformation finns tillgänglig.',
    }
  }

  return { found: true, answer: parts.join('\n') }
}

function handleCancellation(config: VenueAgentConfig): GetVenueInfoResult {
  const policies = config.policy_config as PolicyConfig | null
  if (!policies?.cancellation) {
    return {
      found: false,
      answer: 'Ingen specifik avbokningspolicy finns angiven. Kontakta lokalägaren för mer detaljer.',
    }
  }

  return { found: true, answer: `Avbokningspolicy: ${policies.cancellation}` }
}

function handleCatering(venue: VenueData, faqEntries: FaqEntry[]): GetVenueInfoResult {
  // Check FAQ for catering info
  const cateringFaq = faqEntries.find(
    (e) =>
      e.question.toLowerCase().includes('catering') ||
      e.question.toLowerCase().includes('mat') ||
      e.question.toLowerCase().includes('dryck')
  )

  if (cateringFaq) {
    return { found: true, answer: cateringFaq.answer }
  }

  const amenities = (venue.amenities as string[]) || []
  const hasCatering = amenities.some(
    (a) =>
      a.toLowerCase().includes('catering') ||
      a.toLowerCase().includes('kök') ||
      a.toLowerCase().includes('mat')
  )

  if (hasCatering) {
    return {
      found: true,
      answer: 'Lokalen har möjlighet för catering/matservering. Kontakta oss för mer detaljer om alternativ.',
    }
  }

  return {
    found: false,
    answer: 'Ingen specifik information om catering finns tillgänglig. Vill du att jag frågar lokalägaren?',
  }
}

function handleEquipment(venue: VenueData): GetVenueInfoResult {
  const amenities = (venue.amenities as string[]) || []
  const equipment = amenities.filter(
    (a) =>
      a.toLowerCase().includes('projektor') ||
      a.toLowerCase().includes('ljud') ||
      a.toLowerCase().includes('mikrofon') ||
      a.toLowerCase().includes('whiteboard') ||
      a.toLowerCase().includes('skärm') ||
      a.toLowerCase().includes('wifi') ||
      a.toLowerCase().includes('teknik')
  )

  if (equipment.length > 0) {
    return {
      found: true,
      answer: `Tillgänglig utrustning: ${equipment.join(', ')}.`,
    }
  }

  return {
    found: false,
    answer: 'Ingen specifik utrustningsinformation finns tillgänglig. Kontakta lokalägaren för mer detaljer.',
  }
}

function handleAccessibility(venue: VenueData): GetVenueInfoResult {
  const amenities = (venue.amenities as string[]) || []
  const accessibilityFeatures = amenities.filter(
    (a) =>
      a.toLowerCase().includes('handikapp') ||
      a.toLowerCase().includes('tillgänglig') ||
      a.toLowerCase().includes('hiss') ||
      a.toLowerCase().includes('rullstol')
  )

  if (accessibilityFeatures.length > 0) {
    return {
      found: true,
      answer: `Tillgänglighet: ${accessibilityFeatures.join(', ')}.`,
    }
  }

  return {
    found: false,
    answer: 'Ingen specifik tillgänglighetsinformation finns angiven. Kontakta lokalägaren för mer detaljer.',
  }
}

function handleLocation(venue: VenueData): GetVenueInfoResult {
  const parts: string[] = []
  if (venue.address) parts.push(`Adress: ${venue.address}`)
  if (venue.area) parts.push(`Område: ${venue.area}`)
  if (venue.city) parts.push(`Stad: ${venue.city}`)

  if (parts.length === 0) {
    return { found: false, answer: 'Ingen platsinformation finns tillgänglig.' }
  }

  return { found: true, answer: parts.join('\n') }
}

function handleCapacity(venue: VenueData): GetVenueInfoResult {
  const parts: string[] = []
  if (venue.capacity_standing)
    parts.push(`Ståplats: upp till ${venue.capacity_standing} personer`)
  if (venue.capacity_seated)
    parts.push(`Sittande: upp till ${venue.capacity_seated} personer`)
  if (venue.capacity_conference)
    parts.push(`Konferens: upp till ${venue.capacity_conference} personer`)
  if (venue.min_guests)
    parts.push(`Minsta antal gäster: ${venue.min_guests}`)

  if (parts.length === 0) {
    return {
      found: false,
      answer: 'Ingen kapacitetsinformation finns tillgänglig.',
    }
  }

  return { found: true, answer: parts.join('\n') }
}

function handlePricing(venue: VenueData, config: VenueAgentConfig): GetVenueInfoResult {
  const parts: string[] = []

  if (venue.price_per_hour)
    parts.push(`Timpris: ${venue.price_per_hour} kr/timme`)
  if (venue.price_half_day)
    parts.push(`Halvdag: ${venue.price_half_day} kr`)
  if (venue.price_full_day)
    parts.push(`Heldag: ${venue.price_full_day} kr`)
  if (venue.price_evening)
    parts.push(`Kväll: ${venue.price_evening} kr`)
  if (venue.price_notes)
    parts.push(`OBS: ${venue.price_notes}`)

  const pricingRules = config.pricing_rules as { notes?: string } | null
  if (pricingRules?.notes) {
    parts.push(pricingRules.notes)
  }

  if (parts.length === 0) {
    return {
      found: false,
      answer: 'Ingen prisinformation finns tillgänglig. Kontakta lokalägaren för offert.',
    }
  }

  return {
    found: true,
    answer: `Prisinformation:\n${parts.join('\n')}`,
  }
}
