'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { SidebarChat } from './sidebar-chat'
import { FilterSection } from './filter-section'
import { VenueCard, type VenueCardData } from './venue-card'
import { VenueMap, type VenueMarkerData } from '@/components/maps'
import { ResizeHandle } from './resize-handle'
import type { AgentMessage, VenueResult } from '@/types/agent'

interface VenuesWithAgentProps {
  sessionId: string
  initialMessages: AgentMessage[]
  initialVenues: VenueCardData[]
  allVenues?: VenueCardData[]
  areas: string[]
  currentFilters: {
    area?: string
    capacity?: string
    priceMax?: string
  }
  demoMode?: boolean
  initialQuery?: string
  hasMore?: boolean
  onLoadMore?: () => Promise<void>
}

export function VenuesWithAgent({
  sessionId,
  initialMessages,
  initialVenues,
  allVenues,
  areas,
  currentFilters,
  demoMode = false,
  initialQuery,
  hasMore,
  onLoadMore,
}: VenuesWithAgentProps) {
  const [agentVenues, setAgentVenues] = useState<VenueResult[]>([])
  const [agentMessage, setAgentMessage] = useState<string>('')
  const [showingAll, setShowingAll] = useState(false)
  const [isChatExpanded, setIsChatExpanded] = useState(false)
  const [hoveredVenueId, setHoveredVenueId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')
  const [loadingMore, setLoadingMore] = useState(false)
  const [agentSearching, setAgentSearching] = useState(Boolean(initialQuery))
  const [mobileCapacity, setMobileCapacity] = useState(currentFilters.capacity ? parseInt(currentFilters.capacity, 10) : 0)
  const [mobilePrice, setMobilePrice] = useState(currentFilters.priceMax ? parseInt(currentFilters.priceMax, 10) : 0)
  const mobileDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listContainerRef = useRef<HTMLElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Resizable column widths (desktop only, in pixels)
  const HANDLE_WIDTH = 12
  const MIN_SIDEBAR = 350
  const MIN_VENUES = 300
  const MIN_MAP = 400

  const [sidebarWidth, setSidebarWidth] = useState(MIN_SIDEBAR)
  // venueWidth=0 means "use default 60/40 split" (calculated on first render)
  const [venueWidth, setVenueWidth] = useState(0)

  // Calculate actual venue/map widths
  const getContentWidth = useCallback(() => {
    const container = containerRef.current
    if (!container) return 0
    return container.offsetWidth - sidebarWidth - HANDLE_WIDTH
  }, [sidebarWidth])

  const effectiveVenueWidth = venueWidth || (getContentWidth() * 0.6)

  const handleSidebarResize = useCallback((delta: number) => {
    const container = containerRef.current
    if (!container) return
    const totalWidth = container.offsetWidth

    setSidebarWidth(prev => {
      const newWidth = prev + delta
      const remaining = totalWidth - newWidth - HANDLE_WIDTH
      if (newWidth < MIN_SIDEBAR) return MIN_SIDEBAR
      if (remaining < MIN_VENUES + MIN_MAP) return prev
      return newWidth
    })
  }, [])

  const handleContentResize = useCallback((delta: number) => {
    const contentWidth = getContentWidth()
    const currentVenue = venueWidth || contentWidth * 0.6

    const newVenue = currentVenue + delta
    const newMap = contentWidth - newVenue

    if (newVenue < MIN_VENUES || newMap < MIN_MAP) return

    setVenueWidth(newVenue)
  }, [getContentWidth, venueWidth])

  // When agent finds venues, store them
  function handleVenuesFound(venues: VenueResult[], message?: string) {
    setAgentVenues(venues)
    setAgentMessage(message || '')
    setShowingAll(false)
  }

  // Determine which venues to show
  const displayVenues = useMemo(() => {
    let venues: VenueCardData[]

    // If agent has found venues, prioritize those
    if (agentVenues.length > 0) {
      // Map agent venues to display format, matching with allVenues/initialVenues for full data
      const agentVenueIds = new Set(agentVenues.map(v => v.id))
      const sourceVenues = allVenues || initialVenues
      const matchedVenues = sourceVenues.filter(v => agentVenueIds.has(v.id))

      // Also include any venues from agent that aren't in source
      const additionalVenues: VenueCardData[] = agentVenues
        .filter(av => !matchedVenues.find(mv => mv.id === av.id))
        .map(av => ({
          id: av.id,
          name: av.name,
          slug: av.slug,
          area: av.area,
          city: av.area,
          capacity_standing: av.capacity,
          capacity_seated: null,
          price_per_hour: null,
          price_half_day: null,
          price_full_day: null,
          price_evening: av.price,
          primaryPhotoUrl: av.imageUrl || null,
          latitude: av.latitude ?? null,
          longitude: av.longitude ?? null,
        }))

      venues = [...matchedVenues, ...additionalVenues]
    } else if (showingAll && allVenues) {
      venues = allVenues
    } else {
      venues = initialVenues
    }

    // Apply filters client-side (needed when filtering agent results)
    if (currentFilters.area) {
      const area = currentFilters.area.toLowerCase()
      venues = venues.filter(v => v.area?.toLowerCase().includes(area))
    }
    if (currentFilters.capacity) {
      const min = parseInt(currentFilters.capacity, 10)
      if (!isNaN(min)) {
        venues = venues.filter(v =>
          (v.capacity_standing || 0) >= min || (v.capacity_seated || 0) >= min
        )
      }
    }
    if (currentFilters.priceMax) {
      const max = parseInt(currentFilters.priceMax, 10)
      if (!isNaN(max)) {
        venues = venues.filter(v => {
          const price = v.price_evening || v.price_full_day || v.price_half_day
          return !price || price <= max
        })
      }
    }

    return venues
  }, [agentVenues, initialVenues, showingAll, allVenues, currentFilters])

  const hasAgentResults = agentVenues.length > 0
  const hasFilters = currentFilters.area || currentFilters.capacity || currentFilters.priceMax

  // Convert venues to map marker data
  const venuesForMap: VenueMarkerData[] = useMemo(() => {
    if (agentSearching) return []
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
  }, [displayVenues, agentSearching])

  const handleVenueHover = useCallback((venueId: string | null) => {
    setHoveredVenueId(venueId)

    // Debounced scroll-into-view for map-originated hovers
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = null
    }
    if (venueId) {
      scrollTimeoutRef.current = setTimeout(() => {
        const el = cardRefs.current.get(venueId)
        const container = listContainerRef.current
        if (!el || !container) return

        const containerRect = container.getBoundingClientRect()
        const cardRect = el.getBoundingClientRect()

        if (cardRect.top < containerRect.top) {
          container.scrollTo({
            top: container.scrollTop - (containerRect.top - cardRect.top) - 16,
            behavior: 'smooth',
          })
        } else if (cardRect.bottom > containerRect.bottom) {
          container.scrollTo({
            top: container.scrollTop + (cardRect.bottom - containerRect.bottom) + 16,
            behavior: 'smooth',
          })
        }
      }, 150)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  const handleLoadMore = useCallback(async () => {
    if (!onLoadMore) return
    setLoadingMore(true)
    try {
      await onLoadMore()
    } catch (error) {
      console.error('Error loading more venues:', error)
    } finally {
      setLoadingMore(false)
    }
  }, [onLoadMore])

  return (
    <div ref={containerRef} className="flex flex-col lg:flex-row lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
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
                onLoadingChange={setAgentSearching}
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
          <div className="flex items-center gap-1.5 h-9 px-3 border border-[#e7e5e4] bg-white rounded-full whitespace-nowrap">
            <span className="text-xs text-[#78716c]">Gaster</span>
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={mobileCapacity}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                setMobileCapacity(v)
                if (mobileDebounceRef.current) clearTimeout(mobileDebounceRef.current)
                mobileDebounceRef.current = setTimeout(() => {
                  const params = new URLSearchParams(window.location.search)
                  if (v > 0) params.set('capacity', String(v))
                  else params.delete('capacity')
                  window.location.href = `/venues${params.toString() ? `?${params.toString()}` : ''}`
                }, 300)
              }}
              className="w-20 accent-[#c45a3b]"
            />
            <span className="text-xs text-[#1a1a1a] min-w-[28px]">
              {mobileCapacity > 0 ? `${mobileCapacity}+` : 'Alla'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 h-9 px-3 border border-[#e7e5e4] bg-white rounded-full whitespace-nowrap">
            <span className="text-xs text-[#78716c]">Pris</span>
            <input
              type="range"
              min={0}
              max={100000}
              step={5000}
              value={mobilePrice}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                setMobilePrice(v)
                if (mobileDebounceRef.current) clearTimeout(mobileDebounceRef.current)
                mobileDebounceRef.current = setTimeout(() => {
                  const params = new URLSearchParams(window.location.search)
                  if (v > 0) params.set('priceMax', String(v))
                  else params.delete('priceMax')
                  window.location.href = `/venues${params.toString() ? `?${params.toString()}` : ''}`
                }, 300)
              }}
              className="w-20 accent-[#c45a3b]"
            />
            <span className="text-xs text-[#1a1a1a] min-w-[36px]">
              {mobilePrice > 0 ? `${mobilePrice / 1000}k` : 'Alla'}
            </span>
          </div>
        </div>
      </div>

      {/* Desktop: Left sidebar */}
      <aside
        className="hidden lg:flex lg:flex-col lg:flex-shrink-0 lg:bg-white lg:overflow-y-auto"
        style={{ width: sidebarWidth }}
      >
        {/* Chat section */}
        <div className="border-b border-[#e7e5e4]">
          <div className="h-[60vh]">
            <SidebarChat
              sessionId={sessionId}
              initialMessages={initialMessages}
              onVenuesFound={handleVenuesFound}
              onLoadingChange={setAgentSearching}
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

      {/* Resize handle: sidebar ↔ venue list */}
      <ResizeHandle onResize={handleSidebarResize} />

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
        <main
          ref={(el) => { listContainerRef.current = el }}
          className={`px-4 sm:px-6 py-6 lg:py-8 lg:overflow-y-auto ${
          mobileView === 'list' ? 'block' : 'hidden lg:block'
        }`}
          style={{ width: venueWidth ? venueWidth : '60%', flexShrink: 0 }}>
          {/* Results header */}
          <div className="mb-6">
            {agentSearching ? (
              <div className="animate-pulse">
                <div className="h-8 bg-[#f5f3f0] rounded w-48 mb-2" />
                <div className="h-5 bg-[#f5f3f0] rounded w-32" />
              </div>
            ) : (
              <p className="text-base text-[#78716c]">
                {displayVenues.length} {displayVenues.length === 1 ? 'lokal hittad' : 'lokaler hittade'}
              </p>
            )}
            {!agentSearching && hasAgentResults && (
              <button
                onClick={() => {
                  setAgentVenues([])
                  setShowingAll(true)
                  window.history.replaceState(null, '', '/venues')
                }}
                className="mt-2 text-sm text-[#c45a3b] hover:underline"
              >
                Visa alla lokaler
              </button>
            )}
          </div>

          {/* Venue grid */}
          {agentSearching ? (
            <div className="grid gap-x-4 gap-y-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-[#f5f3f0] rounded-xl aspect-[4/3] mb-3" />
                  <div className="space-y-2 px-1">
                    <div className="h-4 bg-[#f5f3f0] rounded w-3/4" />
                    <div className="h-3 bg-[#f5f3f0] rounded w-1/2" />
                    <div className="h-3 bg-[#f5f3f0] rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayVenues.length > 0 ? (
            <>
            <div className="grid gap-x-4 gap-y-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {displayVenues.map((venue) => (
                <div
                  key={venue.id}
                  ref={(el) => {
                    if (el) {
                      cardRefs.current.set(venue.id, el)
                    } else {
                      cardRefs.current.delete(venue.id)
                    }
                  }}
                  onMouseEnter={() => setHoveredVenueId(venue.id)}
                  onMouseLeave={() => setHoveredVenueId(null)}
                  className={`rounded-xl p-1 ${
                    hoveredVenueId === venue.id ? 'ring-2 ring-[#c45a3b]' : ''
                  }`}
                >
                  <VenueCard venue={venue} isHighlighted={hoveredVenueId === venue.id} />
                </div>
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-white border border-[#e7e5e4] rounded-full text-sm font-medium text-[#1a1a1a] hover:bg-[#f5f5f4] transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Laddar...
                    </span>
                  ) : (
                    'Visa fler lokaler'
                  )}
                </button>
              </div>
            )}
            </>
          ) : (
            <div className="py-16 text-center">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-[#d6d3d1]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <p className="text-[#78716c] mb-1 font-medium">
                {hasFilters
                  ? 'Inga lokaler matchar dina filter'
                  : 'Inga lokaler publicerade'}
              </p>
              <p className="text-sm text-[#a8a29e] mb-4">
                {hasFilters
                  ? 'Prova att bredda din sökning'
                  : 'Nya lokaler kommer snart'}
              </p>
              {hasFilters && (
                <a
                  href="/venues"
                  className="inline-flex items-center gap-1.5 text-sm text-[#1a1a1a] underline underline-offset-4 hover:text-[#c45a3b]"
                >
                  Rensa filter
                </a>
              )}
            </div>
          )}
        </main>

        {/* Resize handle: venue list ↔ map */}
        <ResizeHandle onResize={handleContentResize} />

        {/* Desktop map - fixed on right */}
        <div
          className="hidden lg:block lg:flex-1 lg:h-full"
        >
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
