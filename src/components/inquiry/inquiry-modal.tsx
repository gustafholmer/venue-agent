'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createInquiry } from '@/actions/inquiries/create-inquiry'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { EVENT_TYPES } from '@/lib/constants'

interface InquiryModalProps {
  venueId: string
  venueSlug: string
  venueName: string
  minCapacity?: number
  maxCapacity?: number
  isOpen: boolean
  onClose: () => void
}

export function InquiryModal({
  venueId,
  venueSlug,
  venueName,
  minCapacity,
  maxCapacity,
  isOpen,
  onClose,
}: InquiryModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [eventDate, setEventDate] = useState('')
  const [eventType, setEventType] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [message, setMessage] = useState('')

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  // Set min date to tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await createInquiry({
        venueId,
        eventDate,
        eventType,
        guestCount: parseInt(guestCount, 10),
        message,
      })

      if (result.existingInquiryId) {
        router.push(`/account/inquiries/${result.existingInquiryId}`)
        return
      }

      if (result.success && result.inquiryId) {
        router.push(`/account/inquiries/${result.inquiryId}`)
        return
      }

      setError(result.error || 'Något gick fel')
    } catch {
      setError('Ett oväntat fel uppstod')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Ställ en fråga om ${venueName}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-[#e7e5e4] px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1a1a1a]">
            Ställ en fråga om {venueName}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#f5f3f0] transition-colors"
            aria-label="Stäng"
          >
            <svg className="w-5 h-5 text-[#78716c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Event Date */}
          <div>
            <label htmlFor="inquiry-event-date" className="block text-sm font-medium text-[#57534e] mb-2">
              Eventdatum <span className="text-red-500">*</span>
            </label>
            <input
              id="inquiry-event-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              min={minDate}
              className="w-full px-3 py-2 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent"
              required
            />
          </div>

          {/* Event Type */}
          <div>
            <label htmlFor="inquiry-event-type" className="block text-sm font-medium text-[#57534e] mb-2">
              Typ av event <span className="text-red-500">*</span>
            </label>
            <select
              id="inquiry-event-type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#e5e5e5] bg-white text-[#1a1a1a] focus:outline-none focus:border-[#c45a3b] focus:ring-1 focus:ring-[#c45a3b]"
              required
            >
              <option value="">Välj typ av event</option>
              {EVENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Guest Count */}
          <div>
            <label htmlFor="inquiry-guest-count" className="block text-sm font-medium text-[#57534e] mb-2">
              Antal gäster <span className="text-red-500">*</span>
            </label>
            <Input
              id="inquiry-guest-count"
              type="number"
              min={minCapacity || 1}
              max={maxCapacity || undefined}
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              placeholder="T.ex. 50"
              required
            />
            {minCapacity && minCapacity > 1 && (
              <p className="text-sm text-[#78716c] mt-1">
                Minst {minCapacity} gäster
              </p>
            )}
          </div>

          {/* Message */}
          <div>
            <label htmlFor="inquiry-message" className="block text-sm font-medium text-[#57534e] mb-2">
              Meddelande <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="inquiry-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Beskriv vad du undrar över..."
              maxLength={2000}
              required
            />
            <p className="text-xs text-[#a8a29e] mt-1 text-right">
              {message.length} / 2000
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="flex-shrink-0 p-1 hover:bg-red-100 rounded"
                aria-label="Stäng"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={isSubmitting}
          >
            Skicka förfrågan
          </Button>
        </form>
      </div>
    </div>
  )
}
