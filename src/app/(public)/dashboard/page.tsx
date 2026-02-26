import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse">
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="h-8 bg-[#e7e5e4] rounded w-32 mb-2" />
          <div className="h-5 bg-[#e7e5e4] rounded w-48" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-[#e7e5e4] rounded-xl p-4">
            <div className="h-4 bg-[#e7e5e4] rounded w-20 mb-2" />
            <div className="h-8 bg-[#e7e5e4] rounded w-24" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
        <div className="h-6 bg-[#e7e5e4] rounded w-48 mb-4" />
        <div className="h-10 bg-[#e7e5e4] rounded w-40" />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: 'Utkast', className: 'bg-[#f5f3f0] text-[#78716c]' },
    published: { label: 'Publicerad', className: 'bg-[#d1fae5] text-[#065f46]' },
    paused: { label: 'Pausad', className: 'bg-[#fef3c7] text-[#92400e]' },
  }
  const { label, className } = config[status] || config.draft
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

async function DashboardContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get all venues
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name, status')
    .eq('owner_id', user!.id)
    .order('created_at', { ascending: false })

  const venueIds = (venues || []).map(v => v.id)

  // Get pending bookings count across all venues
  const { count: pendingCount } = venueIds.length > 0
    ? await supabase
        .from('booking_requests')
        .select('*', { count: 'exact', head: true })
        .in('venue_id', venueIds)
        .eq('status', 'pending')
    : { count: 0 }

    // Get open inquiries count across all venues
    const { count: openInquiryCount } = venueIds.length > 0
      ? await supabase
          .from('venue_inquiries')
          .select('*', { count: 'exact', head: true })
          .in('venue_id', venueIds)
          .eq('status', 'open')
      : { count: 0 }

  // Get upcoming bookings across all venues (include venue name via join)
  const { data: upcomingBookings } = venueIds.length > 0
    ? await supabase
        .from('booking_requests')
        .select('*, venues(name)')
        .in('venue_id', venueIds)
        .eq('status', 'accepted')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(5)
    : { data: [] }

  const venueCount = venues?.length || 0
  const publishedCount = (venues || []).filter(v => v.status === 'published').length

  // Zero venues: empty state
  if (venueCount === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#1a1a1a]">Dashboard</h1>
          <p className="text-[#78716c]">Ingen lokal ännu</p>
        </div>

        <div className="bg-[#c45a3b]/5 border border-[#c45a3b]/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[#c45a3b] mb-2">
            Kom igång
          </h2>
          <p className="text-[#57534e] mb-4">
            Skapa din första lokal för att börja ta emot bokningsförfrågningar.
          </p>
          <Link href="/dashboard/venue/new">
            <Button>Skapa lokal</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Determine bookings link based on venue count
  const bookingsHref = venueCount === 1
    ? `/dashboard/venue/${venues![0].id}/bookings?status=pending`
    : '/dashboard/venue'

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#1a1a1a]">Dashboard</h1>
          <p className="text-[#78716c]">
            {venueCount === 1
              ? venues![0].name
              : `Du har ${venueCount} lokaler`}
          </p>
        </div>
        <Link href="/dashboard/venue/new">
          <Button variant="outline">Skapa ny lokal</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-4">
          <p className="text-sm text-[#78716c]">Lokaler</p>
          <p className="text-2xl font-semibold text-[#1a1a1a]">
            {publishedCount} / {venueCount} publicerade
          </p>
        </div>
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-4">
          <p className="text-sm text-[#78716c]">Nya bokningar</p>
          <p className="text-2xl font-semibold text-[#c45a3b]">
            {pendingCount || 0}
          </p>
        </div>
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-4">
          <p className="text-sm text-[#78716c]">Öppna förfrågningar</p>
          <p className="text-2xl font-semibold text-[#c45a3b]">
            {openInquiryCount || 0}
          </p>
        </div>
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-4">
          <p className="text-sm text-[#78716c]">Kommande bokningar</p>
          <p className="text-2xl font-semibold text-[#1a1a1a]">
            {upcomingBookings?.length || 0}
          </p>
        </div>
      </div>

      {/* Pending requests */}
      {(pendingCount || 0) > 0 && (
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">
            Väntar på svar ({pendingCount})
          </h2>
          <Link href={bookingsHref}>
            <Button variant="outline">Visa förfrågningar</Button>
          </Link>
        </div>
      )}

      {/* Venue list */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e7e5e4]">
          <h2 className="text-lg font-semibold text-[#1a1a1a]">Dina lokaler</h2>
        </div>
        <div className="divide-y divide-[#e7e5e4]">
          {venues!.map((venue) => (
            <Link
              key={venue.id}
              href={`/dashboard/venue/${venue.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-[#fafaf9] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[#1a1a1a] font-medium">{venue.name}</span>
                <StatusBadge status={venue.status} />
              </div>
              <svg className="w-5 h-5 text-[#a8a29e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
