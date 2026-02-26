import { PLATFORM_FEE_RATE } from '@/lib/pricing'
import type { PriceBreakdown, PricingRules } from '@/types/agent-booking'

interface CalculatePriceArgs {
  guestCount: number
  durationHours: number
  eventType: string
  packageName?: string
}

interface VenuePricingFallback {
  price_per_hour: number | null
  price_half_day: number | null
  price_full_day: number | null
  price_evening: number | null
}

/**
 * Calculate price from venue pricing rules.
 * Pure function (no DB calls) - testable without mocking.
 *
 * Priority:
 * 1. Package price (if packageName specified and found in PricingRules)
 * 2. PricingRules basePrice + perPersonRate
 * 3. Venue pricing fields as fallback (price_per_hour, price_half_day, etc.)
 *
 * Platform fee is 12%.
 */
export function calculatePrice(
  args: CalculatePriceArgs,
  pricingRules: PricingRules | null,
  venuePricing: VenuePricingFallback
): PriceBreakdown {
  const { guestCount, durationHours, packageName } = args

  let basePrice = 0
  let perPersonCost: number | undefined
  let packageCost: number | undefined

  // 1. Check for package pricing
  if (packageName && pricingRules?.packages) {
    const pkg = pricingRules.packages.find(
      (p) => p.name.toLowerCase() === packageName.toLowerCase()
    )
    if (pkg) {
      if (pkg.perPerson) {
        packageCost = pkg.price * guestCount
      } else {
        packageCost = pkg.price
      }
      basePrice = packageCost
    }
  }

  // 2. Use PricingRules if available and no package was applied
  if (basePrice === 0 && pricingRules) {
    if (pricingRules.basePrice) {
      basePrice = pricingRules.basePrice
    }
    if (pricingRules.perPersonRate) {
      perPersonCost = pricingRules.perPersonRate * guestCount
      basePrice += perPersonCost
    }
  }

  // 3. Fall back to venue pricing fields
  if (basePrice === 0) {
    basePrice = calculateFromVenuePricing(durationHours, venuePricing)
  }

  // Apply minimum spend if set
  if (pricingRules?.minimumSpend && basePrice < pricingRules.minimumSpend) {
    basePrice = pricingRules.minimumSpend
  }

  const totalBeforeFee = basePrice
  const platformFee = Math.round(totalBeforeFee * PLATFORM_FEE_RATE)
  const totalPrice = totalBeforeFee + platformFee

  return {
    basePrice,
    perPersonCost,
    packageCost,
    totalBeforeFee,
    platformFee,
    totalPrice,
  }
}

/**
 * Calculate base price from venue pricing fields based on duration.
 */
function calculateFromVenuePricing(
  durationHours: number,
  pricing: VenuePricingFallback
): number {
  // For short events (up to 4 hours), use per-hour rate if available
  if (durationHours <= 4 && pricing.price_per_hour) {
    return pricing.price_per_hour * durationHours
  }

  // For half-day events (up to 5 hours)
  if (durationHours <= 5 && pricing.price_half_day) {
    return pricing.price_half_day
  }

  // For evening events (typically 4-6 hours in evening)
  if (pricing.price_evening && durationHours <= 6) {
    return pricing.price_evening
  }

  // For full-day events
  if (pricing.price_full_day) {
    return pricing.price_full_day
  }

  // Last resort: use whatever price is available
  if (pricing.price_evening) return pricing.price_evening
  if (pricing.price_half_day) return pricing.price_half_day
  if (pricing.price_per_hour) return pricing.price_per_hour * durationHours

  return 0
}
