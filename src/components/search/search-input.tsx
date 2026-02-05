'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

const EXAMPLE_SEARCHES = [
  'Bröllopslokal för 80 gäster i Stockholm',
  'Konferenslokal med AV-utrustning för 50 personer',
  'Festlokal på Södermalm, budget 20 000 kr',
  'Mingellokal för release-party, 100 pers',
  'Rustik lada för bröllopsmiddag i Uppsala',
  'Modernt mötesrum för workshop, 20 deltagare',
  'Takterrass för sommarfest i Göteborg',
  'Lokal för företagsjulbord, 150 gäster',
]

interface SearchInputProps {
  initialValue?: string
  className?: string
}

export function SearchInput({
  initialValue = '',
  className = '',
}: SearchInputProps) {
  const [query, setQuery] = useState(initialValue)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [placeholder, setPlaceholder] = useState('')
  const [exampleIndex, setExampleIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (query) return // Don't animate if user has typed something

    const currentExample = EXAMPLE_SEARCHES[exampleIndex]

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (charIndex < currentExample.length) {
          setPlaceholder(currentExample.slice(0, charIndex + 1))
          setCharIndex(charIndex + 1)
        } else {
          // Pause at end, then start deleting
          setTimeout(() => setIsDeleting(true), 2000)
        }
      } else {
        // Deleting
        if (charIndex > 0) {
          setPlaceholder(currentExample.slice(0, charIndex - 1))
          setCharIndex(charIndex - 1)
        } else {
          // Move to next example
          setIsDeleting(false)
          setExampleIndex((exampleIndex + 1) % EXAMPLE_SEARCHES.length)
        }
      }
    }, isDeleting ? 30 : 50)

    return () => clearTimeout(timeout)
  }, [charIndex, isDeleting, exampleIndex, query])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    setIsSubmitting(true)

    try {
      router.push(`/venues?q=${encodeURIComponent(trimmedQuery)}`)
    } catch (error) {
      console.error('Navigation failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label="Sök eventlokal"
          className="w-full h-16 pl-6 pr-16 text-base text-[#1a1a1a] bg-white border-2 border-[#c45a3b]/30 rounded-full shadow-md focus:border-[#c45a3b] focus:shadow-lg focus:outline-none transition-all placeholder:text-[#a8a29e]"
        />
        <button
          type="submit"
          disabled={!query.trim() || isSubmitting}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-[#c45a3b] text-white rounded-full hover:bg-[#a84832] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Sök"
        >
          {isSubmitting ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          )}
        </button>
      </div>
    </form>
  )
}
