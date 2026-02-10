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
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#e7e5e4] rounded-full text-sm hover:border-[#c45a3b] hover:bg-[#f0f4ff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="text-[#57534e]">{suggestion.label}</span>
      <span className="text-[#c45a3b] font-medium">Använd</span>
    </button>
  )
}
