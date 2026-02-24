'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function WorkspaceSwitcher() {
  const pathname = usePathname()
  const isOnDashboard = pathname.startsWith('/dashboard')

  const href = isOnDashboard ? '/venues' : '/dashboard'
  const label = isOnDashboard ? 'Boka lokal' : 'Hantera lokal'

  const icon = isOnDashboard ? (
    // Calendar icon (Boka lokal) — distinct from existing search icon
    <svg className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ) : (
    // Building icon (Hantera lokal)
    <svg className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  )

  return (
    <>
      {/* Mobile: icon-only round button with border */}
      <Link
        href={href}
        className="sm:hidden inline-flex items-center justify-center w-11 h-11 rounded-full border border-[#d4bfb6] text-[#5a4a42] hover:bg-[#c45a3b]/10 hover:text-[#c45a3b] hover:border-[#c45a3b]/30 transition-all"
        aria-label={label}
      >
        {icon}
      </Link>

      {/* Desktop: icon + label pill with border */}
      <Link
        href={href}
        className="hidden sm:inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border border-[#d4bfb6] text-[#5a4a42] hover:bg-[#c45a3b]/10 hover:text-[#c45a3b] hover:border-[#c45a3b]/30 transition-all"
      >
        {icon}
        <span>{label}</span>
      </Link>
    </>
  )
}
