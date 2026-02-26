'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { getCustomerInquiries, type CustomerInquiry, type InquiryStatusFilter } from '@/actions/inquiries/get-inquiries'

const STATUS_TABS: { value: InquiryStatusFilter; label: string }[] = [
  { value: 'all', label: 'Alla' },
  { value: 'open', label: 'Öppna' },
  { value: 'closed', label: 'Stängda' },
  { value: 'converted', label: 'Konverterade' },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: 'Öppen', color: 'bg-indigo-100 text-indigo-800' },
  closed: { label: 'Stängd', color: 'bg-gray-100 text-gray-800' },
  converted: { label: 'Konverterad', color: 'bg-green-100 text-green-800' },
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

export default function CustomerInquiriesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialStatus = (searchParams.get('status') as InquiryStatusFilter) || 'all'

  const [inquiries, setInquiries] = useState<CustomerInquiry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<InquiryStatusFilter>(initialStatus)

  useEffect(() => {
    async function fetchInquiries() {
      setIsLoading(true)
      const result = await getCustomerInquiries(activeTab)
      if (result.success && result.inquiries) {
        setInquiries(result.inquiries)
        setError(null)
      } else {
        setError(result.error || 'Kunde inte hämta förfrågningar')
        setInquiries([])
      }
      setIsLoading(false)
    }

    fetchInquiries()
  }, [activeTab])

  const handleTabChange = (tab: InquiryStatusFilter) => {
    setActiveTab(tab)
    const params = new URLSearchParams()
    if (tab !== 'all') {
      params.set('status', tab)
    }
    const newUrl = params.toString() ? `?${params.toString()}` : '/account/inquiries'
    router.push(newUrl)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#1a1a1a]">Mina förfrågningar</h1>
        <p className="text-[#78716c] mt-1">
          Se och hantera dina förfrågningar till lokaler
        </p>
      </div>

      {/* Filter tabs */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl mb-6">
        <div className="flex overflow-x-auto border-b border-[#e7e5e4]">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`flex-shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'text-[#c45a3b] border-b-2 border-[#c45a3b] -mb-[1px]'
                  : 'text-[#78716c] hover:text-[#57534e]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                {/* Image skeleton */}
                <div className="sm:w-48 h-32 sm:h-auto flex-shrink-0 bg-[#f3f4f6]" />
                {/* Content skeleton */}
                <div className="flex-1 p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="h-6 bg-[#e7e5e4] rounded w-48 mb-2" />
                      <div className="h-4 bg-[#e7e5e4] rounded w-32" />
                    </div>
                    <div className="h-6 bg-[#e7e5e4] rounded-full w-20" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j}>
                        <div className="h-3 bg-[#e7e5e4] rounded w-12 mb-1" />
                        <div className="h-5 bg-[#e7e5e4] rounded w-20" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && inquiries.length === 0 && (
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#f3f4f6] rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-[#a8a29e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">
            {activeTab === 'all'
              ? 'Du har inga förfrågningar ännu'
              : `Inga ${STATUS_TABS.find(t => t.value === activeTab)?.label.toLowerCase()} förfrågningar`}
          </h3>
          <p className="text-[#78716c] mb-4">
            {activeTab === 'all'
              ? 'Du har inte skickat några förfrågningar ännu. Börja med att söka efter en lokal!'
              : 'Det finns inga förfrågningar med denna status just nu.'}
          </p>
          {activeTab === 'all' && (
            <Link
              href="/venues"
              className="inline-flex items-center justify-center px-4 py-2 bg-[#c45a3b] text-white rounded-lg hover:bg-[#b3512f] transition-colors"
            >
              Sök lokal
            </Link>
          )}
        </div>
      )}

      {/* Inquiries list */}
      {!isLoading && !error && inquiries.length > 0 && (
        <div className="space-y-4">
          {inquiries.map((inquiry) => {
            const status = STATUS_LABELS[inquiry.status] || { label: inquiry.status, color: 'bg-gray-100 text-gray-800' }
            const eventType = EVENT_TYPE_LABELS[inquiry.event_type] || inquiry.event_type

            return (
              <Link
                key={inquiry.id}
                href={`/account/inquiries/${inquiry.id}`}
                className="block bg-white border border-[#e7e5e4] rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Venue image */}
                  <div className="sm:w-48 h-32 sm:h-auto flex-shrink-0 bg-[#f3f4f6]">
                    {inquiry.venue.primary_photo?.url ? (
                      <img
                        src={inquiry.venue.primary_photo.url}
                        alt={inquiry.venue.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-[#d1d5db]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Inquiry info */}
                  <div className="flex-1 p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg text-[#1a1a1a]">
                          {inquiry.venue.name}
                        </h3>
                        <p className="text-sm text-[#78716c] mt-1">
                          {inquiry.venue.area ? `${inquiry.venue.area}, ${inquiry.venue.city}` : inquiry.venue.city}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 px-3 py-1 text-sm font-medium rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <dt className="text-xs text-[#78716c] uppercase tracking-wider">Datum</dt>
                        <dd className="mt-1 text-sm font-medium text-[#1a1a1a]">
                          {formatDate(inquiry.event_date)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-[#78716c] uppercase tracking-wider">Gäster</dt>
                        <dd className="mt-1 text-sm font-medium text-[#1a1a1a]">
                          {inquiry.guest_count} personer
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-[#78716c] uppercase tracking-wider">Eventtyp</dt>
                        <dd className="mt-1 text-sm font-medium text-[#1a1a1a]">
                          {eventType}
                        </dd>
                      </div>
                      <div className="hidden sm:block">
                        <dt className="text-xs text-[#78716c] uppercase tracking-wider">Skickad</dt>
                        <dd className="mt-1 text-sm font-medium text-[#1a1a1a]">
                          {formatDate(inquiry.created_at)}
                        </dd>
                      </div>
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <div className="hidden sm:flex items-center px-4">
                    <svg className="w-5 h-5 text-[#a8a29e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
