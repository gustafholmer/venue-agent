// This file was from the bostadsagent codebase.
// It's kept as a stub to prevent import errors.
// For venue cards, use @/components/venues/venue-card instead.

'use client'

export interface MatchedListing {
  id: string
  title: string
  description: string | null
  price: number
  rooms: number
  area_sqm: number
  address: string
  district: string
  features: string[]
  monthly_fee: number
  year_built: number | null
  images: string[]
  explanation: string | null
}

interface ListingCardProps {
  listing: MatchedListing & { status?: string; public_date?: string }
  isFavorite?: boolean
  onFavorite?: () => void
  onDismiss?: () => void
  demoMode?: boolean
}

export function ListingCard({
  listing,
  isFavorite,
  onFavorite,
  onDismiss,
  demoMode,
}: ListingCardProps) {
  // Stub component - not used in venue-agent
  return (
    <div className="p-4 border rounded-lg">
      <p className="text-gray-500">
        This component is not available. Use venue components instead.
      </p>
    </div>
  )
}
