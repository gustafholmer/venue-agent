// This file was from the bostadsagent codebase.
// It's kept as a stub to prevent import errors.
// For venue listings, use venue components instead.

'use client'

import { ListingCard, type MatchedListing } from './listing-card'

interface ListingGridProps {
  listings: (MatchedListing & { status?: string; public_date?: string })[]
  favorites?: string[]
  demoMode?: boolean
}

export function ListingGrid({ listings, favorites = [], demoMode }: ListingGridProps) {
  // Stub component - not used in venue-agent
  return (
    <div className="p-4 border rounded-lg">
      <p className="text-gray-500">
        This component is not available. Use venue components instead.
      </p>
    </div>
  )
}
