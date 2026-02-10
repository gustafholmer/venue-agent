'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getSavedVenues, type SavedVenueWithDetails } from '@/actions/saved-venues/get-saved-venues'
import { unsaveVenue } from '@/actions/saved-venues/unsave-venue'

function formatPrice(venue: SavedVenueWithDetails['venue']): string {
  const price = venue.price_evening || venue.price_full_day || venue.price_half_day || venue.price_per_hour
  if (!price) return 'Pris på förfrågan'
  return `Från ${price.toLocaleString('sv-SE')} SEK`
}

function formatCapacity(venue: SavedVenueWithDetails['venue']): string {
  const capacities: string[] = []

  if (venue.capacity_standing) {
    capacities.push(`${venue.capacity_standing} stående`)
  }
  if (venue.capacity_seated) {
    capacities.push(`${venue.capacity_seated} sittande`)
  }

  if (capacities.length === 0) {
    return 'Kapacitet på förfrågan'
  }

  return capacities.join(' / ')
}

export default function SavedVenuesPage() {
  const [savedVenues, setSavedVenues] = useState<SavedVenueWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSavedVenues() {
      setIsLoading(true)
      const result = await getSavedVenues()
      if (result.success && result.venues) {
        setSavedVenues(result.venues)
        setError(null)
      } else {
        setError(result.error || 'Kunde inte hämta sparade lokaler')
        setSavedVenues([])
      }
      setIsLoading(false)
    }

    fetchSavedVenues()
  }, [])

  const handleRemove = async (venueId: string) => {
    setRemovingId(venueId)

    const result = await unsaveVenue(venueId)

    if (result.success) {
      setSavedVenues(prev => prev.filter(sv => sv.venue_id !== venueId))
    } else {
      setError(result.error || 'Kunde inte ta bort lokalen')
    }

    setRemovingId(null)
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">Sparade lokaler</h1>
        <p className="text-[#78716c] mt-1">
          Dina favoritlokaler på ett ställe
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
              {/* Image skeleton */}
              <div className="aspect-[4/3] bg-[#f3f4f6]" />
              {/* Content skeleton */}
              <div className="p-4">
                <div className="h-6 bg-[#e7e5e4] rounded w-3/4 mb-2" />
                <div className="h-4 bg-[#e7e5e4] rounded w-1/2 mb-3" />
                <div className="h-4 bg-[#e7e5e4] rounded w-2/3 mb-2" />
                <div className="h-5 bg-[#e7e5e4] rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && savedVenues.length === 0 && (
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#f3f4f6] rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-[#a8a29e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">Inga sparade lokaler</h3>
          <p className="text-[#78716c] mb-4">
            Du har inte sparat några lokaler ännu. Utforska våra lokaler och spara dina favoriter!
          </p>
          <Link
            href="/venues"
            className="inline-flex items-center justify-center px-4 py-2 bg-[#c45a3b] text-white rounded-lg hover:bg-[#b3512f] transition-colors"
          >
            Utforska lokaler
          </Link>
        </div>
      )}

      {/* Venues grid */}
      {!isLoading && !error && savedVenues.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedVenues.map((savedVenue) => {
            const { venue } = savedVenue
            const href = venue.slug ? `/venues/${venue.slug}` : `/venues/${venue.id}`
            const isRemoving = removingId === venue.id

            return (
              <div
                key={savedVenue.id}
                className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden hover:shadow-lg transition-all group"
              >
                {/* Image with remove button */}
                <div className="relative">
                  <Link href={href}>
                    <div className="aspect-[4/3] bg-[#faf9f7] overflow-hidden">
                      {venue.primary_photo?.url ? (
                        <img
                          src={venue.primary_photo.url}
                          alt={venue.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-12 h-12 text-[#d1d5db]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemove(venue.id)}
                    disabled={isRemoving}
                    className="absolute top-3 right-3 p-2 bg-white/90 rounded-full shadow-md hover:bg-white transition-colors disabled:opacity-50"
                    title="Ta bort från sparade"
                  >
                    {isRemoving ? (
                      <div className="w-5 h-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                    ) : (
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Content */}
                <Link href={href}>
                  <div className="p-4">
                    {/* Name */}
                    <h3 className="font-semibold text-[#1a1a1a] text-lg mb-1 line-clamp-1 group-hover:text-[#c45a3b] transition-colors">
                      {venue.name}
                    </h3>

                    {/* Location */}
                    <p className="text-sm text-[#78716c] mb-3">
                      {venue.area ? `${venue.area}, ${venue.city}` : venue.city}
                    </p>

                    {/* Capacity */}
                    <div className="flex items-center gap-2 text-sm text-[#78716c] mb-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>{formatCapacity(venue)}</span>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#c45a3b] font-semibold">
                        {formatPrice(venue)}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
