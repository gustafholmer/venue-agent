'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Översikt' },
  { href: '/dashboard/venue', label: 'Min lokal' },
  { href: '/dashboard/venue/photos', label: 'Bilder', indent: true },
  { href: '/dashboard/bookings', label: 'Bokningar' },
  { href: '/dashboard/calendar', label: 'Kalender' },
  { href: '/dashboard/reviews', label: 'Recensioner' },
  { href: '/dashboard/payouts', label: 'Utbetalningar' },
  { href: '/dashboard/settings', label: 'Inställningar' },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-3 py-2 rounded-lg transition-colors ${
              item.indent ? 'pl-6 text-sm' : ''
            } ${
              isActive
                ? 'bg-[#f3f4f6] text-[#111827] font-medium'
                : 'text-[#374151] hover:bg-[#f3f4f6]'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
