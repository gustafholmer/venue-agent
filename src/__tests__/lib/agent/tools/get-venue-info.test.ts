import { describe, it, expect } from 'vitest'
import { getVenueInfo } from '@/lib/agent/tools/get-venue-info'
import type { VenueAgentConfig } from '@/types/agent-booking'
import type { Json } from '@/types/database'

function makeConfig(overrides: Partial<Record<string, Json | null>> = {}): VenueAgentConfig {
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

const baseVenue: Record<string, unknown> = {
  name: 'Test Venue',
  amenities: ['Parkering', 'WiFi', 'Projektor'],
  capacity_standing: 200,
  capacity_seated: 100,
  capacity_conference: 50,
  min_guests: 10,
  price_per_hour: 1000,
  price_half_day: 4000,
  price_full_day: 8000,
  price_evening: 6000,
  address: 'Storgatan 1',
  area: 'Södermalm',
  city: 'Stockholm',
}

describe('getVenueInfo', () => {
  it('returns FAQ answer when topic matches a FAQ entry', () => {
    const config = makeConfig({
      faq_entries: [
        { question: 'Finns det parkering?', answer: 'Ja, vi har 20 platser.' },
      ] as unknown as Json,
    })

    const result = getVenueInfo({ topic: 'parkering' }, baseVenue, config)

    expect(result.found).toBe(true)
    expect(result.answer).toBe('Ja, vi har 20 platser.')
  })

  it('returns parking info from amenities', () => {
    const config = makeConfig()

    const result = getVenueInfo({ topic: 'parking' }, baseVenue, config)

    expect(result.found).toBe(true)
    expect(result.answer).toContain('parkering')
  })

  it('returns capacity info', () => {
    const config = makeConfig()

    const result = getVenueInfo({ topic: 'capacity' }, baseVenue, config)

    expect(result.found).toBe(true)
    expect(result.answer).toContain('200')
    expect(result.answer).toContain('100')
  })

  it('returns pricing info', () => {
    const config = makeConfig()

    const result = getVenueInfo({ topic: 'pricing' }, baseVenue, config)

    expect(result.found).toBe(true)
    expect(result.answer).toContain('1000')
  })

  it('returns "not found" for unknown topics', () => {
    const config = makeConfig()

    const result = getVenueInfo({ topic: 'swimming pool' }, baseVenue, config)

    expect(result.found).toBe(false)
    expect(result.answer).toBeTruthy()
  })

  it('handles empty config gracefully', () => {
    const config = makeConfig()
    const emptyVenue: Record<string, unknown> = {
      name: 'Empty Venue',
      amenities: [],
    }

    // Should not throw even with minimal data
    const result = getVenueInfo({ topic: 'parking' }, emptyVenue, config)

    expect(result.found).toBe(true) // parking handler always returns found:true
    expect(result.answer).toBeTruthy()
  })
})
