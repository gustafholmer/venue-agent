'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 mb-8 mx-auto rounded-full bg-[#f5f3f0] flex items-center justify-center">
          <svg
            className="w-10 h-10 text-[#78716c]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-3">
          Något gick fel
        </h1>
        <p className="text-[#78716c] mb-8">
          Ett oväntat fel uppstod i din dashboard. Försök att ladda om sidan.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-[#1a1a1a] text-white hover:bg-[#333] focus-visible:ring-[#1a1a1a] h-10 px-5 text-sm"
          >
            Försök igen
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 border border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white focus-visible:ring-[#1a1a1a] h-10 px-5 text-sm"
          >
            Till Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
