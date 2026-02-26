'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getInquiry, type InquiryDetail } from '@/actions/inquiries/get-inquiry'
import { MessageThread } from '@/components/booking/message-thread'
import { createClient } from '@/lib/supabase/client'

const STATUS_LABELS: Record<string, { label: string; color: string; description: string }> = {
  open: {
    label: 'Öppen',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    description: 'Din förfrågan är öppen och väntar på svar från lokalen.',
  },
  closed: {
    label: 'Stängd',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    description: 'Denna förfrågan är stängd av lokalägaren.',
  },
  converted: {
    label: 'Konverterad',
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Denna förfrågan har konverterats till en bokning.',
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

export default function CustomerInquiryDetailPage() {
  const params = useParams()
  const inquiryId = params.id as string

  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

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
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#c45a3b] border-t-transparent"></div>
          <p className="text-[#78716c] mt-2">Laddar förfrågan...</p>
        </div>
      </div>
    )
  }

  if (error && !inquiry) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h2 className="text-lg font-medium text-red-800 mb-2">Fel</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <Link href="/account/inquiries">
            <Button variant="outline">Tillbaka till mina förfrågningar</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!inquiry) {
    return null
  }

  const status = STATUS_LABELS[inquiry.status] || {
    label: inquiry.status,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    description: '',
  }
  const eventType = EVENT_TYPE_LABELS[inquiry.event_type] || inquiry.event_type

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/account/inquiries"
        className="inline-flex items-center text-[#78716c] hover:text-[#57534e] mb-6"
      >
        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Tillbaka till mina förfrågningar
      </Link>

      {/* Venue card with status */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden mb-6">
        <div className="flex flex-col sm:flex-row">
          {/* Venue image */}
          <div className="sm:w-64 h-48 sm:h-auto flex-shrink-0 bg-[#f3f4f6]">
            {inquiry.venue.primary_photo?.url ? (
              <img
                src={inquiry.venue.primary_photo.url}
                alt={inquiry.venue.name}
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
                  {inquiry.venue.name}
                </h1>
                <p className="text-[#78716c] mt-1">
                  {inquiry.venue.area ? `${inquiry.venue.area}, ${inquiry.venue.city}` : inquiry.venue.city}
                </p>
                <Link
                  href={`/venues/${inquiry.venue.slug || inquiry.venue_id}`}
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

            {/* Actions based on status */}
            {inquiry.status === 'open' && (
              <div className="mt-4 pt-4 border-t border-[#e7e5e4]">
                <Link href={`/book/${inquiry.venue.slug || inquiry.venue_id}?inquiry=${inquiry.id}`}>
                  <Button>
                    Skicka bokningsförfrågan
                  </Button>
                </Link>
              </div>
            )}

            {inquiry.status === 'converted' && inquiry.booking_request_id && (
              <div className="mt-4 pt-4 border-t border-[#e7e5e4]">
                <Link href={`/account/bookings/${inquiry.booking_request_id}`}>
                  <Button variant="outline">
                    Visa bokning
                  </Button>
                </Link>
              </div>
            )}

            {inquiry.status === 'closed' && (
              <div className="mt-4 pt-4 border-t border-[#e7e5e4]">
                <div className="flex items-center gap-2 text-sm text-[#78716c]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Denna förfrågan är stängd av lokalägaren
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="space-y-6">
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
              <dd className="mt-1 text-[#1a1a1a]">{inquiry.guest_count} personer</dd>
            </div>
            <div>
              <dt className="text-sm text-[#78716c]">Skickad</dt>
              <dd className="mt-1 text-[#1a1a1a]">{formatDateTime(inquiry.created_at)}</dd>
            </div>
          </dl>
        </div>

        {/* Initial inquiry message */}
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Ditt meddelande</h2>
          <p className="text-[#1a1a1a] whitespace-pre-wrap">{inquiry.message}</p>
        </div>

        {/* Message thread */}
        {currentUserId && (
          <MessageThread
            threadId={inquiryId}
            threadType="inquiry"
            currentUserId={currentUserId}
            participantName={inquiry.venue.name}
            readOnly={inquiry.status !== 'open'}
          />
        )}
      </div>
    </div>
  )
}
