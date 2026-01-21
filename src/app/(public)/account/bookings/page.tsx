'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { getCustomerBookings, type CustomerBooking, type CustomerBookingStatusFilter } from '@/actions/bookings/get-customer-bookings'
import { formatPrice } from '@/lib/pricing'

const STATUS_TABS: { value: CustomerBookingStatusFilter; label: string }[] = [
  { value: 'all', label: 'Alla' },
  { value: 'pending', label: 'Väntande' },
  { value: 'accepted', label: 'Godkända' },
  { value: 'completed', label: 'Genomförda' },
  { value: 'declined', label: 'Nekade' },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Väntande', color: 'bg-yellow-100 text-yellow-800' },
  accepted: { label: 'Godkänd', color: 'bg-green-100 text-green-800' },
  declined: { label: 'Nekad', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Avbokad', color: 'bg-gray-100 text-gray-800' },
  completed: { label: 'Genomförd', color: 'bg-blue-100 text-blue-800' },
  paid_out: { label: 'Genomförd', color: 'bg-blue-100 text-blue-800' },
}

export default function CustomerBookingsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialStatus = (searchParams.get('status') as CustomerBookingStatusFilter) || 'all'

  const [bookings, setBookings] = useState<CustomerBooking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<CustomerBookingStatusFilter>(initialStatus)

  useEffect(() => {
    async function fetchBookings() {
      setIsLoading(true)
      const result = await getCustomerBookings(activeTab)
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

  const handleTabChange = (tab: CustomerBookingStatusFilter) => {
    setActiveTab(tab)
    const params = new URLSearchParams()
    if (tab !== 'all') {
      params.set('status', tab)
    }
    const newUrl = params.toString() ? `?${params.toString()}` : '/account/bookings'
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
        <h1 className="text-2xl font-semibold text-[#111827]">Mina bokningar</h1>
        <p className="text-[#6b7280] mt-1">
          Se och hantera dina bokningsförfrågningar
        </p>
      </div>

      {/* Filter tabs */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl mb-6">
        <div className="flex overflow-x-auto border-b border-[#e5e7eb]">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`flex-shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
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
          <p className="text-[#6b7280] mb-4">
            {activeTab === 'all'
              ? 'Du har inte gjort några bokningar ännu. Börja med att söka efter en lokal!'
              : 'Det finns inga bokningar med denna status just nu.'}
          </p>
          {activeTab === 'all' && (
            <Link
              href="/search"
              className="inline-flex items-center justify-center px-4 py-2 bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1e40af] transition-colors"
            >
              Sök lokal
            </Link>
          )}
        </div>
      )}

      {/* Bookings list */}
      {!isLoading && !error && bookings.length > 0 && (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const status = STATUS_LABELS[booking.status] || { label: booking.status, color: 'bg-gray-100 text-gray-800' }

            return (
              <Link
                key={booking.id}
                href={`/account/bookings/${booking.id}`}
                className="block bg-white border border-[#e5e7eb] rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Venue image */}
                  <div className="sm:w-48 h-32 sm:h-auto flex-shrink-0 bg-[#f3f4f6]">
                    {booking.venue.primary_photo?.url ? (
                      <img
                        src={booking.venue.primary_photo.url}
                        alt={booking.venue.name}
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

                  {/* Booking info */}
                  <div className="flex-1 p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg text-[#111827]">
                          {booking.venue.name}
                        </h3>
                        <p className="text-sm text-[#6b7280] mt-1">
                          {booking.venue.area ? `${booking.venue.area}, ${booking.venue.city}` : booking.venue.city}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 px-3 py-1 text-sm font-medium rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <dt className="text-xs text-[#6b7280] uppercase tracking-wider">Datum</dt>
                        <dd className="mt-1 text-sm font-medium text-[#111827]">
                          {formatDate(booking.event_date)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-[#6b7280] uppercase tracking-wider">Gäster</dt>
                        <dd className="mt-1 text-sm font-medium text-[#111827]">
                          {booking.guest_count || '-'} personer
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-[#6b7280] uppercase tracking-wider">Pris</dt>
                        <dd className="mt-1 text-sm font-medium text-[#111827]">
                          {formatPrice(booking.total_price)}
                        </dd>
                      </div>
                      <div className="hidden sm:block">
                        <dt className="text-xs text-[#6b7280] uppercase tracking-wider">Bokad</dt>
                        <dd className="mt-1 text-sm font-medium text-[#111827]">
                          {formatDate(booking.created_at)}
                        </dd>
                      </div>
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <div className="hidden sm:flex items-center px-4">
                    <svg className="w-5 h-5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
