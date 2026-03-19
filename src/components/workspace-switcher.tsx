'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
)

const BuildingIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
  </svg>
)

export function WorkspaceSwitcher() {
  const pathname = usePathname()
  const isOnDashboard = pathname.startsWith('/dashboard')

  return (
    <div role="group" aria-label="Byt roll" className="inline-flex rounded-full border border-[#d4bfb6] overflow-hidden">
      {/* Bokare segment */}
      {isOnDashboard ? (
        <Link
          href="/venues"
          className="inline-flex items-center gap-1.5 min-h-11 sm:min-h-0 px-3 py-1.5 text-sm text-[#5a4a42] hover:bg-[#c45a3b]/10 transition-colors"
        >
          <CalendarIcon className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
          <span className="sr-only sm:not-sr-only">Bokare</span>
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1.5 min-h-11 sm:min-h-0 px-3 py-1.5 text-sm bg-[#c45a3b] text-white font-medium">
          <CalendarIcon className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
          <span className="sr-only sm:not-sr-only">Bokare</span>
        </span>
      )}

      {/* Uthyrare segment */}
      {isOnDashboard ? (
        <span className="inline-flex items-center gap-1.5 min-h-11 sm:min-h-0 px-3 py-1.5 text-sm bg-[#7b4a6b] text-white font-medium">
          <BuildingIcon className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
          <span className="sr-only sm:not-sr-only">Uthyrare</span>
        </span>
      ) : (
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 min-h-11 sm:min-h-0 px-3 py-1.5 text-sm text-[#5a4a42] hover:bg-[#7b4a6b]/10 transition-colors"
        >
          <BuildingIcon className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
          <span className="sr-only sm:not-sr-only">Uthyrare</span>
        </Link>
      )}
    </div>
  )
}

export function AccentBar() {
  const pathname = usePathname()
  const isOnDashboard = pathname.startsWith('/dashboard')

  return (
    <div
      className="h-[3px] w-full"
      style={{ background: isOnDashboard ? '#7b4a6b' : '#c45a3b' }}
    />
  )
}
