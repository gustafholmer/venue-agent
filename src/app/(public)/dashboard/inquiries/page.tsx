'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { getVenueInquiries, type VenueInquiryWithProfile, type InquiryStatusFilter } from '@/actions/inquiries/get-inquiries'

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

export default function InquiriesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialStatus = (searchParams.get('status') as InquiryStatusFilter) || 'all'

  const [inquiries, setInquiries] = useState<VenueInquiryWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<InquiryStatusFilter>(initialStatus)

  useEffect(() => {
    async function fetchInquiries() {
      setIsLoading(true)
      const result = await getVenueInquiries(activeTab)
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
    // Update URL without full page reload
    const params = new URLSearchParams()
    if (tab !== 'all') {
      params.set('status', tab)
    }
    const newUrl = params.toString() ? `?${params.toString()}` : '/dashboard/inquiries'
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

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#1a1a1a]">Förfrågningar</h1>
        <p className="text-[#78716c] mt-1">
          Hantera inkommande förfrågningar för dina lokaler
        </p>
      </div>

      {/* Filter tabs */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl mb-6">
        <div className="flex overflow-x-auto border-b border-[#e7e5e4]">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
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
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-2">
          <span className="flex-1"><p className="text-red-700">{error}</p></span>
          <button onClick={() => setError(null)} className="flex-shrink-0 p-1 hover:bg-red-100 rounded" aria-label="Stäng"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <>
          {/* Mobile skeleton */}
          <div className="lg:hidden bg-white border border-[#e7e5e4] rounded-xl overflow-hidden divide-y divide-[#e7e5e4]">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="flex justify-between mb-3">
                  <div className="h-5 bg-[#e7e5e4] rounded w-32" />
                  <div className="h-6 bg-[#e7e5e4] rounded-full w-20" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-[#e7e5e4] rounded w-full" />
                  <div className="h-4 bg-[#e7e5e4] rounded w-3/4" />
                  <div className="h-4 bg-[#e7e5e4] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
          {/* Desktop skeleton */}
          <div className="hidden lg:block bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
            <div className="animate-pulse">
              <div className="bg-[#faf9f7] border-b border-[#e7e5e4] px-6 py-3 flex gap-6">
                <div className="h-4 bg-[#e7e5e4] rounded w-20" />
                <div className="h-4 bg-[#e7e5e4] rounded w-24" />
                <div className="h-4 bg-[#e7e5e4] rounded w-16" />
                <div className="h-4 bg-[#e7e5e4] rounded w-16" />
                <div className="h-4 bg-[#e7e5e4] rounded w-20" />
                <div className="h-4 bg-[#e7e5e4] rounded w-24" />
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-6 py-4 border-b border-[#e7e5e4] flex gap-6 items-center">
                  <div className="flex-1">
                    <div className="h-5 bg-[#e7e5e4] rounded w-32 mb-1" />
                    <div className="h-4 bg-[#e7e5e4] rounded w-24" />
                  </div>
                  <div className="h-5 bg-[#e7e5e4] rounded w-24" />
                  <div className="h-5 bg-[#e7e5e4] rounded w-16" />
                  <div className="h-5 bg-[#e7e5e4] rounded w-12" />
                  <div className="h-6 bg-[#e7e5e4] rounded-full w-20" />
                  <div className="h-5 bg-[#e7e5e4] rounded w-28" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!isLoading && !error && inquiries.length === 0 && (
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#f3f4f6] rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-[#a8a29e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">
            {activeTab === 'all'
              ? 'Inga förfrågningar ännu'
              : `Inga ${STATUS_TABS.find(t => t.value === activeTab)?.label.toLowerCase()} förfrågningar`}
          </h3>
          <p className="text-[#78716c]">
            {activeTab === 'all'
              ? 'När du får förfrågningar kommer de att visas här.'
              : 'Det finns inga förfrågningar med denna status just nu.'}
          </p>
        </div>
      )}

      {/* Inquiries list */}
      {!isLoading && !error && inquiries.length > 0 && (
        <>
          {/* Mobile card layout */}
          <div className="lg:hidden bg-white border border-[#e7e5e4] rounded-xl overflow-hidden divide-y divide-[#e7e5e4]">
            {inquiries.map((inquiry) => {
              const status = STATUS_LABELS[inquiry.status] || { label: inquiry.status, color: 'bg-gray-100 text-gray-800' }
              const eventType = EVENT_TYPE_LABELS[inquiry.event_type || ''] || inquiry.event_type || '-'
              const customerName = inquiry.profile?.full_name || inquiry.profile?.email || 'Okänd'
              const venueName = (inquiry.venue as { name: string })?.name

              return (
                <div key={inquiry.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-[#1a1a1a]">{customerName}</p>
                      {venueName && <p className="text-sm text-[#78716c]">{venueName}</p>}
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#78716c]">Eventdatum</span>
                      <span className="text-[#57534e]">{formatDate(inquiry.event_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#78716c]">Typ</span>
                      <span className="text-[#57534e]">{eventType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#78716c]">Gäster</span>
                      <span className="text-[#57534e]">{inquiry.guest_count || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#78716c]">Mottagen</span>
                      <span className="text-[#57534e]">{formatDateTime(inquiry.created_at)}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#e7e5e4]">
                    <Link
                      href={`/dashboard/inquiries/${inquiry.id}`}
                      className="text-[#c45a3b] hover:text-[#1e40af] font-medium text-sm"
                    >
                      Visa detaljer
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop table layout */}
          <div className="hidden lg:block bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#faf9f7] border-b border-[#e7e5e4]">
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#78716c] uppercase tracking-wider">
                      Kund
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#78716c] uppercase tracking-wider">
                      Lokal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#78716c] uppercase tracking-wider">
                      Eventdatum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#78716c] uppercase tracking-wider">
                      Typ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#78716c] uppercase tracking-wider">
                      Gäster
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#78716c] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#78716c] uppercase tracking-wider">
                      Mottagen
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#78716c] uppercase tracking-wider">

                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7e5e4]">
                  {inquiries.map((inquiry) => {
                    const status = STATUS_LABELS[inquiry.status] || { label: inquiry.status, color: 'bg-gray-100 text-gray-800' }
                    const eventType = EVENT_TYPE_LABELS[inquiry.event_type || ''] || inquiry.event_type || '-'
                    const customerName = inquiry.profile?.full_name || inquiry.profile?.email || 'Okänd'
                    const venueName = (inquiry.venue as { name: string })?.name

                    return (
                      <tr key={inquiry.id} className="hover:bg-[#faf9f7] transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-[#1a1a1a]">{customerName}</p>
                            <p className="text-sm text-[#78716c]">{inquiry.profile?.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[#57534e]">
                          {venueName || '-'}
                        </td>
                        <td className="px-6 py-4 text-[#57534e]">
                          {formatDate(inquiry.event_date)}
                        </td>
                        <td className="px-6 py-4 text-[#57534e]">
                          {eventType}
                        </td>
                        <td className="px-6 py-4 text-[#57534e]">
                          {inquiry.guest_count || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#78716c]">
                          {formatDateTime(inquiry.created_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/dashboard/inquiries/${inquiry.id}`}
                            className="text-[#c45a3b] hover:text-[#1e40af] font-medium text-sm"
                          >
                            Visa detaljer
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
