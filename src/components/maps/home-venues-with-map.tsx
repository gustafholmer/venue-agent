'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { VenueCard, type VenueCardData } from '@/components/venues/venue-card'
import { VenueMap, type VenueMarkerData } from '@/components/maps'

interface HomeVenuesWithMapProps {
  venues: VenueCardData[]
}

export function HomeVenuesWithMap({ venues }: HomeVenuesWithMapProps) {
  const [hoveredVenueId, setHoveredVenueId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')

  const venuesForMap: VenueMarkerData[] = useMemo(() => {
    return venues
      .filter((v) => v.latitude && v.longitude)
      .map((venue) => ({
        id: venue.id,
        name: venue.name,
        slug: venue.slug,
        area: venue.area,
        latitude: venue.latitude!,
        longitude: venue.longitude!,
        price: venue.price_evening || venue.price_full_day || venue.price_half_day || venue.price_per_hour,
        imageUrl: venue.primaryPhotoUrl,
      }))
  }, [venues])

  const handleVenueHover = useCallback((venueId: string | null) => {
    setHoveredVenueId(venueId)
  }, [])

  return (
    <section className="border-t border-[#e7e5e4]">
      {/* Mobile view toggle */}
      <div className="lg:hidden px-4 py-3 border-b border-[#e7e5e4] flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-widest text-[#78716c]">
          Lokaler
        </h2>
        <div className="flex border border-[#e7e5e4] rounded-full overflow-hidden">
          <button
            onClick={() => setMobileView('list')}
            className={`px-3 h-8 text-sm transition-colors ${
              mobileView === 'list'
                ? 'bg-[#1a1a1a] text-white'
                : 'bg-white text-[#78716c] hover:text-[#1a1a1a]'
            }`}
          >
            Lista
          </button>
          <button
            onClick={() => setMobileView('map')}
            className={`px-3 h-8 text-sm transition-colors ${
              mobileView === 'map'
                ? 'bg-[#1a1a1a] text-white'
                : 'bg-white text-[#78716c] hover:text-[#1a1a1a]'
            }`}
          >
            Karta
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:h-[600px]">
        {/* Mobile map view */}
        <div className={`lg:hidden ${mobileView === 'map' ? 'block' : 'hidden'}`}>
          <div className="h-[400px]">
            <VenueMap
              venues={venuesForMap}
              height="100%"
              hoveredVenueId={hoveredVenueId}
              onVenueHover={handleVenueHover}
            />
          </div>
        </div>

        {/* Venue list */}
        <div className={`lg:w-[60%] px-4 sm:px-6 py-6 lg:py-8 lg:overflow-y-auto ${
          mobileView === 'list' ? 'block' : 'hidden lg:block'
        }`}>
          <div className="hidden lg:flex items-end justify-between mb-6">
            <h2 className="text-sm uppercase tracking-widest text-[#78716c]">
              Lokaler
            </h2>
            <Link
              href="/venues"
              className="text-sm text-[#1a1a1a] underline underline-offset-4 hover:text-[#c45a3b]"
            >
              Visa alla lokaler
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8">
            {venues.map((venue) => (
              <div
                key={venue.id}
                onMouseEnter={() => setHoveredVenueId(venue.id)}
                onMouseLeave={() => setHoveredVenueId(null)}
                className={`transition-shadow duration-200 ${
                  hoveredVenueId === venue.id ? 'ring-2 ring-[#c45a3b] ring-offset-2 rounded-lg' : ''
                }`}
              >
                <VenueCard venue={venue} />
              </div>
            ))}
          </div>

          <div className="mt-8 text-center lg:hidden">
            <Link
              href="/venues"
              className="text-sm text-[#1a1a1a] underline underline-offset-4 hover:text-[#c45a3b]"
            >
              Visa alla lokaler
            </Link>
          </div>
        </div>

        {/* Desktop map */}
        <div className="hidden lg:block lg:w-[40%] border-l border-[#e7e5e4]">
          <VenueMap
            venues={venuesForMap}
            height="100%"
            hoveredVenueId={hoveredVenueId}
            onVenueHover={handleVenueHover}
          />
        </div>
      </div>
    </section>
  )
}
