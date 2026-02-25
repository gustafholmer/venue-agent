'use client'

import { useState } from 'react'
import type { BookingModification, BookingRequest } from '@/types/database'
import { ModificationDiff } from './modification-diff'
import { acceptModification } from '@/actions/bookings/accept-modification'
import { declineModification } from '@/actions/bookings/decline-modification'
import { cancelModification } from '@/actions/bookings/cancel-modification'

interface ModificationBannerProps {
  booking: BookingRequest
  modification: BookingModification
  currentUserId: string
  onResolved: () => void
}

export function ModificationBanner({
  booking,
  modification,
  currentUserId,
  onResolved,
}: ModificationBannerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  const isProposer = modification.proposed_by === currentUserId

  const handleAccept = async () => {
    setIsSubmitting(true)
    setError(null)
    const result = await acceptModification(modification.id)
    if (result.success) {
      onResolved()
    } else {
      setError(result.error || 'Kunde inte godkänna ändringen')
    }
    setIsSubmitting(false)
  }

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      setError('Ange en anledning')
      return
    }
    setIsSubmitting(true)
    setError(null)
    const result = await declineModification(modification.id, declineReason.trim())
    if (result.success) {
      setShowDeclineModal(false)
      onResolved()
    } else {
      setError(result.error || 'Kunde inte neka ändringen')
    }
    setIsSubmitting(false)
  }

  const handleCancel = async () => {
    setIsSubmitting(true)
    setError(null)
    const result = await cancelModification(modification.id)
    if (result.success) {
      onResolved()
    } else {
      setError(result.error || 'Kunde inte dra tillbaka förslaget')
    }
    setIsSubmitting(false)
  }

  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-amber-900 mb-3">
          {isProposer
            ? 'Du har föreslagit en ändring'
            : 'Ändringsförslag att granska'}
        </h3>

        <ModificationDiff booking={booking} modification={modification} />

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          {isProposer ? (
            <>
              <p className="text-sm text-amber-700 self-center">Väntar på svar...</p>
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Dra tillbaka
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleAccept}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Godkänner...' : 'Godkänn'}
              </button>
              <button
                onClick={() => setShowDeclineModal(true)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                Neka
              </button>
            </>
          )}
        </div>
      </div>

      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Neka ändringsförslag</h3>
              <button
                onClick={() => setShowDeclineModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Ange en anledning till varför du nekar ändringen.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Anledning..."
              rows={3}
              maxLength={500}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent"
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={handleDecline}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Nekar...' : 'Neka förslag'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
