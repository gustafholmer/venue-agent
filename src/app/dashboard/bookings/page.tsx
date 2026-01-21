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
        <h1 className="text-2xl font-semibold text-[#111827]">Bokningar</h1>
        <p className="text-[#6b7280] mt-1">
          Hantera bokningsförfrågningar för din lokal
        </p>
      </div>

      {/* Filter tabs */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl mb-6">
        <div className="flex border-b border-[#e5e7eb]">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'text-[#1e3a8a] border-b-2 border-[#1e3a8a] -mb-[1px]'
                  : 'text-[#6b7280] hover:text-[#374151]'
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
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1e3a8a] border-t-transparent"></div>
          <p className="text-[#6b7280] mt-2">Laddar bokningar...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && bookings.length === 0 && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#f3f4f6] rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-[#111827] mb-2">
            {activeTab === 'all'
              ? 'Inga bokningar ännu'
              : `Inga ${STATUS_TABS.find(t => t.value === activeTab)?.label.toLowerCase()} bokningar`}
          </h3>
          <p className="text-[#6b7280]">
            {activeTab === 'all'
              ? 'När du får bokningsförfrågningar kommer de att visas här.'
              : 'Det finns inga bokningar med denna status just nu.'}
          </p>
        </div>
      )}

      {/* Bookings list */}
      {!isLoading && !error && bookings.length > 0 && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                    Kund
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                    Eventdatum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                    Typ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                    Gäster
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                    Skapad
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#6b7280] uppercase tracking-wider">

                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {bookings.map((booking) => {
                  const status = STATUS_LABELS[booking.status] || { label: booking.status, color: 'bg-gray-100 text-gray-800' }
                  const eventType = EVENT_TYPE_LABELS[booking.event_type || ''] || booking.event_type || '-'

                  return (
                    <tr key={booking.id} className="hover:bg-[#f9fafb] transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-[#111827]">{booking.customer_name}</p>
                          {booking.company_name && (
                            <p className="text-sm text-[#6b7280]">{booking.company_name}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#374151]">
                        {formatDate(booking.event_date)}
                      </td>
                      <td className="px-6 py-4 text-[#374151]">
                        {eventType}
                      </td>
                      <td className="px-6 py-4 text-[#374151]">
                        {booking.guest_count || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6b7280]">
                        {formatDateTime(booking.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/bookings/${booking.id}`}
                          className="text-[#1e3a8a] hover:text-[#1e40af] font-medium text-sm"
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
      )}
    </div>
  )
}
