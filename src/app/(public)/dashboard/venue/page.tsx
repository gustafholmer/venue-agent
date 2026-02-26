import Link from 'next/link'
import Image from 'next/image'
import { getVenues, type VenueListItem } from '@/actions/venues/get-venues'
import { Button } from '@/components/ui/button'

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: 'Utkast', className: 'bg-[#f5f3f0] text-[#78716c]' },
    published: { label: 'Publicerad', className: 'bg-[#d1fae5] text-[#065f46]' },
    paused: { label: 'Pausad', className: 'bg-[#fef3c7] text-[#92400e]' },
  }
  const { label, className } = config[status] || config.draft
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

function formatCapacity(venue: VenueListItem): string | null {
  const parts: string[] = []
  if (venue.capacity_seated) parts.push(`${venue.capacity_seated} sittande`)
  if (venue.capacity_standing) parts.push(`${venue.capacity_standing} staende`)
  return parts.length > 0 ? parts.join(' / ') : null
}

function VenueListCard({ venue }: { venue: VenueListItem }) {
  return (
    <Link
      href={`/dashboard/venue/${venue.id}`}
      className="group block bg-white border border-[#e7e5e4] rounded-xl overflow-hidden hover:border-[#c45a3b]/30 hover:shadow-sm transition-all"
    >
      {/* Photo */}
      <div className="relative aspect-[16/9] bg-[#f5f3f0]">
        {venue.primary_photo_url ? (
          <Image
            src={venue.primary_photo_url}
            alt={venue.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-[#d6d3d1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
        )}
        <div className="absolute top-2.5 right-2.5">
          <StatusBadge status={venue.status} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-base font-medium text-[#1a1a1a] group-hover:text-[#c45a3b] transition-colors">
          {venue.name}
        </h3>
        <p className="text-sm text-[#78716c] mt-1">
          {venue.city}
          {formatCapacity(venue) && (
            <span className="ml-1.5">
              &middot; {formatCapacity(venue)}
            </span>
          )}
        </p>
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#f5f3f0] flex items-center justify-center">
        <svg className="w-8 h-8 text-[#a8a29e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 7.5h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-[#1a1a1a] mb-2">Du har inga lokaler annu</h2>
      <p className="text-[#78716c] mb-6 max-w-sm mx-auto">
        Skapa din forsta lokal for att borja ta emot bokningsforfrågningar.
      </p>
      <Link href="/dashboard/venue/new">
        <Button>Skapa ny lokal</Button>
      </Link>
    </div>
  )
}

export default async function VenueListPage() {
  const result = await getVenues()
  const venues = result.venues || []

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#1a1a1a]">
            Mina lokaler
          </h1>
          <p className="text-[#78716c] mt-1">
            {venues.length > 0
              ? `${venues.length} ${venues.length === 1 ? 'lokal' : 'lokaler'}`
              : 'Hantera dina lokaler'}
          </p>
        </div>
        {venues.length > 0 && (
          <Link href="/dashboard/venue/new">
            <Button>Skapa ny lokal</Button>
          </Link>
        )}
      </div>

      {/* Content */}
      {venues.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((venue) => (
            <VenueListCard key={venue.id} venue={venue} />
          ))}
        </div>
      )}
    </div>
  )
}
