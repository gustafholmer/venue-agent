'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { getVenueBookings, type VenueBooking, type BookingStatusFilter } from '@/actions/bookings/get-venue-bookings'

const STATUS_TABS: { value: BookingStatusFilter; label: string }[] = [
  { value: 'all', label: 'Alla' },
  { value: 'pending', label: 'Väntande' },
  { value: 'accepted', label: 'Godkända' },
  { value: 'declined', label: 'Nekade' },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Väntande', color: 'bg-yellow-100 text-yellow-800' },
  accepted: { label: 'Godkänd', color: 'bg-green-100 text-green-800' },
  declined: { label: 'Nekad', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Avbokad', color: 'bg-gray-100 text-gray-800' },
  completed: { label: 'Genomförd', color: 'bg-blue-100 text-blue-800' },
  paid_out: { label: 'Utbetald', color: 'bg-purple-100 text-purple-800' },
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

export default function BookingsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialStatus = (searchParams.get('status') as BookingStatusFilter) || 'all'

  const [bookings, setBookings] = useState<VenueBooking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<BookingStatusFilter>(initialStatus)

  useEffect(() => {
    async function fetchBookings() {
      setIsLoading(true)
      const result = await getVenueBookings(activeTab)
      if (result.success && result.bookings) {
        setBookings(result.bookings)
        setError(null)
      } else {
        setError(result.error || 'Kunde inte hämta bokningar')
        setBookings([])
      }
      setIsLoading(false)
    }

    fetchBookings()
  }, [activeTab])

  const handleTabChange = (tab: BookingStatusFilter) => {
    setActiveTab(tab)
    // Update URL without full page reload
    const params = new URLSearchParams()
    if (tab !== 'all') {
      params.set('status', tab)
    }
    const newUrl = params.toString() ? `?${params.toString()}` : '/dashboard/bookings'
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
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#1a1a1a]">Bokningar</h1>
        <p className="text-[#78716c] mt-1">
          Hantera bokningsförfrågningar för din lokal
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
      {!isLoading && !error && bookings.length === 0 && (
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#f3f4f6] rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-[#a8a29e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">
            {activeTab === 'all'
              ? 'Inga bokningar ännu'
              : `Inga ${STATUS_TABS.find(t => t.value === activeTab)?.label.toLowerCase()} bokningar`}
          </h3>
          <p className="text-[#78716c]">
            {activeTab === 'all'
              ? 'När du får bokningsförfrågningar kommer de att visas här.'
              : 'Det finns inga bokningar med denna status just nu.'}
          </p>
        </div>
      )}

      {/* Bookings list */}
      {!isLoading && !error && bookings.length > 0 && (
        <>
          {/* Mobile card layout */}
          <div className="lg:hidden bg-white border border-[#e7e5e4] rounded-xl overflow-hidden divide-y divide-[#e7e5e4]">
            {bookings.map((booking) => {
              const status = STATUS_LABELS[booking.status] || { label: booking.status, color: 'bg-gray-100 text-gray-800' }
              const eventType = EVENT_TYPE_LABELS[booking.event_type || ''] || booking.event_type || '-'

              return (
                <div key={booking.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[#1a1a1a]">{booking.customer_name}</p>
                        {booking.company_name ? (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#7b4a6b]/10 text-[#7b4a6b] rounded-full">Företag</span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#e7e5e4] text-[#78716c] rounded-full">Privat</span>
                        )}
                      </div>
                      {booking.company_name && (
                        <p className="text-sm text-[#78716c]">{booking.company_name}</p>
                      )}
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#78716c]">Eventdatum</span>
                      <span className="text-[#57534e]">{formatDate(booking.event_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#78716c]">Typ</span>
                      <span className="text-[#57534e]">{eventType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#78716c]">Gäster</span>
                      <span className="text-[#57534e]">{booking.guest_count || '-'}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#e7e5e4]">
                    <Link
                      href={`/dashboard/bookings/${booking.id}`}
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
                      Skapad
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#78716c] uppercase tracking-wider">

                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7e5e4]">
                  {bookings.map((booking) => {
                    const status = STATUS_LABELS[booking.status] || { label: booking.status, color: 'bg-gray-100 text-gray-800' }
                    const eventType = EVENT_TYPE_LABELS[booking.event_type || ''] || booking.event_type || '-'

                    return (
                      <tr key={booking.id} className="hover:bg-[#faf9f7] transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-[#1a1a1a]">{booking.customer_name}</p>
                              {booking.company_name ? (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#7b4a6b]/10 text-[#7b4a6b] rounded-full">Företag</span>
                              ) : (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#e7e5e4] text-[#78716c] rounded-full">Privat</span>
                              )}
                            </div>
                            {booking.company_name && (
                              <p className="text-sm text-[#78716c]">{booking.company_name}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[#57534e]">
                          {formatDate(booking.event_date)}
                        </td>
                        <td className="px-6 py-4 text-[#57534e]">
                          {eventType}
                        </td>
                        <td className="px-6 py-4 text-[#57534e]">
                          {booking.guest_count || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#78716c]">
                          {formatDateTime(booking.created_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/dashboard/bookings/${booking.id}`}
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
