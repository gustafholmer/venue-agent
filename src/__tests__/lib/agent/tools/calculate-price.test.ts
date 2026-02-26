import { describe, it, expect } from 'vitest'
import { calculatePrice } from '@/lib/agent/tools/calculate-price'
import type { PricingRules } from '@/types/agent-booking'

const emptyVenuePricing = {
  price_per_hour: null,
  price_half_day: null,
  price_full_day: null,
  price_evening: null,
}

const baseArgs = {
  guestCount: 50,
  durationHours: 3,
  eventType: 'party',
}

describe('calculatePrice', () => {
  it('calculates price from hourly rate x duration (venue fallback)', () => {
    const venuePricing = {
      ...emptyVenuePricing,
      price_per_hour: 1000,
    }

    const result = calculatePrice(baseArgs, null, venuePricing)

    expect(result.basePrice).toBe(3000) // 1000 * 3 hours
  })

  it('uses half-day price when duration is appropriate', () => {
    const venuePricing = {
      ...emptyVenuePricing,
      price_per_hour: 1000,
      price_half_day: 4000,
    }

    // Duration 5 hours: exceeds 4h per-hour threshold, falls to half-day (<=5h)
    const result = calculatePrice(
      { ...baseArgs, durationHours: 5 },
      null,
      venuePricing
    )

    expect(result.basePrice).toBe(4000)
  })

  it('uses full-day price for long events', () => {
    const venuePricing = {
      ...emptyVenuePricing,
      price_per_hour: 1000,
      price_half_day: 4000,
      price_full_day: 8000,
    }

    const result = calculatePrice(
      { ...baseArgs, durationHours: 8 },
      null,
      venuePricing
    )

    expect(result.basePrice).toBe(8000)
  })

  it('uses evening price for evening pricing', () => {
    const venuePricing = {
      ...emptyVenuePricing,
      price_evening: 6000,
    }

    // Duration 5 hours, no per-hour or half-day, but evening is available and <=6h
    const result = calculatePrice(
      { ...baseArgs, durationHours: 5 },
      null,
      venuePricing
    )

    expect(result.basePrice).toBe(6000)
  })

  it('adds per-person cost when per-person rate is set', () => {
    const pricingRules: PricingRules = {
      basePrice: 5000,
      perPersonRate: 100,
    }

    const result = calculatePrice(baseArgs, pricingRules, emptyVenuePricing)

    // basePrice (5000) + perPersonRate (100) * guestCount (50) = 10000
    expect(result.basePrice).toBe(10000)
    expect(result.perPersonCost).toBe(5000)
  })

  it('applies minimum spend when total is below minimum', () => {
    const pricingRules: PricingRules = {
      basePrice: 2000,
      minimumSpend: 10000,
    }

    const result = calculatePrice(baseArgs, pricingRules, emptyVenuePricing)

    expect(result.basePrice).toBe(10000)
  })

  it('uses package price when package is selected', () => {
    const pricingRules: PricingRules = {
      packages: [
        {
          name: 'Premium',
          price: 15000,
          description: 'Full package',
          perPerson: false,
        },
      ],
    }

    const result = calculatePrice(
      { ...baseArgs, packageName: 'premium' },
      pricingRules,
      emptyVenuePricing
    )

    expect(result.basePrice).toBe(15000)
    expect(result.packageCost).toBe(15000)
  })

  it('per-person package multiplies by guest count', () => {
    const pricingRules: PricingRules = {
      packages: [
        {
          name: 'Buffet',
          price: 200,
          description: 'Per person buffet',
          perPerson: true,
        },
      ],
    }

    const result = calculatePrice(
      { ...baseArgs, packageName: 'Buffet' },
      pricingRules,
      emptyVenuePricing
    )

    // 200 * 50 guests = 10000
    expect(result.basePrice).toBe(10000)
    expect(result.packageCost).toBe(10000)
  })

  it('returns correct platform fee (12%)', () => {
    const pricingRules: PricingRules = {
      basePrice: 10000,
    }

    const result = calculatePrice(baseArgs, pricingRules, emptyVenuePricing)

    expect(result.platformFee).toBe(1200) // 10000 * 0.12
  })

  it('returns correct total (base + fee)', () => {
    const pricingRules: PricingRules = {
      basePrice: 10000,
    }

    const result = calculatePrice(baseArgs, pricingRules, emptyVenuePricing)

    expect(result.totalPrice).toBe(11200) // 10000 + 1200
    expect(result.totalPrice).toBe(result.basePrice + result.platformFee)
  })

  it('falls back to venue pricing when no pricing rules configured', () => {
    const venuePricing = {
      ...emptyVenuePricing,
      price_per_hour: 2000,
    }

    // pricingRules is null, so should fall through to venue pricing
    const result = calculatePrice(baseArgs, null, venuePricing)

    expect(result.basePrice).toBe(6000) // 2000 * 3 hours
  })

  it('returns zero prices when no pricing info available', () => {
    const result = calculatePrice(baseArgs, null, emptyVenuePricing)

    expect(result.basePrice).toBe(0)
    expect(result.platformFee).toBe(0)
    expect(result.totalPrice).toBe(0)
  })
})
