'use client'

import { VenueMap, VenueMarkerData } from './index'

interface VenueDetailMapProps {
  venue: {
    id: string
    name: string
    slug: string | null
    area: string | null
    latitude: number
    longitude: number
  }
  address: string
  googleMapsUrl?: string
}

export function VenueDetailMap({ venue, address, googleMapsUrl }: VenueDetailMapProps) {
  const markerData: VenueMarkerData = {
    id: venue.id,
    name: venue.name,
    slug: venue.slug,
    area: venue.area,
    latitude: venue.latitude,
    longitude: venue.longitude,
  }

  const mapsUrl = googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  return (
    <div className="space-y-3">
      <VenueMap
        venues={[markerData]}
        height="250px"
        singleVenue
        zoom={15}
      />
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#1e3a8a] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
        Öppna i Google Maps
      </a>
    </div>
  )
}
