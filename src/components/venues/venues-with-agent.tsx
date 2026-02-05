'use client'

import { useState, useMemo, useCallback } from 'react'
import { SidebarChat } from './sidebar-chat'
import { FilterSection } from './filter-section'
import { VenueCard, type VenueCardData } from './venue-card'
import { VenueMap, type VenueMarkerData } from '@/components/maps'
import type { AgentMessage, VenueResult } from '@/types/agent'

interface VenuesWithAgentProps {
  sessionId: string
  initialMessages: AgentMessage[]
  initialVenues: VenueCardData[]
  areas: string[]
  currentFilters: {
    area?: string
    capacity?: string
    priceMax?: string
  }
  demoMode?: boolean
  initialQuery?: string
}

export function VenuesWithAgent({
  sessionId,
  initialMessages,
  initialVenues,
  areas,
  currentFilters,
  demoMode = false,
  initialQuery,
}: VenuesWithAgentProps) {
  const [agentVenues, setAgentVenues] = useState<VenueResult[]>([])
  const [isChatExpanded, setIsChatExpanded] = useState(false)
  const [hoveredVenueId, setHoveredVenueId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')

  // When agent finds venues, store them
  function handleVenuesFound(venues: VenueResult[]) {
    setAgentVenues(venues)
  }

  // Determine which venues to show
  const displayVenues = useMemo(() => {
    // If agent has found venues, prioritize those
    if (agentVenues.length > 0) {
      // Map agent venues to display format, matching with initialVenues for full data
      const agentVenueIds = new Set(agentVenues.map(v => v.id))
      const matchedVenues = initialVenues.filter(v => agentVenueIds.has(v.id))

      // Also include any venues from agent that aren't in initialVenues
      // (in case agent found venues not in current filter set)
      const additionalVenues: VenueCardData[] = agentVenues
        .filter(av => !matchedVenues.find(mv => mv.id === av.id))
        .map(av => ({
          id: av.id,
          name: av.name,
          slug: av.slug,
          area: av.area,
          city: av.area, // Use area as city fallback
          capacity_standing: av.capacity,
          capacity_seated: null,
          price_per_hour: null,
          price_half_day: null,
          price_full_day: null,
          price_evening: av.price,
          primaryPhotoUrl: av.imageUrl || null,
        }))

      return [...matchedVenues, ...additionalVenues]
    }

    // Otherwise show filtered venues
    return initialVenues
  }, [agentVenues, initialVenues])

  const hasAgentResults = agentVenues.length > 0
  const hasFilters = currentFilters.area || currentFilters.capacity || currentFilters.priceMax

  // Convert venues to map marker data
  const venuesForMap: VenueMarkerData[] = useMemo(() => {
    return displayVenues
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
  }, [displayVenues])

  const handleVenueHover = useCallback((venueId: string | null) => {
    setHoveredVenueId(venueId)
  }, [])

  return (
    <div className="flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden">
      {/* Mobile: Collapsible chat header */}
      <div className="lg:hidden border-b border-[#e7e5e4]">
        <div
          className={`transition-all duration-300 ease-in-out ${
            isChatExpanded ? 'h-[60vh]' : 'h-auto'
          }`}
        >
          <div className="h-full flex flex-col">
            {/* Expand/collapse toggle */}
            {isChatExpanded && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-[#e7e5e4]">
                <span className="text-sm font-medium text-[#1a1a1a]">Chatta med agenten</span>
                <button
                  onClick={() => setIsChatExpanded(false)}
                  className="p-1 text-[#78716c] hover:text-[#1a1a1a]"
                  aria-label="Minimera"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
            <div className="flex-1 min-h-0">
              <SidebarChat
                sessionId={sessionId}
                initialMessages={initialMessages}
                onVenuesFound={handleVenuesFound}
                isExpanded={isChatExpanded}
                onExpandedChange={setIsChatExpanded}
                demoMode={demoMode}
              />
            </div>
          </div>
        </div>

        {/* Mobile filters and view toggle */}
        <div className="px-4 py-3 flex gap-2 overflow-x-auto">
          {/* View toggle */}
          <div className="flex border border-[#e7e5e4] rounded-full overflow-hidden flex-shrink-0">
            <button
              onClick={() => setMobileView('list')}
              className={`px-3 h-9 text-sm transition-colors ${
                mobileView === 'list'
                  ? 'bg-[#1a1a1a] text-white'
                  : 'bg-white text-[#78716c] hover:text-[#1a1a1a]'
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setMobileView('map')}
              className={`px-3 h-9 text-sm transition-colors ${
                mobileView === 'map'
                  ? 'bg-[#1a1a1a] text-white'
                  : 'bg-white text-[#78716c] hover:text-[#1a1a1a]'
              }`}
            >
              Karta
            </button>
          </div>
          <select
            value={currentFilters.area || ''}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search)
              if (e.target.value) params.set('area', e.target.value)
              else params.delete('area')
              window.location.href = `/venues${params.toString() ? `?${params.toString()}` : ''}`
            }}
            className="h-9 px-3 border border-[#e7e5e4] bg-white text-sm rounded-full whitespace-nowrap"
          >
            <option value="">Område</option>
            {areas.map((area) => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
          <select
            value={currentFilters.capacity || ''}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search)
              if (e.target.value) params.set('capacity', e.target.value)
              else params.delete('capacity')
              window.location.href = `/venues${params.toString() ? `?${params.toString()}` : ''}`
            }}
            className="h-9 px-3 border border-[#e7e5e4] bg-white text-sm rounded-full whitespace-nowrap"
          >
            <option value="">Storlek</option>
            <option value="10">10+</option>
            <option value="25">25+</option>
            <option value="50">50+</option>
            <option value="100">100+</option>
          </select>
          <select
            value={currentFilters.priceMax || ''}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search)
              if (e.target.value) params.set('priceMax', e.target.value)
              else params.delete('priceMax')
              window.location.href = `/venues${params.toString() ? `?${params.toString()}` : ''}`
            }}
            className="h-9 px-3 border border-[#e7e5e4] bg-white text-sm rounded-full whitespace-nowrap"
          >
            <option value="">Pris</option>
            <option value="5000">Max 5k</option>
            <option value="10000">Max 10k</option>
            <option value="20000">Max 20k</option>
            <option value="50000">Max 50k</option>
          </select>
        </div>
      </div>

      {/* Desktop: Left sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[350px] lg:flex-shrink-0 lg:border-r lg:border-[#e7e5e4] lg:bg-white lg:overflow-y-auto">
        {/* Chat section */}
        <div className="border-b border-[#e7e5e4]">
          <div className="h-[60vh]">
            <SidebarChat
              sessionId={sessionId}
              initialMessages={initialMessages}
              onVenuesFound={handleVenuesFound}
              demoMode={demoMode}
              initialQuery={initialQuery}
            />
          </div>
        </div>

        {/* Filters section */}
        <div className="p-4 border-b border-[#e7e5e4]">
          <FilterSection areas={areas} />
        </div>
      </aside>

      {/* Main content area with split view */}
      <div className="flex-1 flex flex-col lg:flex-row lg:min-w-0 lg:overflow-hidden">
        {/* Mobile map view */}
        <div className={`lg:hidden ${mobileView === 'map' ? 'flex-1' : 'hidden'}`}>
          <div className="h-[calc(100vh-200px)]">
            <VenueMap
              venues={venuesForMap}
              height="100%"
              hoveredVenueId={hoveredVenueId}
              onVenueHover={handleVenueHover}
            />
          </div>
        </div>

        {/* Venue list */}
        <main className={`lg:w-[60%] px-4 sm:px-6 py-6 lg:py-8 lg:overflow-y-auto ${
          mobileView === 'list' ? 'block' : 'hidden lg:block'
        }`}>
          {/* Results header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#1a1a1a] mb-1">
              {hasAgentResults ? 'Agentens förslag' : 'Eventlokaler'}
            </h1>
            <p className="text-base text-[#78716c]">
              {displayVenues.length} {displayVenues.length === 1 ? 'lokal' : 'lokaler'}
              {hasAgentResults && ' matchar din sökning'}
              {!hasAgentResults && hasFilters && ' matchar dina filter'}
            </p>
            {hasAgentResults && (
              <button
                onClick={() => setAgentVenues([])}
                className="mt-2 text-sm text-[#c45a3b] hover:underline"
              >
                Visa alla lokaler
              </button>
            )}
          </div>

          {/* Venue grid */}
          {displayVenues.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
              {displayVenues.map((venue) => (
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
          ) : (
            <div className="py-16 text-center">
              <p className="text-[#78716c] mb-4">
                {hasFilters
                  ? 'Inga lokaler matchar dina filter.'
                  : 'Inga lokaler publicerade ännu.'}
              </p>
              {hasFilters && (
                <a
                  href="/venues"
                  className="text-[#1a1a1a] underline underline-offset-4 hover:text-[#c45a3b]"
                >
                  Rensa filter
                </a>
              )}
            </div>
          )}
        </main>

        {/* Desktop map - fixed on right */}
        <div className="hidden lg:block lg:w-[40%] lg:flex-shrink-0 border-l border-[#e7e5e4]">
          <VenueMap
            venues={venuesForMap}
            height="100%"
            hoveredVenueId={hoveredVenueId}
            onVenueHover={handleVenueHover}
          />
        </div>
      </div>
    </div>
  )
}
