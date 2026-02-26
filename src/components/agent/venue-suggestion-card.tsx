'use client'

interface VenueSuggestion {
  name: string
  slug: string
  capacity: string
  priceRange: string
  area: string
  matchReason: string
}

interface VenueSuggestionCardProps {
  suggestion: VenueSuggestion
}

export function VenueSuggestionCard({ suggestion }: VenueSuggestionCardProps) {
  return (
    <a
      href={`/venues/${suggestion.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-[#e7e5e4] rounded-xl p-3 hover:border-[#c45a3b] hover:shadow-sm transition-all bg-white"
    >
      <div className="font-medium text-sm text-[#1a1a1a]">{suggestion.name}</div>
      <div className="text-xs text-[#78716c] mt-1">
        {suggestion.area} · {suggestion.capacity} · {suggestion.priceRange}
      </div>
      <div className="text-xs text-[#78716c] mt-1 italic">
        {suggestion.matchReason}
      </div>
    </a>
  )
}
