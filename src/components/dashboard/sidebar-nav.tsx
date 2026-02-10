'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from './nav-items'

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
                ? 'bg-[#f3f4f6] text-[#1a1a1a] font-medium'
                : 'text-[#57534e] hover:bg-[#f3f4f6]'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
