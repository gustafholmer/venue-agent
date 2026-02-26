'use client'

import { useState } from 'react'
import { modifyAction } from '@/actions/agent-actions/modify-action'
import type { BookingApprovalSummary } from '@/types/agent-booking'

interface ModifyDialogProps {
  actionId: string
  originalSummary: BookingApprovalSummary
  onClose: () => void
  onComplete: () => void
}

function formatPriceInput(price: number): string {
  return String(price)
}

export function ModifyDialog({ actionId, originalSummary, onClose, onComplete }: ModifyDialogProps) {
  const [price, setPrice] = useState(formatPriceInput(originalSummary.price))
  const [date, setDate] = useState(originalSummary.date)
  const [startTime, setStartTime] = useState(originalSummary.startTime)
  const [endTime, setEndTime] = useState(originalSummary.endTime)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const parsedPrice = parseInt(price, 10)

      const result = await modifyAction({
        actionId,
        adjustedPrice: !isNaN(parsedPrice) && parsedPrice !== originalSummary.price ? parsedPrice : undefined,
        suggestedDate: date !== originalSummary.date ? date : undefined,
        suggestedStartTime: startTime !== originalSummary.startTime ? startTime : undefined,
        suggestedEndTime: endTime !== originalSummary.endTime ? endTime : undefined,
        note: note.trim() || undefined,
      })

      if (!result.success) {
        setError(result.error ?? 'Kunde inte skicka motbud')
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
      <p className="text-xs font-medium text-[#78716c] uppercase tracking-wide">Andra bokning</p>

      <div className="grid grid-cols-2 gap-2">
        {/* Price */}
        <div>
          <label htmlFor={`price-${actionId}`} className="block text-xs text-[#78716c] mb-1">
            Pris (kr)
          </label>
          <input
            id={`price-${actionId}`}
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full h-9 px-3 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:border-[#c45a3b]"
          />
        </div>

        {/* Date */}
        <div>
          <label htmlFor={`date-${actionId}`} className="block text-xs text-[#78716c] mb-1">
            Datum
          </label>
          <input
            id={`date-${actionId}`}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-9 px-3 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:border-[#c45a3b]"
          />
        </div>

        {/* Start time */}
        <div>
          <label htmlFor={`start-${actionId}`} className="block text-xs text-[#78716c] mb-1">
            Starttid
          </label>
          <input
            id={`start-${actionId}`}
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full h-9 px-3 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:border-[#c45a3b]"
          />
        </div>

        {/* End time */}
        <div>
          <label htmlFor={`end-${actionId}`} className="block text-xs text-[#78716c] mb-1">
            Sluttid
          </label>
          <input
            id={`end-${actionId}`}
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full h-9 px-3 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:border-[#c45a3b]"
          />
        </div>
      </div>

      {/* Note */}
      <div>
        <label htmlFor={`note-${actionId}`} className="block text-xs text-[#78716c] mb-1">
          Meddelande till kund (valfritt)
        </label>
        <textarea
          id={`note-${actionId}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="T.ex. Vi kan erbjuda ett bra pris om ni bokar catering hos oss..."
          className="w-full px-3 py-2 text-sm border border-[#e7e5e4] rounded-lg resize-none focus:outline-none focus:border-[#c45a3b]"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 h-9 text-sm font-medium bg-[#c45a3b] text-white rounded-lg hover:bg-[#a84832] disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
        >
          {isSubmitting && <Spinner />}
          Skicka motbud
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
