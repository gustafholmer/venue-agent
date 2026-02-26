'use client'

import { useState } from 'react'
import { replyToEscalation } from '@/actions/agent-actions/reply-to-escalation'

interface ReplyDialogProps {
  actionId: string
  onClose: () => void
  onComplete: () => void
}

export function ReplyDialog({ actionId, onClose, onComplete }: ReplyDialogProps) {
  const [response, setResponse] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!response.trim()) {
      setError('Skriv ett svar')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await replyToEscalation(actionId, response.trim())
      if (!result.success) {
        setError(result.error ?? 'Kunde inte skicka svar')
      } else {
        onComplete()
      }
    } catch {
      setError('Ett ovantat fel uppstod')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-[#e7e5e4] space-y-3">
      <label htmlFor={`reply-${actionId}`} className="block text-xs font-medium text-[#78716c]">
        Ditt svar till kunden:
      </label>

      <textarea
        id={`reply-${actionId}`}
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        rows={4}
        placeholder="Skriv ditt svar har..."
        className="w-full px-3 py-2 text-sm border border-[#e7e5e4] rounded-lg resize-none focus:outline-none focus:border-[#c45a3b]"
      />

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting || !response.trim()}
          className="flex-1 h-9 text-sm font-medium bg-[#c45a3b] text-white rounded-lg hover:bg-[#a84832] disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
        >
          {isSubmitting && <Spinner />}
          Skicka
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="flex-1 h-9 text-sm font-medium text-[#1a1a1a] border border-[#e7e5e4] rounded-lg hover:bg-[#f5f5f4] disabled:opacity-50 transition-colors"
        >
          Avbryt
        </button>
      </div>
    </form>
  )
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
