'use client'

import { useSavedVenues } from '@/contexts/saved-venues-context'

interface SaveButtonProps {
  venueId: string
  className?: string
  size?: 'sm' | 'md'
}

export function SaveButton({ venueId, className = '', size = 'sm' }: SaveButtonProps) {
  const { isSaved, toggleSave, isLoading } = useSavedVenues()
  const saved = isSaved(venueId)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleSave(venueId)
  }

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  const buttonSize = size === 'sm' ? 'p-1.5' : 'p-2'

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`${buttonSize} bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-all duration-200 disabled:opacity-50 ${className}`}
      title={saved ? 'Ta bort från sparade' : 'Spara lokal'}
      aria-label={saved ? 'Ta bort från sparade' : 'Spara lokal'}
    >
      <svg
        className={`${iconSize} transition-all duration-200 ${
          saved ? 'text-red-500 scale-110' : 'text-[#78716c] hover:text-red-400'
        }`}
        fill={saved ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={saved ? 0 : 1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  )
}
