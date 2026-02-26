import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getVenueBySlug } from '@/actions/venues/get-venue-by-slug'
import { hasExistingThread } from '@/actions/inquiries/has-existing-thread'
import { isDemoMode } from '@/lib/demo-mode'
import { isSupabaseConfigured, createClient } from '@/lib/supabase/server'
import { PhotoGallery } from '@/components/venues/photo-gallery'
import { VenueDetailMap } from '@/components/maps/venue-detail-map'
import { VenueAssistant } from '@/components/chat/venue-assistant'
import { VenueAgentChat } from '@/components/agent/venue-agent-chat'
import { SaveButton } from '@/components/venues/save-button'
import { VenueActions } from '@/components/inquiry/venue-actions'
import {
  generateLocalBusinessSchema,
  generateBreadcrumbSchema,
  getPriceRange,
  jsonLdScript,
} from '@/lib/structured-data'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://venue-agent.se'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const result = await getVenueBySlug(slug)

  if (!result.success || !result.venue) {
    return {
      title: 'Lokal hittades inte - Tryffle',
    }
  }

  const venue = result.venue
  const description = venue.description
    ? venue.description.slice(0, 160)
    : `Boka ${venue.name} i ${venue.area || venue.city}. Kapacitet för upp till ${
        Math.max(venue.capacity_standing || 0, venue.capacity_seated || 0)
      } gäster.`

  return {
    title: `${venue.name} - Tryffle`,
    description,
    alternates: {
      canonical: `/venues/${slug}`,
    },
    openGraph: {
      title: venue.name,
      description,
      images: venue.photos[0]?.url ? [venue.photos[0].url] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: venue.name,
      description,
      images: venue.photos[0]?.url ? [venue.photos[0].url] : undefined,
    },
  }
}

function formatPrice(price: number | null): string {
  if (!price) return 'Pris på förfrågan'
  return `${price.toLocaleString('sv-SE')} SEK`
}

function DemoModeBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2 text-amber-800">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">
            <span className="font-medium">Demolage:</span> Du ser exempeldata. Konfigurera Supabase for att anvanda riktiga lokaler.
          </p>
        </div>
      </div>
    </div>
  )
}

