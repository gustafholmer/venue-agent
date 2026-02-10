'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getBooking, type BookingWithVenue } from '@/actions/bookings/get-booking'
import { cancelBooking } from '@/actions/bookings/cancel-booking'
import { formatPrice } from '@/lib/pricing'
import { MessageThread } from '@/components/booking/message-thread'
import { createClient } from '@/lib/supabase/client'

const STATUS_LABELS: Record<string, { label: string; color: string; description: string }> = {
  pending: {
    label: 'Väntande',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    description: 'Din bokningsförfrågan väntar på svar från lokalen.',
  },
  accepted: {
    label: 'Godkänd',
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Din bokning är godkänd! Du kan nu förbereda ditt event.',
  },
  declined: {
    label: 'Nekad',
    color: 'bg-red-100 text-red-800 border-red-200',
    description: 'Tyvärr kunde lokalen inte ta emot din bokning.',
  },
  cancelled: {
    label: 'Avbokad',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    description: 'Denna bokning har avbokats.',
  },
  completed: {
    label: 'Genomförd',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Ditt event har genomförts. Tack för att du använde Tryffle!',
  },
  paid_out: {
    label: 'Genomförd',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Ditt event har genomförts. Tack för att du använde Tryffle!',
  },
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

export default function CustomerBookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string

  const [booking, setBooking] = useState<BookingWithVenue | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState<string | null>(null)

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
    } else {
      setError(result.error || 'Kunde inte hämta bokningen')
      setBooking(null)
    }
    setIsLoading(false)
  }, [bookingId])

  useEffect(() => {
    fetchBooking()
  }, [fetchBooking])

  const handleCancel = async () => {
    setIsSubmitting(true)
    setCancelError(null)

    const result = await cancelBooking(bookingId, cancelReason || undefined)

    if (result.success) {
      setShowCancelModal(false)
      setCancelReason('')
      setSuccessMessage('Bokningen har avbokats')
      await fetchBooking()
      setTimeout(() => setSuccessMessage(null), 5000)
    } else {
      setCancelError(result.error || 'Kunde inte avboka bokningen')
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
    return timeStr.slice(0, 5)
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#c45a3b] border-t-transparent"></div>
          <p className="text-[#78716c] mt-2">Laddar bokning...</p>
        </div>
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h2 className="text-lg font-medium text-red-800 mb-2">Fel</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <Link href="/account/bookings">
            <Button variant="outline">Tillbaka till mina bokningar</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!booking) {
    return null
  }

  const status = STATUS_LABELS[booking.status] || {
    label: booking.status,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    description: '',
  }
  const eventType = EVENT_TYPE_LABELS[booking.event_type || ''] || booking.event_type || '-'

  // Can cancel if pending or accepted
  const canCancel = ['pending', 'accepted'].includes(booking.status)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/account/bookings"
        className="inline-flex items-center text-[#78716c] hover:text-[#57534e] mb-6"
      >
        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Tillbaka till mina bokningar
      </Link>

      {/* Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-start gap-2">
          <span className="flex-1">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="flex-shrink-0 p-1 hover:bg-green-100 rounded" aria-label="Stäng"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="flex-shrink-0 p-1 hover:bg-red-100 rounded" aria-label="Stäng"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      )}

      {/* Venue card with status */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden mb-6">
        <div className="flex flex-col sm:flex-row">
          {/* Venue image */}
          <div className="sm:w-64 h-48 sm:h-auto flex-shrink-0 bg-[#f3f4f6]">
            {booking.venue.primary_photo?.url ? (
              <img
                src={booking.venue.primary_photo.url}
                alt={booking.venue.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-16 h-16 text-[#d1d5db]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            )}
          </div>

          {/* Venue info and status */}
          <div className="flex-1 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#1a1a1a]">
                  {booking.venue.name}
                </h1>
                <p className="text-[#78716c] mt-1">
                  {booking.venue.area ? `${booking.venue.area}, ${booking.venue.city}` : booking.venue.city}
                </p>
                <Link
                  href={`/venues/${booking.venue.slug || booking.venue_id}`}
                  className="text-[#c45a3b] hover:underline text-sm mt-2 inline-block"
                >
                  Visa lokal
                </Link>
              </div>
              <div className={`flex-shrink-0 px-4 py-2 rounded-full border text-sm font-medium ${status.color}`}>
                {status.label}
              </div>
            </div>

            {/* Status description */}
            <div className="mt-4 p-3 bg-[#faf9f7] rounded-lg">
              <p className="text-sm text-[#78716c]">{status.description}</p>
            </div>

            {/* Cancel button */}
            {canCancel && (
              <div className="mt-4 pt-4 border-t border-[#e7e5e4]">
                <Button
                  variant="outline"
                  onClick={() => setShowCancelModal(true)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Avboka
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - left column */}
        <div className="lg:col-span-2 space-y-6">
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
                <dt className="text-[#78716c]">Lokalhyra</dt>
                <dd className="text-[#1a1a1a]">{formatPrice(booking.base_price)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#78716c]">Serviceavgift</dt>
                <dd className="text-[#1a1a1a]">{formatPrice(booking.platform_fee)}</dd>
              </div>
              <div className="flex justify-between pt-3 border-t border-[#e7e5e4]">
                <dt className="font-medium text-[#1a1a1a]">Totalt</dt>
                <dd className="font-semibold text-[#c45a3b] text-lg">{formatPrice(booking.total_price)}</dd>
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

          {/* Cancellation reason (if cancelled) */}
          {booking.status === 'cancelled' && booking.decline_reason && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Anledning till avbokning</h2>
              <p className="text-gray-700">{booking.decline_reason}</p>
            </div>
          )}

          {/* Message thread */}
          {currentUserId && (
            <MessageThread
              bookingId={bookingId}
              currentUserId={currentUserId}
              participantName={booking.venue.name}
            />
          )}
        </div>

        {/* Sidebar - right column */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Tidslinje</h2>
            <div className="space-y-4">
              {/* Booking created */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-[#f3f4f6] rounded-full flex items-center justify-center text-[#78716c]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1a1a]">Förfrågan skickad</p>
                  <p className="text-xs text-[#78716c]">{formatDateTime(booking.created_at)}</p>
                </div>
              </div>

              {/* Response (if any) */}
              {booking.responded_at && (
                <div className="flex gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    booking.status === 'accepted' ? 'bg-green-100 text-green-600' :
                    booking.status === 'declined' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {booking.status === 'accepted' ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a1a1a]">
                      {booking.status === 'accepted' ? 'Godkänd' :
                       booking.status === 'declined' ? 'Nekad' :
                       booking.status === 'cancelled' ? 'Avbokad' : 'Besvarad'}
                    </p>
                    <p className="text-xs text-[#78716c]">{formatDateTime(booking.responded_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact info (if accepted) */}
          {booking.status === 'accepted' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-medium text-green-800">Bokning bekräftad</h3>
              </div>
              <p className="text-sm text-green-700">
                Din bokning är bekräftad! Du kan använda meddelandefunktionen nedan för att kommunicera med lokalägaren.
              </p>
            </div>
          )}

          {/* Your booking info */}
          <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Din bokningsinformation</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-[#78716c]">Namn</dt>
                <dd className="mt-1 text-[#1a1a1a]">{booking.customer_name}</dd>
              </div>
              <div>
                <dt className="text-sm text-[#78716c]">E-post</dt>
                <dd className="mt-1 text-[#1a1a1a]">{booking.customer_email}</dd>
              </div>
              {booking.customer_phone && (
                <div>
                  <dt className="text-sm text-[#78716c]">Telefon</dt>
                  <dd className="mt-1 text-[#1a1a1a]">{booking.customer_phone}</dd>
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
        </div>
      </div>

      {/* Cancel modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#1a1a1a]">Avboka bokning</h3>
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setCancelReason('')
                  setCancelError(null)
                }}
                className="p-1 hover:bg-[#f3f4f6] rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-[#78716c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-[#78716c] mb-4">
              Är du säker på att du vill avboka denna bokning? Denna åtgärd kan inte ångras.
            </p>

            {cancelError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {cancelError}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#57534e] mb-1">
                Anledning till avbokning (valfritt)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="T.ex. Ändrade planer, behöver boka om..."
                rows={3}
                className="w-full px-3 py-2 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancelModal(false)
                  setCancelReason('')
                  setCancelError(null)
                }}
                loading={isSubmitting}
                className="flex-1"
              >
                Behåll bokning
              </Button>
              <Button
                onClick={handleCancel}
                loading={isSubmitting}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Avboka
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
