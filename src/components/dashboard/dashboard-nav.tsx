'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { NAV_ITEMS } from './nav-items'
import { getPendingActionCount } from '@/actions/agent-actions/get-pending-count'

export function DashboardNav() {
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    getPendingActionCount().then(setPendingCount)
  }, [])

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-64 shrink-0 bg-white border-r border-[#e7e5e4] p-4 hidden lg:block min-h-[calc(100vh-4rem)]">
        <nav className="space-y-1">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                isActive(href)
                  ? 'bg-[#c45a3b]/10 text-[#c45a3b] font-medium'
                  : 'text-[#57534e] hover:bg-[#f5f5f4]'
              }`}
            >
              <span>{label}</span>
              {href === '/dashboard/actions' && pendingCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#c45a3b] text-white text-xs font-semibold leading-none">
                  {pendingCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile navigation */}
      <div className="lg:hidden bg-white border-b border-[#e7e5e4] w-full">
        <div className="flex overflow-x-auto">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm border-b-2 transition-colors ${
                isActive(href)
                  ? 'text-[#c45a3b] border-[#c45a3b] font-medium'
                  : 'text-[#57534e] hover:text-[#1a1a1a] border-transparent hover:border-[#c45a3b]'
              }`}
            >
              {label}
              {href === '/dashboard/actions' && pendingCount > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#c45a3b] text-white text-[10px] font-semibold leading-none">
                  {pendingCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