async function VenueDetailContent({ params }: PageProps) {
  const { slug } = await params
  const result = await getVenueBySlug(slug)

  if (!result.success || !result.venue) {
    notFound()
  }

  const venue = result.venue
  const bookingSlug = venue.slug || venue.id

  const hasCapacity = venue.capacity_standing || venue.capacity_seated || venue.capacity_conference
  const hasPricing = venue.price_per_hour || venue.price_half_day || venue.price_full_day || venue.price_evening
  const inDemoMode = isDemoMode() || !isSupabaseConfigured()

  // Check if current user has an existing inquiry or booking with this venue
  const showContactInfo = await hasExistingThread(venue.id)

  // Check if this venue has the AI agent enabled
  const supabase = await createClient()
  const { data: agentConfig } = await supabase
    .from('venue_agent_config')
    .select('agent_enabled')
    .eq('venue_id', venue.id)
    .eq('agent_enabled', true)
    .maybeSingle()

  // Compute max capacity for the inquiry modal
  const maxCapacity = Math.max(
    venue.capacity_standing || 0,
    venue.capacity_seated || 0,
    venue.capacity_conference || 0
  ) || undefined

  // Generate structured data
  const localBusinessSchema = generateLocalBusinessSchema({
    name: venue.name,
    description: venue.description || undefined,
    address: venue.address,
    city: venue.city,
    area: venue.area || undefined,
    priceRange: getPriceRange({
      price_per_hour: venue.price_per_hour,
      price_half_day: venue.price_half_day,
      price_full_day: venue.price_full_day,
      price_evening: venue.price_evening,
    }),
    images: venue.photos.map((p) => p.url),
    url: `${BASE_URL}/venues/${venue.slug || venue.id}`,
  })

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Hem', url: BASE_URL },
    { name: 'Lokaler', url: `${BASE_URL}/venues` },
    { name: venue.name, url: `${BASE_URL}/venues/${venue.slug || venue.id}` },
  ])

  return (
    <div className="min-h-screen bg-white">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbSchema) }}
      />
      {inDemoMode && <DemoModeBanner />}
      {/* Photo Gallery Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <PhotoGallery photos={venue.photos} venueName={venue.name} />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Left Column - Venue Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <h1 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl font-semibold text-[#1a1a1a] mb-2">
                  {venue.name}
                </h1>
                <SaveButton venueId={venue.id} size="md" />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[#78716c]">
                <span className="flex items-center gap-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {venue.area ? `${venue.area}, ${venue.city}` : venue.city}
                </span>
              </div>
            </div>

            {/* Description */}
            {venue.description && (
              <div>
                <h2 className="text-lg font-semibold text-[#1a1a1a] mb-3">Om lokalen</h2>
                <div className="text-[#57534e] whitespace-pre-wrap leading-relaxed">
                  {venue.description}
                </div>
              </div>
            )}

            {/* Capacity */}
            {hasCapacity && (
              <div>
                <h2 className="text-lg font-semibold text-[#1a1a1a] mb-3">Kapacitet</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {venue.capacity_standing && (
                    <div className="bg-[#faf9f7] rounded-xl p-4">
                      <div className="flex items-center gap-2 text-[#78716c] mb-1">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        <span className="text-sm">Stående</span>
                      </div>
                      <p className="text-xl font-semibold text-[#1a1a1a]">
                        {venue.capacity_standing} personer
                      </p>
                    </div>
                  )}
                  {venue.capacity_seated && (
                    <div className="bg-[#faf9f7] rounded-xl p-4">
                      <div className="flex items-center gap-2 text-[#78716c] mb-1">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                          />
                        </svg>
                        <span className="text-sm">Sittande</span>
                      </div>
                      <p className="text-xl font-semibold text-[#1a1a1a]">
                        {venue.capacity_seated} personer
                      </p>
                    </div>
                  )}
                  {venue.capacity_conference && (
                    <div className="bg-[#faf9f7] rounded-xl p-4">
                      <div className="flex items-center gap-2 text-[#78716c] mb-1">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                        <span className="text-sm">Konferens</span>
                      </div>
                      <p className="text-xl font-semibold text-[#1a1a1a]">
                        {venue.capacity_conference} personer
                      </p>
                    </div>
                  )}
                </div>
                {venue.min_guests > 1 && (
                  <p className="text-sm text-[#78716c] mt-3">
                    Minsta antal gäster: {venue.min_guests}
                  </p>
                )}
              </div>
            )}

            {/* Amenities */}
            {venue.amenities && venue.amenities.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-[#1a1a1a] mb-3">Faciliteter</h2>
                <div className="flex flex-wrap gap-2">
                  {venue.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#faf9f7] rounded-full text-sm text-[#57534e]"
                    >
                      <svg className="w-4 h-4 text-[#c45a3b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Venue Types */}
            {venue.venue_types && venue.venue_types.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-[#1a1a1a] mb-3">Passar för</h2>
                <div className="flex flex-wrap gap-2">
                  {venue.venue_types.map((type) => (
                    <span
                      key={type}
                      className="inline-flex px-3 py-1.5 bg-[#c45a3b]/10 rounded-full text-sm text-[#c45a3b] font-medium"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Vibes */}
            {venue.vibes && venue.vibes.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-[#1a1a1a] mb-3">Känsla</h2>
                <div className="flex flex-wrap gap-2">
                  {venue.vibes.map((vibe) => (
                    <span
                      key={vibe}
                      className="inline-flex px-3 py-1.5 bg-[#f3f4f6] rounded-full text-sm text-[#57534e]"
                    >
                      {vibe}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Address */}
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-3">Adress</h2>
              <p className="text-[#57534e]">{venue.address}</p>
              <p className="text-[#57534e] mb-4">
                {venue.area ? `${venue.area}, ` : ''}
                {venue.city}
              </p>
              {venue.latitude && venue.longitude && (
                <VenueDetailMap
                  venue={{
                    id: venue.id,
                    name: venue.name,
                    slug: venue.slug,
                    area: venue.area,
                    latitude: venue.latitude,
                    longitude: venue.longitude,
                  }}
                  address={`${venue.address}, ${venue.area ? `${venue.area}, ` : ''}${venue.city}`}
                />
              )}
            </div>

          </div>

          {/* Right Column - Pricing & CTA */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-white border border-[#e7e5e4] rounded-2xl p-6 shadow-sm">
              {/* Pricing */}
              {hasPricing ? (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Priser</h3>
                  <div className="space-y-3">
                    {venue.price_per_hour && (
                      <div className="flex justify-between items-center">
                        <span className="text-[#78716c]">Pris per timme</span>
                        <span className="font-semibold text-[#1a1a1a]">
                          {formatPrice(venue.price_per_hour)}
                        </span>
                      </div>
                    )}
                    {venue.price_half_day && (
                      <div className="flex justify-between items-center">
                        <span className="text-[#78716c]">Halvdag</span>
                        <span className="font-semibold text-[#1a1a1a]">
                          {formatPrice(venue.price_half_day)}
                        </span>
                      </div>
                    )}
                    {venue.price_full_day && (
                      <div className="flex justify-between items-center">
                        <span className="text-[#78716c]">Heldag</span>
                        <span className="font-semibold text-[#1a1a1a]">
                          {formatPrice(venue.price_full_day)}
                        </span>
                      </div>
                    )}
                    {venue.price_evening && (
                      <div className="flex justify-between items-center">
                        <span className="text-[#78716c]">Kväll</span>
                        <span className="font-semibold text-[#1a1a1a]">
                          {formatPrice(venue.price_evening)}
                        </span>
                      </div>
                    )}
                  </div>
                  {venue.price_notes && (
                    <p className="mt-3 text-sm text-[#78716c]">{venue.price_notes}</p>
                  )}
                </div>
              ) : (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">Pris</h3>
                  <p className="text-[#78716c]">Kontakta oss för prisuppgifter</p>
                </div>
              )}

              {/* CTA Buttons */}
              <VenueActions
                venueId={venue.id}
                venueSlug={venue.slug || venue.id}
                venueName={venue.name}
                bookingSlug={bookingSlug}
                minCapacity={venue.min_guests > 1 ? venue.min_guests : undefined}
                maxCapacity={maxCapacity}
              />

              {/* Contact Info - only shown when user has an existing inquiry or booking */}
              {showContactInfo && (venue.contact_email || venue.contact_phone || venue.website) && (
                <div className="mt-6 pt-6 border-t border-[#e7e5e4]">
                  <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Kontakt</h3>
                  <div className="space-y-2">
                    {venue.contact_email && (
                      <a
                        href={`mailto:${venue.contact_email}`}
                        className="flex items-center gap-2 text-sm text-[#78716c] hover:text-[#c45a3b] transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        {venue.contact_email}
                      </a>
                    )}
                    {venue.contact_phone && (
                      <a
                        href={`tel:${venue.contact_phone}`}
                        className="flex items-center gap-2 text-sm text-[#78716c] hover:text-[#c45a3b] transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        {venue.contact_phone}
                      </a>
                    )}
                    {venue.website && (
                      <a
                        href={venue.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[#78716c] hover:text-[#c45a3b] transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                          />
                        </svg>
                        Webbplats
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Venue Assistant / Agent Chat */}
      {agentConfig?.agent_enabled ? (
        <VenueAgentChat
          venue={{
            id: venue.id,
            name: venue.name,
            slug: venue.slug || venue.id,
            description: venue.description,
            area: venue.area,
            city: venue.city,
            capacity_standing: venue.capacity_standing,
            capacity_seated: venue.capacity_seated,
            capacity_conference: venue.capacity_conference,
            min_guests: venue.min_guests,
            amenities: venue.amenities,
            venue_types: venue.venue_types,
            price_per_hour: venue.price_per_hour,
            price_half_day: venue.price_half_day,
            price_full_day: venue.price_full_day,
            price_evening: venue.price_evening,
          }}
        />
      ) : (
        <VenueAssistant
          venue={{
            id: venue.id,
            name: venue.name,
            slug: venue.slug || venue.id,
            description: venue.description,
            area: venue.area,
            city: venue.city,
            capacity_standing: venue.capacity_standing,
            capacity_seated: venue.capacity_seated,
            capacity_conference: venue.capacity_conference,
            min_guests: venue.min_guests,
            amenities: venue.amenities,
            venue_types: venue.venue_types,
            price_per_hour: venue.price_per_hour,
            price_half_day: venue.price_half_day,
            price_full_day: venue.price_full_day,
            price_evening: venue.price_evening,
          }}
        />
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Photo skeleton */}
        <div className="aspect-[16/9] bg-[#f3f4f6] rounded-xl animate-pulse" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Left column skeleton */}
          <div className="lg:col-span-2 space-y-6 animate-pulse">
            <div className="h-8 bg-[#f3f4f6] rounded w-3/4" />
            <div className="h-5 bg-[#f3f4f6] rounded w-1/2" />
            <div className="space-y-3 mt-8">
              <div className="h-4 bg-[#f3f4f6] rounded w-full" />
              <div className="h-4 bg-[#f3f4f6] rounded w-full" />
              <div className="h-4 bg-[#f3f4f6] rounded w-3/4" />
            </div>
          </div>

          {/* Right column skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-[#f3f4f6] rounded-2xl h-80 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function VenueDetailPage(props: PageProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <VenueDetailContent params={props.params} />
    </Suspense>
  )
}
