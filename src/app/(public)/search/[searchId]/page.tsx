import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getSearchById } from '@/actions/search/save-search'
import type { VenueResult } from '@/types/agent'

interface PageProps {
  params: Promise<{ searchId: string }>
}

function VenueResultCard({ venue }: { venue: VenueResult }) {
  return (
    <Link
      href={`/venues/${venue.slug}`}
      className="group block bg-white border border-[#e7e5e4] rounded-xl overflow-hidden hover:shadow-lg hover:border-[#d1d5db] transition-all"
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-[#faf9f7] relative overflow-hidden">
        {venue.imageUrl ? (
          <Image
            src={venue.imageUrl}
            alt={venue.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-[#d1d5db]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-[#1a1a1a] text-lg mb-1 line-clamp-1 group-hover:text-[#c45a3b] transition-colors">
          {venue.name}
        </h3>

        <p className="text-sm text-[#78716c] mb-3">{venue.area}</p>

        <div className="flex items-center justify-between text-sm">
          <span className="text-[#c45a3b] font-semibold">
            {venue.price > 0 ? `${venue.price.toLocaleString('sv-SE')} SEK` : 'Pris på förfrågan'}
          </span>
          <span className="text-[#78716c]">
            {venue.capacity} pers
          </span>
        </div>

        {venue.matchReason && (
          <p className="text-xs text-[#78716c] mt-2 italic line-clamp-2">
            {venue.matchReason}
          </p>
        )}
      </div>
    </Link>
  )
}

function formatSearchCriteria(search: {
  event_type: string | null
  guest_count: number | null
  areas: string[]
  budget_min: number | null
  budget_max: number | null
  preferred_date: string | null
  vibe_description: string | null
}): string[] {
  const criteria: string[] = []

  if (search.event_type) {
    criteria.push(`Eventtyp: ${search.event_type}`)
  }

  if (search.guest_count) {
    criteria.push(`Antal gäster: ${search.guest_count}`)
  }

  if (search.areas && search.areas.length > 0) {
    criteria.push(`Område: ${search.areas.join(', ')}`)
  }

  if (search.budget_max) {
    if (search.budget_min) {
      criteria.push(`Budget: ${search.budget_min.toLocaleString('sv-SE')}-${search.budget_max.toLocaleString('sv-SE')} kr`)
    } else {
      criteria.push(`Budget: max ${search.budget_max.toLocaleString('sv-SE')} kr`)
    }
  }

  if (search.preferred_date) {
    const date = new Date(search.preferred_date)
    criteria.push(`Datum: ${date.toLocaleDateString('sv-SE')}`)
  }

  if (search.vibe_description) {
    criteria.push(`Känsla: "${search.vibe_description}"`)
  }

  return criteria
}

async function SearchResultsContent({ params }: PageProps) {
  const { searchId } = await params

  const result = await getSearchById(searchId)

  if (!result.success || !result.search) {
    notFound()
  }

  const { search, venues = [] } = result
  const criteria = formatSearchCriteria(search)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1a1a1a] mb-4">
          Sökresultat
        </h1>

        {/* Search criteria */}
        {criteria.length > 0 && (
          <div className="bg-[#faf9f7] rounded-xl p-4 mb-6">
            <h2 className="text-sm font-semibold text-[#57534e] mb-2">Sökkriterier:</h2>
            <div className="flex flex-wrap gap-2">
              {criteria.map((criterion, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white border border-[#e7e5e4] text-[#57534e]"
                >
                  {criterion}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Link href="/search">
            <Button variant="primary">
              Gör en ny sökning
            </Button>
          </Link>
          <Link href="/venues">
            <Button variant="secondary">
              Utforska alla lokaler
            </Button>
          </Link>
        </div>
      </div>

      {/* Results */}
      {venues.length > 0 ? (
        <>
          <p className="text-[#78716c] mb-6">
            {venues.length} {venues.length === 1 ? 'lokal' : 'lokaler'} matchade din sökning
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.map((venue) => (
              <VenueResultCard key={venue.id} venue={venue} />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12 bg-[#faf9f7] rounded-xl">
          <svg className="w-16 h-16 text-[#d1d5db] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">
            Inga lokaler hittades
          </h3>
          <p className="text-[#78716c] mb-6 max-w-md mx-auto">
            Den här sökningen har inga tillgängliga resultat längre. Prova att göra en ny sökning.
          </p>
          <Link href="/search">
            <Button variant="primary">
              Gör en ny sökning
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="animate-pulse">
        <div className="h-8 bg-[#e7e5e4] rounded w-48 mb-4" />
        <div className="h-24 bg-[#f3f4f6] rounded-xl mb-6" />
        <div className="h-10 bg-[#e7e5e4] rounded w-32 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#f3f4f6] rounded-xl h-72" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default async function SearchResultsPage(props: PageProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <SearchResultsContent params={props.params} />
    </Suspense>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { searchId } = await params
  return {
    title: `Sökresultat - Tryffle`,
    description: `Se sökresultat för lokaler.`,
    robots: {
      index: false,
      follow: true,
    },
  }
}
