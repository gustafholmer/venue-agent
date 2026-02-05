import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo-mode'
import { MOCK_VENUES, filterMockVenues, getMockAreas } from '@/lib/mock-data'
import { getOrCreateSession } from '@/actions/agent/create-session'
import { getSessionMessages } from '@/actions/agent/process-message'
import { VenuesWithAgent } from '@/components/venues/venues-with-agent'
import { generateBreadcrumbSchema, jsonLdScript } from '@/lib/structured-data'
import type { VenueCardData } from '@/components/venues/venue-card'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://venue-agent.se'

interface SearchParams {
  q?: string
  area?: string
  capacity?: string
  priceMax?: string
}

interface PageProps {
  searchParams: Promise<SearchParams>
}

async function getPublishedVenues(filters: SearchParams): Promise<VenueCardData[]> {
  if (isDemoMode() || !isSupabaseConfigured()) {
    const mockVenues = filterMockVenues({
      area: filters.area,
      capacity: filters.capacity ? parseInt(filters.capacity, 10) : undefined,
      priceMax: filters.priceMax ? parseInt(filters.priceMax, 10) : undefined,
    })

    return mockVenues.map((venue) => ({
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
      area: venue.area,
      city: venue.city,
      capacity_standing: venue.capacity_standing,
      capacity_seated: venue.capacity_seated,
      price_per_hour: venue.price_per_hour,
      price_half_day: venue.price_half_day,
      price_full_day: venue.price_full_day,
      price_evening: venue.price_evening,
      primaryPhotoUrl: venue.primaryPhotoUrl || null,
      latitude: venue.latitude,
      longitude: venue.longitude,
    }))
  }

  const supabase = await createClient()

  let query = supabase
    .from('venues')
    .select(`
      id,
      name,
      slug,
      area,
      city,
      capacity_standing,
      capacity_seated,
      price_per_hour,
      price_half_day,
      price_full_day,
      price_evening,
      latitude,
      longitude
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (filters.area) {
    query = query.ilike('area', `%${filters.area}%`)
  }

  if (filters.capacity) {
    const minCapacity = parseInt(filters.capacity, 10)
    if (!isNaN(minCapacity)) {
      query = query.or(`capacity_standing.gte.${minCapacity},capacity_seated.gte.${minCapacity}`)
    }
  }

  if (filters.priceMax) {
    const maxPrice = parseInt(filters.priceMax, 10)
    if (!isNaN(maxPrice)) {
      query = query.or(`price_evening.lte.${maxPrice},price_full_day.lte.${maxPrice},price_half_day.lte.${maxPrice}`)
    }
  }

  const { data: venues, error } = await query

  if (error) {
    console.error('Error fetching venues:', error)
    return []
  }

  if (!venues || venues.length === 0) {
    return []
  }

  const venueIds = venues.map((v) => v.id)
  const { data: photos } = await supabase
    .from('venue_photos')
    .select('venue_id, url')
    .in('venue_id', venueIds)
    .eq('is_primary', true)

  const photoMap = new Map<string, string>()
  if (photos) {
    photos.forEach((photo) => {
      photoMap.set(photo.venue_id, photo.url)
    })
  }

  return venues.map((venue) => ({
    ...venue,
    primaryPhotoUrl: photoMap.get(venue.id) || null,
    latitude: venue.latitude,
    longitude: venue.longitude,
  }))
}

async function getUniqueAreas(): Promise<string[]> {
  if (isDemoMode() || !isSupabaseConfigured()) {
    return getMockAreas()
  }

  const supabase = await createClient()

  const { data } = await supabase
    .from('venues')
    .select('area')
    .eq('status', 'published')
    .not('area', 'is', null)

  if (!data) return []

  const uniqueAreas = [...new Set(data.map((v) => v.area).filter(Boolean))] as string[]
  return uniqueAreas.sort()
}

async function VenuesPageContent({ searchParams }: PageProps) {
  const filters = await searchParams

  // Get or create agent session
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('agent_session_id')?.value
  const sessionResult = await getOrCreateSession(sessionCookie)

  const sessionId = sessionResult.success && sessionResult.sessionId
    ? sessionResult.sessionId
    : `temp_${Date.now()}`

  // Get existing messages for this session
  const messagesResult = sessionResult.success && sessionResult.sessionId
    ? await getSessionMessages(sessionResult.sessionId)
    : { success: false, messages: [] }
  const initialMessages = messagesResult.success ? messagesResult.messages || [] : []

  // Fetch venues and areas in parallel
  const [venues, areas] = await Promise.all([
    getPublishedVenues(filters),
    getUniqueAreas(),
  ])

  const inDemoMode = isDemoMode() || !isSupabaseConfigured()

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Hem', url: BASE_URL },
    { name: 'Lokaler', url: `${BASE_URL}/venues` },
  ])

  return (
    <div className="min-h-screen bg-white">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbSchema) }}
      />
      {inDemoMode && (
        <div className="bg-[#f5f3f0] border-b border-[#e7e5e4]">
          <div className="px-4 sm:px-6 py-3">
            <p className="text-sm text-[#78716c]">
              <span className="text-[#1a1a1a] font-medium">Demoläge:</span> Exempeldata visas. Konfigurera Supabase för riktiga lokaler.
            </p>
          </div>
        </div>
      )}

      <VenuesWithAgent
        sessionId={sessionId}
        initialMessages={initialMessages}
        initialVenues={venues}
        areas={areas}
        currentFilters={filters}
        demoMode={inDemoMode}
        initialQuery={filters.q}
      />
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
        {/* Sidebar skeleton */}
        <aside className="hidden lg:block lg:w-[350px] lg:border-r lg:border-[#e7e5e4] p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-[#f5f3f0] rounded" />
            <div className="h-10 bg-[#f5f3f0] rounded" />
            <div className="h-10 bg-[#f5f3f0] rounded" />
            <div className="h-10 bg-[#f5f3f0] rounded" />
          </div>
        </aside>

        {/* Grid skeleton */}
        <main className="flex-1 px-4 sm:px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-[#f5f3f0] w-48 mb-2 rounded" />
            <div className="h-5 bg-[#f5f3f0] w-32 mb-8 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i}>
                  <div className="aspect-[4/3] bg-[#f5f3f0] mb-2 rounded" />
                  <div className="h-5 bg-[#f5f3f0] w-3/4 mb-2 rounded" />
                  <div className="h-4 bg-[#f5f3f0] w-1/2 rounded" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default async function VenuesPage(props: PageProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <VenuesPageContent searchParams={props.searchParams} />
    </Suspense>
  )
}

export const metadata = {
  title: 'Lokaler - Tryffle',
  description: 'Utforska lokaler för konferenser, fester, bröllop och andra event.',
}
