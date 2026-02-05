import Link from 'next/link'
import Image from 'next/image'
import { SearchInput } from '@/components/search/search-input'
import { VenueBuildings } from '@/components/illustrations/venue-buildings'
import { HomeVenuesWithMap } from '@/components/maps/home-venues-with-map'
import { isDemoMode } from '@/lib/demo-mode'
import { isSupabaseConfigured, createClient } from '@/lib/supabase/server'
import { MOCK_VENUES } from '@/lib/mock-data'
import {
  generateOrganizationSchema,
  VENUE_AGENT_ORGANIZATION,
  jsonLdScript,
} from '@/lib/structured-data'
import type { VenueCardData } from '@/components/venues/venue-card'

async function getVenuesForHomepage(): Promise<VenueCardData[]> {
  if (isDemoMode() || !isSupabaseConfigured()) {
    return MOCK_VENUES.map((venue) => ({
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

  const { data: venues, error } = await supabase
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
    .limit(10)

  if (error || !venues) {
    console.error('Error fetching venues:', error)
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
  }))
}

export default async function LandingPage() {
  const venues = await getVenuesForHomepage()
  const organizationSchema = generateOrganizationSchema(VENUE_AGENT_ORGANIZATION)

  return (
    <div>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationSchema) }}
      />
      {/* Hero */}
      <section className="relative px-4 sm:px-6 pt-12 pb-16 sm:pt-20 sm:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f5e6df] via-[#fdf8f6] to-[#f0e4d8] -z-10" />
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <p className="text-sm uppercase tracking-widest text-[#c45a3b] mb-4">
                Din personliga lokalagent
              </p>
              <h1 className="text-[2.5rem] sm:text-[3.5rem] lg:text-[4rem] leading-[1.1] tracking-tight text-[#1a1a1a]">
                Berätta vad du söker.<br />
                <span className="text-[#78716c]">Vår agent hittar eventlokalen.</span>
              </h1>
              <p className="mt-5 text-sm text-[#a8a29e] max-w-md">
                Beskriv ditt event med egna ord. Vår agent förstår vad du behöver och matchar dig med rätt eventlokal.
              </p>
              <div className="mt-8 max-w-lg">
                <SearchInput />
              </div>
            </div>
            <div className="hidden lg:flex justify-center items-center">
              <VenueBuildings className="w-full max-w-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Venues with map section */}
      <HomeVenuesWithMap venues={venues} />

      {/* Browse categories */}
      <section className="border-t border-[#e7e5e4] bg-[#faf5f2]">
        <div className="px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-sm uppercase tracking-widest text-[#c45a3b]">
              Utforska
            </h2>
            <Link
              href="/venues"
              className="text-sm text-[#1a1a1a] underline underline-offset-4 hover:text-[#c45a3b]"
            >
              Visa alla lokaler
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Bröllop', query: 'bröllopslokal', image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80' },
              { label: 'Konferens', query: 'konferenslokal', image: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=800&q=80' },
              { label: 'Fest', query: 'festlokal', image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80' },
              { label: 'Middag', query: 'middagslokal', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80' },
            ].map((cat) => (
              <Link
                key={cat.label}
                href={`/venues?q=${encodeURIComponent(cat.query)}`}
                className="group relative aspect-[4/3] bg-[#f5f3f0] overflow-hidden rounded-lg"
              >
                <Image
                  src={cat.image}
                  alt={cat.label}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex items-end p-4 sm:p-5">
                  <span className="text-lg sm:text-xl text-white font-medium">
                    {cat.label}
                  </span>
                </div>
                <div className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white">
                    <path d="M3 13L13 3M13 3H5M13 3V11" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How the agent works */}
      <section className="bg-[#2a1f1a]">
        <div className="px-4 sm:px-6 py-14 sm:py-20">
          <p className="text-sm uppercase tracking-widest text-[#c9935a] mb-8">
            Så fungerar agenten
          </p>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-8 md:gap-6 items-start">
            <div>
              <div className="relative w-20 h-20 mb-4 rounded-full overflow-hidden shadow-lg ring-2 ring-[#c45a3b]/30">
                <Image
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&q=80"
                  alt="Person typing"
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-[#c45a3b] text-sm font-medium mb-2">01</p>
              <h3 className="text-[#fef3c7] font-medium mb-2">Beskriv ditt event</h3>
              <p className="text-[#a8977a] text-sm leading-relaxed">
                Skriv fritt vad du letar efter. Agenten förstår naturligt språk och ställer följdfrågor vid behov.
              </p>
            </div>

            {/* Arrow 1 */}
            <div className="hidden md:flex items-center justify-center h-20 px-2">
              <svg width="80" height="20" viewBox="0 0 80 20" fill="none" className="text-[#c45a3b] opacity-60 w-full">
                <path d="M0 10H72M72 10L62 3M72 10L62 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div>
              <div className="relative w-20 h-20 mb-4 rounded-full overflow-hidden shadow-lg ring-2 ring-[#7b4a6b]/30">
                <Image
                  src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&q=80"
                  alt="Beautiful venue"
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-[#7b4a6b] text-sm font-medium mb-2">02</p>
              <h3 className="text-[#fef3c7] font-medium mb-2">Få personliga förslag</h3>
              <p className="text-[#a8977a] text-sm leading-relaxed">
                Agenten analyserar hundratals eventlokaler och presenterar de som bäst matchar dina krav.
              </p>
            </div>

            {/* Arrow 2 */}
            <div className="hidden md:flex items-center justify-center h-20 px-2">
              <svg width="80" height="20" viewBox="0 0 80 20" fill="none" className="text-[#c45a3b] opacity-60 w-full">
                <path d="M0 10H72M72 10L62 3M72 10L62 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div>
              <div className="relative w-20 h-20 mb-4 rounded-full overflow-hidden shadow-lg ring-2 ring-[#c9935a]/30">
                <Image
                  src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=200&q=80"
                  alt="People celebrating"
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-[#c9935a] text-sm font-medium mb-2">03</p>
              <h3 className="text-[#fef3c7] font-medium mb-2">Boka direkt</h3>
              <p className="text-[#a8977a] text-sm leading-relaxed">
                Skicka förfrågan till lokalen du gillar. Lokalägaren svarar inom 24 timmar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA for venue owners */}
      <section className="bg-[#c45a3b]">
        <div className="px-4 sm:px-6 py-14 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="max-w-xl">
              <p className="text-sm uppercase tracking-widest text-[#fef3c7]/70 mb-4">
                För lokalägare
              </p>
              <h2 className="text-2xl sm:text-3xl text-white mb-4">
                Har du en lokal att hyra ut?
              </h2>
              <p className="text-[#fef3c7]/80 mb-6">
                Lista din lokal kostnadsfritt och nå kunder som aktivt letar efter en plats för sitt event.
              </p>
              <Link
                href="/auth/register/venue"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-[#c45a3b] font-medium rounded-full hover:bg-[#fef3c7] transition-colors shadow-sm"
              >
                Kom igång
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13M13 8L8 3M13 8L8 13" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </Link>
            </div>
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              <Image
                src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80"
                alt="Beautiful event venue"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
