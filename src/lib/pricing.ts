// Platform fee is 12% of base price
export const PLATFORM_FEE_RATE = 0.12

export function calculatePricing(basePrice: number) {
  const platformFee = Math.round(basePrice * PLATFORM_FEE_RATE)
  const totalPrice = basePrice + platformFee
  const venuePayout = basePrice

  return {
    basePrice,
    platformFee,
    totalPrice,
    venuePayout,
  }
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
