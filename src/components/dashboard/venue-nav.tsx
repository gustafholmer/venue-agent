'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface VenueNavProps {
  venueId: string
}

const NAV_ITEMS = [
  { path: '', label: 'Lokal' },
  { path: '/bookings', label: 'Bokningar' },
  { path: '/calendar', label: 'Kalender' },
]

export function VenueNav({ venueId }: VenueNavProps) {
  const pathname = usePathname()
  const basePath = `/dashboard/venue/${venueId}`

  function isActive(itemPath: string) {
    const fullPath = basePath + itemPath
    if (itemPath === '') {
      return pathname === basePath
    }
    return pathname.startsWith(fullPath)
  }

  return (
    <nav className="flex gap-1 border-b border-[#e7e5e4] overflow-x-auto">
      {NAV_ITEMS.map(({ path, label }) => {
        const active = isActive(path)
        return (
          <Link
            key={path}
            href={basePath + path}
            className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              active
                ? 'text-[#c45a3b] border-[#c45a3b]'
                : 'text-[#78716c] border-transparent hover:text-[#1a1a1a] hover:border-[#d6d3d1]'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
