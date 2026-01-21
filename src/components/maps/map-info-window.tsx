'use client'

import { InfoWindowF } from '@react-google-maps/api'
import Link from 'next/link'
import type { VenueMarkerData } from './venue-marker'

interface MapInfoWindowProps {
  venue: VenueMarkerData
  onClose: () => void
}

function formatPrice(price: number | null | undefined): string {
  if (!price) return 'Pris på förfrågan'
  return `från ${price.toLocaleString('sv-SE')} kr`
}

export function MapInfoWindow({ venue, onClose }: MapInfoWindowProps) {
  const href = venue.slug ? `/venues/${venue.slug}` : `/venues/${venue.id}`

  return (
    <InfoWindowF
      position={{ lat: venue.latitude, lng: venue.longitude }}
      onCloseClick={onClose}
      options={{
        pixelOffset: new google.maps.Size(0, -30),
        maxWidth: 280,
      }}
    >
      <div className="p-1">
        <Link href={href} className="block group">
          {venue.imageUrl && (
            <div className="aspect-[3/2] w-full mb-2 overflow-hidden rounded">
              <img
                src={venue.imageUrl}
                alt={venue.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
          <h3 className="font-medium text-[#1a1a1a] group-hover:text-[#c45a3b] transition-colors text-sm">
            {venue.name}
          </h3>
          {venue.area && (
            <p className="text-xs text-[#78716c] mt-0.5">{venue.area}</p>
          )}
          <p className="text-xs text-[#1a1a1a] mt-1">{formatPrice(venue.price)}</p>
          <span className="inline-block mt-2 text-xs text-[#c45a3b] group-hover:underline">
            Visa lokal →
          </span>
        </Link>
      </div>
    </InfoWindowF>
  )
}
