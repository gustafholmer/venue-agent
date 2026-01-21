'use client'

import type { Suggestion } from '@/types/agent'

interface SuggestionChipProps {
  suggestion: Suggestion
  onApply: (suggestion: Suggestion) => void
  disabled?: boolean
}

export function SuggestionChip({ suggestion, onApply, disabled }: SuggestionChipProps) {
  return (
    <button
      type="button"
      onClick={() => onApply(suggestion)}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#e5e7eb] rounded-full text-sm hover:border-[#1e3a8a] hover:bg-[#f0f4ff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="text-[#374151]">{suggestion.label}</span>
      <span className="text-[#1e3a8a] font-medium">Använd</span>
    </button>
  )
}
