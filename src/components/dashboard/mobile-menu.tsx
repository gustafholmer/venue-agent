'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from './nav-items'

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Hamburger button - visible only below lg */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2.5 -ml-2 hover:bg-[#f3f4f6] rounded-lg transition-colors"
        aria-label="Öppna meny"
      >
        <svg className="w-5 h-5 text-[#374151]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out panel */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-72 bg-white z-50 transform transition-transform duration-200 ease-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-[#e5e7eb]">
          <span className="font-[family-name:var(--font-playfair)] text-xl text-[#111827]">
            Tryffle
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-[#f3f4f6] rounded-lg transition-colors"
            aria-label="Stäng meny"
          >
            <svg className="w-5 h-5 text-[#6b7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
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
      </div>
    </>
  )
}
