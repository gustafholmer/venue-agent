'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/account', label: 'Mitt konto', exact: true },
  { href: '/account/bookings', label: 'Mina bokningar' },
  { href: '/account/saved', label: 'Sparade lokaler' },
  { href: '/account/settings', label: 'Inställningar' },
]

export function AccountNav() {
  const pathname = usePathname()

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-64 shrink-0 bg-white border-r border-[#e7e5e4] p-4 hidden lg:block min-h-[calc(100vh-4rem)]">
        <nav className="space-y-1">
          {NAV_ITEMS.map(({ href, label, exact }) => (
            <Link
              key={href}
              href={href}
              className={`block px-3 py-2 rounded-lg transition-colors ${
                isActive(href, exact)
                  ? 'bg-[#c45a3b]/10 text-[#c45a3b] font-medium'
                  : 'text-[#57534e] hover:bg-[#f5f5f4]'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile navigation */}
      <div className="lg:hidden bg-white border-b border-[#e7e5e4]">
        <div className="flex overflow-x-auto">
          {NAV_ITEMS.map(({ href, label, exact }) => (
            <Link
              key={href}
              href={href}
              className={`flex-shrink-0 px-4 py-3 text-sm border-b-2 transition-colors ${
                isActive(href, exact)
                  ? 'text-[#c45a3b] border-[#c45a3b] font-medium'
                  : 'text-[#57534e] hover:text-[#1a1a1a] border-transparent hover:border-[#c45a3b]'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
