'use client'

import { useState } from 'react'
import { proposeModification } from '@/actions/bookings/propose-modification'
import { formatPrice } from '@/lib/pricing'
import type { BookingRequest } from '@/types/database'

interface ModificationFormProps {
  booking: BookingRequest
  canEditPrice: boolean
  onClose: () => void
  onSuccess: () => void
}

const TIME_OPTIONS = Array.from({ length: 16 }, (_, i) => {
  const hour = i + 8
  return `${hour.toString().padStart(2, '0')}:00:00`
})

export function ModificationForm({
  booking,
  canEditPrice,
  onClose,
  onSuccess,
}: ModificationFormProps) {
  const [eventDate, setEventDate] = useState(booking.event_date)
  const [startTime, setStartTime] = useState(booking.start_time || '')
  const [endTime, setEndTime] = useState(booking.end_time || '')
  const [guestCount, setGuestCount] = useState(booking.guest_count?.toString() || '')
  const [basePrice, setBasePrice] = useState(booking.base_price.toString())
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getChanges = () => {
    const changes: Record<string, unknown> = {}
    if (eventDate !== booking.event_date) {
      changes.proposedEventDate = eventDate
    }
    if (startTime !== (booking.start_time || '')) {
      changes.proposedStartTime = startTime
    }
    if (endTime !== (booking.end_time || '')) {
      changes.proposedEndTime = endTime
    }
    if (guestCount && parseInt(guestCount) !== booking.guest_count) {
      changes.proposedGuestCount = parseInt(guestCount)
    }
    if (canEditPrice && parseInt(basePrice) !== booking.base_price) {
      changes.proposedBasePrice = parseInt(basePrice)
    }
    return changes
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const changes = getChanges()
    if (Object.keys(changes).length === 0) {
      setError('Inga ändringar gjorda')
      return
    }

    setIsSubmitting(true)
    const result = await proposeModification({
      bookingId: booking.id,
      ...changes,
    } as Parameters<typeof proposeModification>[0])

    if (result.success) {
      onSuccess()
    } else {
      setError(result.error || 'Kunde inte skicka ändringsförslaget')
    }
    setIsSubmitting(false)
  }

  const hasChanges = Object.keys(getChanges()).length > 0

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Föreslå ändring</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Ändra de fält du vill uppdatera. Förslaget skickas till motparten för godkännande.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
            <input
              type="date"
              value={eventDate}
              min={minDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starttid</label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent"
              >
                <option value="">Välj tid</option>
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t.slice(0, 5)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sluttid</label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent"
              >
                <option value="">Välj tid</option>
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t.slice(0, 5)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Antal gäster</label>
            <input
              type="number"
              value={guestCount}
              min={1}
              onChange={(e) => setGuestCount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent"
            />
          </div>

          {canEditPrice ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pris (kr)</label>
              <input
                type="number"
                value={basePrice}
                min={1}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">Grundpris exkl. plattformsavgift</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pris</label>
              <p className="text-sm text-gray-600">{formatPrice(booking.base_price)} (totalt: {formatPrice(booking.total_price)})</p>
              <p className="mt-1 text-xs text-gray-500">Kontakta lokalägaren för prisändringar</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anledning (valfritt)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Beskriv varför du vill ändra bokningen..."
              rows={2}
              maxLength={500}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !hasChanges}
              className="px-4 py-2 text-sm font-medium text-white bg-[#c45a3b] rounded-lg hover:bg-[#b04e33] disabled:opacity-50"
            >
              {isSubmitting ? 'Skickar...' : 'Skicka förslag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
