'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function PreferenceInput({
  initialValue = '',
  demoMode = false
}: {
  initialValue?: string
  demoMode?: boolean
}) {
  const [input, setInput] = useState(initialValue)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return

    setIsLoading(true)
    setError(null)

    if (demoMode) {
      router.push('/results')
      return
    }

    const { savePreferences } = await import('@/actions/preferences/save-preferences')
    const result = await savePreferences(input)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    router.push('/results')
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="border border-[#e5e7eb] rounded-2xl p-4 focus-within:border-[#d1d5db] transition-colors">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tvåa i Södermalm, max 4 miljoner, gärna balkong..."
          className="w-full text-[#111827] placeholder:text-[#9ca3af] focus:outline-none text-lg mb-3"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Optional filter pills could go here */}
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 text-[#6b7280] hover:text-[#1e3a8a] disabled:opacity-40 transition-colors"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {error && (
        <p className="text-red-600 text-sm mt-2">{error}</p>
      )}
    </form>
  )
}
