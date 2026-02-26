'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getInquiry, type InquiryDetail } from '@/actions/inquiries/get-inquiry'
import { closeInquiry } from '@/actions/inquiries/close-inquiry'
import { sendMessage } from '@/actions/messages/send-message'
import { MessageThread } from '@/components/booking/message-thread'
import { createClient } from '@/lib/supabase/client'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: 'Öppen', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  closed: { label: 'Stängd', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  converted: { label: 'Konverterad', color: 'bg-green-100 text-green-800 border-green-200' },
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

export default function InquiryDetailPage() {
  const params = useParams()
  const inquiryId = params.id as string

  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Close confirmation modal state
  const [showCloseModal, setShowCloseModal] = useState(false)

  // Fetch current user
  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    fetchUser()
  }, [])

  const fetchInquiry = useCallback(async () => {
    setIsLoading(true)
    const result = await getInquiry(inquiryId)
    if (result.success && result.inquiry) {
      setInquiry(result.inquiry)
      setError(null)
    } else {
      setError(result.error || 'Kunde inte hämta förfrågan')
      setInquiry(null)
    }
    setIsLoading(false)
  }, [inquiryId])

  useEffect(() => {
    fetchInquiry()
  }, [fetchInquiry])

  const handleInviteToBook = async () => {
    if (!inquiry?.venue.slug) return

    setIsSubmitting(true)
    setError(null)

    const bookingUrl = `${window.location.origin}/book/${inquiry.venue.slug}?inquiry=${inquiryId}`
    const messageText = `Vi vill gärna ta emot er bokning! Klicka här för att boka: ${bookingUrl}`

    const result = await sendMessage(inquiryId, messageText, 'inquiry')

    if (result.success) {
      setSuccessMessage('Bokningsinbjudan skickad!')
      setTimeout(() => setSuccessMessage(null), 5000)
    } else {
      setError(result.error || 'Kunde inte skicka bokningsinbjudan')
    }

    setIsSubmitting(false)
  }

  const handleClose = async () => {
    setIsSubmitting(true)
    setError(null)

    const result = await closeInquiry(inquiryId)

    if (result.success) {
      setShowCloseModal(false)
      setSuccessMessage('Förfrågan stängd')
      await fetchInquiry()
      setTimeout(() => setSuccessMessage(null), 5000)
    } else {
      setError(result.error || 'Kunde inte stänga förfrågan')
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

  if (isLoading) {
    return (
      <div>
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#c45a3b] border-t-transparent"></div>
          <p className="text-[#78716c] mt-2">Laddar förfrågan...</p>
        </div>
      </div>
    )
  }

  if (error && !inquiry) {
    return (
      <div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h2 className="text-lg font-medium text-red-800 mb-2">Fel</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <Link href="/dashboard/inquiries">
            <Button variant="outline">Tillbaka till förfrågningar</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!inquiry) {
    return null
  }

  const status = STATUS_LABELS[inquiry.status] || { label: inquiry.status, color: 'bg-gray-100 text-gray-800 border-gray-200' }
  const eventType = EVENT_TYPE_LABELS[inquiry.event_type || ''] || inquiry.event_type || '-'
  const customerName = inquiry.profile?.full_name || inquiry.profile?.email || 'Okänd'

  // Build timeline events
  const timelineEvents = [
    {
      label: 'Förfrågan mottagen',
      date: inquiry.created_at,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
    },
  ]

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/inquiries"
        className="inline-flex items-center text-[#78716c] hover:text-[#57534e] mb-6"
      >
        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Tillbaka till förfrågningar
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

      {/* Header with status */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#1a1a1a]">
              Förfrågan från {customerName}
            </h1>
            <p className="mt-1">
              <span className="text-[#78716c]">{inquiry.venue.name} - {formatDate(inquiry.event_date)}</span>
            </p>
          </div>
          <div className={`inline-flex items-center px-4 py-2 rounded-full border text-sm font-medium ${status.color}`}>
            {status.label}
          </div>
        </div>
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
                <dd className="mt-1 text-[#1a1a1a] font-medium">{customerName}</dd>
              </div>
              <div>
                <dt className="text-sm text-[#78716c]">E-post</dt>
                <dd className="mt-1 text-[#1a1a1a]">
                  <a href={`mailto:${inquiry.profile?.email}`} className="text-[#c45a3b] hover:underline">
                    {inquiry.profile?.email}
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          {/* Event details */}
          <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Eventdetaljer</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-[#78716c]">Datum</dt>
                <dd className="mt-1 text-[#1a1a1a] font-medium">{formatDate(inquiry.event_date)}</dd>
              </div>
              <div>
                <dt className="text-sm text-[#78716c]">Eventtyp</dt>
                <dd className="mt-1 text-[#1a1a1a]">{eventType}</dd>
              </div>
              <div>
                <dt className="text-sm text-[#78716c]">Antal gäster</dt>
                <dd className="mt-1 text-[#1a1a1a]">{inquiry.guest_count || '-'} personer</dd>
              </div>
            </dl>
          </div>

          {/* Initial inquiry message */}
          <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Meddelande från kund</h2>
            <p className="text-[#57534e] whitespace-pre-wrap">{inquiry.message}</p>
          </div>

          {/* Message thread */}
          {currentUserId && (
            <MessageThread
              threadId={inquiryId}
              threadType="inquiry"
              currentUserId={currentUserId}
              participantName={customerName}
              readOnly={inquiry.status !== 'open'}
            />
          )}
        </div>

        {/* Sidebar - right column */}
        <div className="space-y-6">
          {/* Status info */}
          <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Status</h2>
            <div className={`inline-flex items-center px-3 py-1.5 rounded-full border text-sm font-medium ${status.color}`}>
              {status.label}
            </div>
          </div>

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

          {/* Actions based on status */}
          {inquiry.status === 'open' && (
            <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 space-y-3">
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Åtgärder</h2>
              <Button
                onClick={handleInviteToBook}
                loading={isSubmitting}
                className="w-full"
              >
                Bjud in att boka
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCloseModal(true)}
                disabled={isSubmitting}
                className="w-full"
              >
                Stäng förfrågan
              </Button>
            </div>
          )}

          {inquiry.status === 'converted' && inquiry.booking_request_id && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-medium text-green-800">Konverterad till bokning</h3>
              </div>
              <p className="text-sm text-green-700 mb-3">
                Denna förfrågan har konverterats till en bokningsförfrågan.
              </p>
              <Link href={`/dashboard/venue/${inquiry.venue_id}/bookings/${inquiry.booking_request_id}`}>
                <Button variant="outline" className="w-full">
                  Visa bokning
                </Button>
              </Link>
            </div>
          )}

          {inquiry.status === 'closed' && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-800">Stängd</h3>
              </div>
              <p className="text-sm text-gray-700">
                Denna förfrågan är stängd.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Close confirmation modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#1a1a1a]">Stäng förfrågan</h3>
              <button
                onClick={() => setShowCloseModal(false)}
                className="p-1 hover:bg-[#f3f4f6] rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-[#78716c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-[#78716c] mb-6">
              Är du säker på att du vill stänga denna förfrågan? Kunden kommer att meddelas och inga fler meddelanden kan skickas.
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCloseModal(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Avbryt
              </Button>
              <Button
                onClick={handleClose}
                loading={isSubmitting}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Stäng förfrågan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
