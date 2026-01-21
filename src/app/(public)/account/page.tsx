import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCustomerBookingStats } from '@/actions/bookings/get-customer-bookings'
import { getCustomerBookings } from '@/actions/bookings/get-customer-bookings'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Väntande', color: 'bg-yellow-100 text-yellow-800' },
  accepted: { label: 'Godkänd', color: 'bg-green-100 text-green-800' },
  declined: { label: 'Nekad', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Avbokad', color: 'bg-gray-100 text-gray-800' },
  completed: { label: 'Genomförd', color: 'bg-blue-100 text-blue-800' },
  paid_out: { label: 'Genomförd', color: 'bg-blue-100 text-blue-800' },
}

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  // Get booking stats
  const statsResult = await getCustomerBookingStats()
  const stats = statsResult.stats || { total: 0, pending: 0, accepted: 0, completed: 0 }

  // Get recent bookings (limit to 3)
  const bookingsResult = await getCustomerBookings('all')
  const recentBookings = (bookingsResult.bookings || []).slice(0, 3)

  // Get saved venues count
  const { count: savedVenuesCount } = await supabase
    .from('saved_venues')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', user.id)

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
        <h1 className="text-2xl font-semibold text-[#111827]">
          Välkommen, {profile?.full_name || 'till ditt konto'}!
        </h1>
        <p className="text-[#6b7280] mt-1">
          Här är en översikt över dina bokningar och sparade lokaler
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
          <div className="text-2xl font-semibold text-[#111827]">{stats.total}</div>
          <div className="text-sm text-[#6b7280]">Totala bokningar</div>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
          <div className="text-2xl font-semibold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-[#6b7280]">Väntande</div>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
          <div className="text-2xl font-semibold text-green-600">{stats.accepted}</div>
          <div className="text-sm text-[#6b7280]">Godkända</div>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
          <div className="text-2xl font-semibold text-[#1e3a8a]">{savedVenuesCount || 0}</div>
          <div className="text-sm text-[#6b7280]">Sparade lokaler</div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href="/search"
          className="bg-white border border-[#e5e7eb] rounded-xl p-6 hover:shadow-md transition-shadow group"
        >
          <div className="w-10 h-10 bg-[#1e3a8a]/10 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-[#1e3a8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="font-medium text-[#111827] group-hover:text-[#1e3a8a] transition-colors">
            Sök lokal
          </h3>
          <p className="text-sm text-[#6b7280] mt-1">
            Hitta den perfekta lokalen för ditt event
          </p>
        </Link>

        <Link
          href="/account/bookings"
          className="bg-white border border-[#e5e7eb] rounded-xl p-6 hover:shadow-md transition-shadow group"
        >
          <div className="w-10 h-10 bg-[#1e3a8a]/10 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-[#1e3a8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-medium text-[#111827] group-hover:text-[#1e3a8a] transition-colors">
            Mina bokningar
          </h3>
          <p className="text-sm text-[#6b7280] mt-1">
            Se och hantera dina bokningar
          </p>
        </Link>

        <Link
          href="/account/saved"
          className="bg-white border border-[#e5e7eb] rounded-xl p-6 hover:shadow-md transition-shadow group"
        >
          <div className="w-10 h-10 bg-[#1e3a8a]/10 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-[#1e3a8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="font-medium text-[#111827] group-hover:text-[#1e3a8a] transition-colors">
            Sparade lokaler
          </h3>
          <p className="text-sm text-[#6b7280] mt-1">
            Se dina favoritlokaler
          </p>
        </Link>
      </div>

      {/* Recent bookings */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
        <div className="p-6 border-b border-[#e5e7eb] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#111827]">Senaste bokningar</h2>
          <Link
            href="/account/bookings"
            className="text-sm text-[#1e3a8a] hover:text-[#1e40af]"
          >
            Visa alla
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#f3f4f6] rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-[#111827] mb-2">Inga bokningar ännu</h3>
            <p className="text-[#6b7280] mb-4">
              Du har inte gjort några bokningar ännu
            </p>
            <Link
              href="/search"
              className="inline-flex items-center justify-center px-4 py-2 bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1e40af] transition-colors"
            >
              Sök lokal
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#e5e7eb]">
            {recentBookings.map((booking) => {
              const status = STATUS_LABELS[booking.status] || { label: booking.status, color: 'bg-gray-100 text-gray-800' }

              return (
                <Link
                  key={booking.id}
                  href={`/account/bookings/${booking.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-[#f9fafb] transition-colors"
                >
                  {/* Venue image */}
                  <div className="w-16 h-16 flex-shrink-0 bg-[#f3f4f6] rounded-lg overflow-hidden">
                    {booking.venue.primary_photo?.url ? (
                      <img
                        src={booking.venue.primary_photo.url}
                        alt={booking.venue.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-[#d1d5db]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Booking info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[#111827] truncate">
                      {booking.venue.name}
                    </h3>
                    <p className="text-sm text-[#6b7280]">
                      {formatDate(booking.event_date)} - {booking.guest_count || '?'} gäster
                    </p>
                  </div>

                  {/* Status */}
                  <span className={`flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                    {status.label}
                  </span>

                  {/* Arrow */}
                  <svg className="w-5 h-5 text-[#9ca3af] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
