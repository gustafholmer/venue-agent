import Link from 'next/link'

export interface VenueCardData {
  id: string
  name: string
  slug: string | null
  area: string | null
  city: string
  capacity_standing: number | null
  capacity_seated: number | null
  price_per_hour: number | null
  price_half_day: number | null
  price_full_day: number | null
  price_evening: number | null
  primaryPhotoUrl?: string | null
  latitude?: number | null
  longitude?: number | null
}

interface VenueCardProps {
  venue: VenueCardData
}

function formatPrice(venue: VenueCardData): string {
  const price = venue.price_evening || venue.price_full_day || venue.price_half_day || venue.price_per_hour
  if (!price) return 'Pris på förfrågan'
  return `från ${price.toLocaleString('sv-SE')} kr`
}

function formatCapacity(venue: VenueCardData): string {
  if (venue.capacity_seated) return `${venue.capacity_seated} gäster`
  if (venue.capacity_standing) return `${venue.capacity_standing} ståendes`
  return ''
}

export function VenueCard({ venue }: VenueCardProps) {
  const href = venue.slug ? `/venues/${venue.slug}` : `/venues/${venue.id}`

  return (
    <Link href={href} className="group block">
      {/* Image */}
      <div className="aspect-[4/3] bg-[#f5f3f0] mb-2 overflow-hidden rounded-sm">
        {venue.primaryPhotoUrl ? (
          <img
            src={venue.primaryPhotoUrl}
            alt={venue.name}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[#78716c] text-sm">Ingen bild</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        <h3 className="text-base font-medium text-[#1a1a1a] group-hover:text-[#c45a3b] transition-colors leading-snug">
          {venue.name}
        </h3>
        <p className="text-xs text-[#78716c] mt-0.5">
          {venue.area ? `${venue.area}, ${venue.city}` : venue.city}
          {formatCapacity(venue) && ` · ${formatCapacity(venue)}`}
        </p>
        <p className="text-xs text-[#1a1a1a] mt-0.5">
          {formatPrice(venue)}
        </p>
      </div>
    </Link>
  )
}
