'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getBooking, type BookingWithVenue } from '@/actions/bookings/get-booking'
import { acceptBooking } from '@/actions/bookings/accept-booking'
import { declineBooking } from '@/actions/bookings/decline-booking'
import { getBookingModification } from '@/actions/bookings/get-booking-modification'
import { formatPrice } from '@/lib/pricing'
import { MessageThread } from '@/components/booking/message-thread'
import { ModificationBanner } from '@/components/booking/modification-banner'
import { ModificationForm } from '@/components/booking/modification-form'
import { createClient } from '@/lib/supabase/client'
import type { BookingModification } from '@/types/database'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Väntande', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  accepted: { label: 'Godkänd', color: 'bg-green-100 text-green-800 border-green-200' },
  declined: { label: 'Nekad', color: 'bg-red-100 text-red-800 border-red-200' },
  cancelled: { label: 'Avbokad', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  completed: { label: 'Genomförd', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  paid_out: { label: 'Utbetald', color: 'bg-purple-100 text-purple-800 border-purple-200' },
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  aw: 'AW',
  konferens: 'Konferens',
  fest: 'Fest',
  workshop: 'Workshop',
  middag: 'Middag',
  foretag: 'Företagsevent',
  privat: 'Privat event',
  annat: 'Annat',
}

export default function BookingDetailPage() {
  const { id: venueId, bookingId } = useParams<{ id: string; bookingId: string }>()
  const router = useRouter()

  const [booking, setBooking] = useState<BookingWithVenue | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [modification, setModification] = useState<BookingModification | undefined>()
  const [showModificationForm, setShowModificationForm] = useState(false)

  // Decline modal state
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [declineError, setDeclineError] = useState<string | null>(null)

  // Fetch current user
  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    fetchUser()
  }, [])

  const fetchBooking = useCallback(async () => {
    setIsLoading(true)
    const result = await getBooking(bookingId)
    if (result.success && result.booking) {
      setBooking(result.booking)
      setError(null)
      // Fetch pending modification
      const modResult = await getBookingModification(bookingId)
      if (modResult.success) {
        setModification(modResult.modification)
      }
    } else {
      setError(result.error || 'Kunde inte hämta bokningen')
      setBooking(null)
    }
    setIsLoading(false)
  }, [bookingId])

  useEffect(() => {
    fetchBooking()
  }, [fetchBooking])

  const handleAccept = async () => {
    setIsSubmitting(true)
    setError(null)

    const result = await acceptBooking(bookingId)

    if (result.success) {
      setSuccessMessage('Bokningsförfrågan godkänd!')
      await fetchBooking()
      setTimeout(() => setSuccessMessage(null), 5000)
    } else {
      setError(result.error || 'Kunde inte godkänna bokningen')
    }

    setIsSubmitting(false)
  }

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      setDeclineError('Ange en anledning till nekandet')
      return
    }

    setIsSubmitting(true)
    setDeclineError(null)

    const result = await declineBooking(bookingId, declineReason)

    if (result.success) {
      setShowDeclineModal(false)
      setDeclineReason('')
      setSuccessMessage('Bokningsförfrågan nekad')
      await fetchBooking()
      setTimeout(() => setSuccessMessage(null), 5000)
    } else {
      setDeclineError(result.error || 'Kunde inte neka bokningen')
    }

    setIsSubmitting(false)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('sv-SE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-'
    return timeStr.slice(0, 5) // Extract HH:MM from HH:MM:SS
  }

  if (isLoading) {
    return (
      <div>
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#c45a3b] border-t-transparent"></div>
          <p className="text-[#78716c] mt-2">Laddar bokning...</p>
        </div>
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h2 className="text-lg font-medium text-red-800 mb-2">Fel</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <Link href={`/dashboard/venue/${venueId}/bookings`}>
            <Button variant="outline">Tillbaka till bokningar</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!booking) {
    return null
  }

  const status = STATUS_LABELS[booking.status] || { label: booking.status, color: 'bg-gray-100 text-gray-800 border-gray-200' }
  const eventType = EVENT_TYPE_LABELS[booking.event_type || ''] || booking.event_type || '-'

  // Build timeline events
  const timelineEvents = [
    {
      label: 'Förfrågan skapad',
      date: booking.created_at,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
    },
  ]

  if (booking.responded_at) {
    const respondedLabel = booking.status === 'accepted' ? 'Godkänd' : booking.status === 'declined' ? 'Nekad' : 'Besvarad'
    timelineEvents.push({
      label: respondedLabel,
      date: booking.responded_at,
      icon: booking.status === 'accepted' ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    })
  }

  return (
    <div>
      {/* Back link */}
      <Link
        href={`/dashboard/venue/${venueId}/bookings`}
        className="inline-flex items-center text-[#78716c] hover:text-[#57534e] mb-6"
      >
        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Tillbaka till bokningar
      </Link>

      {/* Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-start gap-2">
          <span className="flex-1">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="flex-shrink-0 p-1 hover:bg-green-100 rounded" aria-label="Stäng">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="flex-shrink-0 p-1 hover:bg-red-100 rounded" aria-label="Stäng">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {modification && currentUserId && booking && (
        <ModificationBanner
          booking={booking}
          modification={modification}
          currentUserId={currentUserId}
          onResolved={fetchBooking}
        />
      )}

      {/* Header with status */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#1a1a1a]">
              Bokning från {booking.customer_name}
            </h1>
            <p className="mt-1">
              <span className="text-[#78716c]">{booking.venue.name} - {formatDate(booking.event_date)}</span>
              <span className="mx-2 text-[#d4bfb6]">·</span>
              {booking.company_name ? (
                <span className="text-[#7b4a6b] font-medium">{booking.company_name}</span>
              ) : (
                <span className="text-[#78716c]">Privatperson</span>
              )}
            </p>
          </div>
          <div className={`inline-flex items-center px-4 py-2 rounded-full border text-sm font-medium ${status.color}`}>
            {status.label}
          </div>
        </div>

        {/* Action buttons for pending/accepted bookings */}
        {['pending', 'accepted'].includes(booking.status) && (booking.status === 'pending' || !modification) && (
          <div className="flex gap-3 mt-6 pt-6 border-t border-[#e7e5e4]">
            {booking.status === 'pending' && (
              <>
                <Button
                  onClick={handleAccept}
                  loading={isSubmitting}
                  className="flex-1 sm:flex-none"
                >
                  Godkänna
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeclineModal(true)}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none"
                >
                  Neka
                </Button>
              </>
            )}
            {['pending', 'accepted'].includes(booking.status) && !modification && (
              <button
                onClick={() => setShowModificationForm(true)}
                className="px-4 py-2 text-sm font-medium text-[#c45a3b] border border-[#c45a3b] rounded-lg hover:bg-[#c45a3b]/5"
              >
                Föreslå ändring
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer info */}
          <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Kundinformation</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-[#78716c]">Namn</dt>
                <dd className="mt-1 text-[#1a1a1a] font-medium">{booking.customer_name}</dd>
              </div>
              <div>
                <dt className="text-sm text-[#78716c]">E-post</dt>
                <dd className="mt-1 text-[#1a1a1a]">
                  <a href={`mailto:${booking.customer_email}`} className="text-[#c45a3b] hover:underline">
                    {booking.customer_email}
                  </a>
                </dd>
              </div>
              {booking.customer_phone && (
                <div>
                  <dt className="text-sm text-[#78716c]">Telefon</dt>
                  <dd className="mt-1 text-[#1a1a1a]">
                    <a href={`tel:${booking.customer_phone}`} className="text-[#c45a3b] hover:underline">
                      {booking.customer_phone}
                    </a>
                  </dd>
                </div>
              )}
              {booking.company_name && (
                <div>
                  <dt className="text-sm text-[#78716c]">Företag</dt>
                  <dd className="mt-1 text-[#1a1a1a]">{booking.company_name}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Event details */}
          <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Eventdetaljer</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-[#78716c]">Datum</dt>
                <dd className="mt-1 text-[#1a1a1a] font-medium">{formatDate(booking.event_date)}</dd>
              </div>
              <div>
                <dt className="text-sm text-[#78716c]">Tid</dt>
                <dd className="mt-1 text-[#1a1a1a]">
                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[#78716c]">Eventtyp</dt>
                <dd className="mt-1 text-[#1a1a1a]">{eventType}</dd>
              </div>
              <div>
                <dt className="text-sm text-[#78716c]">Antal gäster</dt>
                <dd className="mt-1 text-[#1a1a1a]">{booking.guest_count || '-'} personer</dd>
              </div>
              {booking.event_description && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-[#78716c]">Beskrivning</dt>
                  <dd className="mt-1 text-[#1a1a1a] whitespace-pre-wrap">{booking.event_description}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Price breakdown */}
          <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Prisuppdelning</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-[#78716c]">Baspris</dt>
                <dd className="text-[#1a1a1a]">{formatPrice(booking.base_price)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#78716c]">Plattformsavgift (12%)</dt>
                <dd className="text-[#1a1a1a]">{formatPrice(booking.platform_fee)}</dd>
              </div>
              <div className="flex justify-between pt-3 border-t border-[#e7e5e4]">
                <dt className="font-medium text-[#1a1a1a]">Totalt pris (kund)</dt>
                <dd className="font-semibold text-[#1a1a1a]">{formatPrice(booking.total_price)}</dd>
              </div>
              <div className="flex justify-between pt-3 border-t border-[#e7e5e4]">
                <dt className="font-medium text-[#c45a3b]">Din utbetalning</dt>
                <dd className="font-semibold text-[#c45a3b]">{formatPrice(booking.venue_payout)}</dd>
              </div>
            </dl>
          </div>

          {/* Decline reason (if declined) */}
          {booking.status === 'declined' && booking.decline_reason && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-red-800 mb-2">Anledning till nekande</h2>
              <p className="text-red-700">{booking.decline_reason}</p>
            </div>
          )}

          {/* Message thread */}
          {currentUserId && (
            <MessageThread
              threadId={bookingId}
              threadType="booking"
              currentUserId={currentUserId}
              participantName={booking.customer_name}
            />
          )}
        </div>

        {/* Sidebar - right column */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Tidslinje</h2>
            <div className="space-y-4">
              {timelineEvents.map((event, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#f3f4f6] rounded-full flex items-center justify-center text-[#78716c]">
                    {event.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a1a1a]">{event.label}</p>
                    <p className="text-xs text-[#78716c]">{formatDateTime(event.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          {booking.status === 'accepted' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-medium text-green-800">Bokning godkänd</h3>
              </div>
              <p className="text-sm text-green-700">
                Denna bokning är godkänd och datumet är nu blockerat i din kalender.
              </p>
            </div>
          )}
        </div>
      </div>

      {showModificationForm && booking && (
        <ModificationForm
          booking={booking}
          canEditPrice={true}
          onClose={() => setShowModificationForm(false)}
          onSuccess={() => {
            setShowModificationForm(false)
            fetchBooking()
          }}
        />
      )}

      {/* Decline modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#1a1a1a]">Neka bokningsförfrågan</h3>
              <button
                onClick={() => {
                  setShowDeclineModal(false)
                  setDeclineReason('')
                  setDeclineError(null)
                }}
                className="p-1 hover:bg-[#f3f4f6] rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-[#78716c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-[#78716c] mb-4">
              Ange en anledning till varför du nekar denna förfrågan. Detta hjälper kunden att förstå beslutet.
            </p>

            {declineError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {declineError}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#57534e] mb-1">
                Anledning till nekande *
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="T.ex. Datumet är upptaget, Lokalen passar inte för detta event..."
                rows={4}
                className="w-full px-3 py-2 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeclineModal(false)
                  setDeclineReason('')
                  setDeclineError(null)
                }}
                disabled={isSubmitting}
                className="flex-1"
              >
                Avbryt
              </Button>
              <Button
                onClick={handleDecline}
                loading={isSubmitting} disabled={!declineReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Neka förfrågan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
