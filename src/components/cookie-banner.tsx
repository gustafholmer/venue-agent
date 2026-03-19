'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'cookie-banner-dismissed'

export function CookieBanner() {
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === 'true')
  }, [])

  if (dismissed !== false) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-[fadeIn_0.5s_ease-out]">
      <div className="mx-auto max-w-xl bg-white rounded-xl shadow-lg border border-[#e7e5e4] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <p className="text-sm text-[#5a4a42] flex-1">
          <span className="mr-1.5">🍪</span>
          Vi använder cookies för att sajten ska fungera.{' '}
          <Link href="/policy" className="text-[#c45a3b] underline hover:text-[#a84832]">
            Läs mer
          </Link>
        </p>
        <button
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, 'true')
            setDismissed(true)
          }}
          className="text-sm font-medium px-5 py-1.5 rounded-full bg-[#c45a3b] text-white hover:bg-[#a84832] transition-colors shadow-sm whitespace-nowrap self-end sm:self-auto"
        >
          Jag förstår
        </button>
      </div>
    </div>
  )
}
