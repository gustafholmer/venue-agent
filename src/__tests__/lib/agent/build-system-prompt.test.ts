import { describe, it, expect } from 'vitest'
import { buildAgentSystemPrompt } from '@/lib/agent/build-system-prompt'
import type { VenueData, CalendarData } from '@/lib/agent/build-system-prompt'
import type { VenueAgentConfig } from '@/types/agent-booking'
import type { Json } from '@/types/database'

const baseVenue: VenueData = {
  name: 'Test Venue',
  description: 'A great venue for events',
  area: 'Södermalm',
  city: 'Stockholm',
  address: 'Storgatan 1',
  capacity_standing: 200,
  capacity_seated: 100,
  capacity_conference: 50,
  min_guests: 10,
  amenities: ['WiFi', 'Projektor'],
  venue_types: ['Fest', 'Konferens'],
  vibes: ['Modern', 'Elegant'],
  price_per_hour: 1000,
  price_half_day: 4000,
  price_full_day: 8000,
  price_evening: 6000,
  price_notes: 'Moms ingår',
  website: 'https://example.com',
  contact_email: 'info@example.com',
  contact_phone: '08-123456',
}

const baseCalendar: CalendarData = {
  blockedDates: [],
  bookedDates: [],
}

function makeConfig(overrides: Partial<Record<string, Json | null | boolean | string | number>> = {}): VenueAgentConfig {
  return {
    id: 'config-1',
    venue_id: 'venue-1',
    is_enabled: true,
    greeting_message: null,
    pricing_rules: null,
    booking_params: null,
    event_types: null,
    policy_config: null,
    faq_entries: null,
    auto_approve: false,
    approval_threshold: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  } as VenueAgentConfig
}

describe('buildAgentSystemPrompt', () => {
  it('includes venue name in prompt', () => {
    const config = makeConfig()
    const result = buildAgentSystemPrompt(baseVenue, config, baseCalendar)

    expect(result).toContain('Test Venue')
  })

  it('includes pricing section when pricing rules exist', () => {
    const config = makeConfig({
      pricing_rules: {
        basePrice: 5000,
        perPersonRate: 100,
      } as unknown as Json,
    })

    const result = buildAgentSystemPrompt(baseVenue, config, baseCalendar)

    expect(result).toContain('Prissättning')
    expect(result).toContain('5000')
  })

  it('omits base price line when no pricing rules base price, but still shows venue prices', () => {
    const config = makeConfig({
      pricing_rules: null,
    })

    const result = buildAgentSystemPrompt(baseVenue, config, baseCalendar)

    // Should still have the pricing section with venue fallback prices
    expect(result).toContain('Prissättning')
    // Venue price_per_hour should appear as fallback
    expect(result).toContain('1000')
  })

  it('includes FAQ entries', () => {
    const config = makeConfig({
      faq_entries: [
        { question: 'Finns parkering?', answer: 'Ja, 20 platser.' },
        { question: 'Kan vi ta med egen mat?', answer: 'Nej, vi har catering.' },
      ] as unknown as Json,
    })

    const result = buildAgentSystemPrompt(baseVenue, config, baseCalendar)

    expect(result).toContain('Vanliga frågor')
    expect(result).toContain('Finns parkering?')
    expect(result).toContain('Ja, 20 platser.')
    expect(result).toContain('Kan vi ta med egen mat?')
  })

  it('includes calendar data', () => {
    // Use dates far in the future to ensure they pass the 3-month filter
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    const futureStr = futureDate.toISOString().split('T')[0]

    const calendar: CalendarData = {
      blockedDates: [futureStr],
      bookedDates: [],
    }

    const result = buildAgentSystemPrompt(baseVenue, makeConfig(), calendar)

    expect(result).toContain('Kalender')
    expect(result).toContain(futureStr)
  })

  it('includes escalation rules', () => {
    const result = buildAgentSystemPrompt(baseVenue, makeConfig(), baseCalendar)

    expect(result).toContain('Eskaleringsregler')
    expect(result).toContain('escalate_to_owner')
  })

  it('uses Swedish by default', () => {
    const result = buildAgentSystemPrompt(baseVenue, makeConfig(), baseCalendar)

    // Swedish identity section
    expect(result).toContain('Identitet & Beteende')
    expect(result).toContain('bokningsassistent')
    // Should not contain English equivalents
    expect(result).not.toContain('Identity & Behavior')
  })

  it('handles null config gracefully', () => {
    // Should not throw when config is null
    const result = buildAgentSystemPrompt(baseVenue, null, baseCalendar)

    expect(result).toContain('Test Venue')
    expect(result).toContain('Identitet & Beteende')
    // Should still produce a valid prompt with defaults
    expect(result.length).toBeGreaterThan(100)
  })
})
