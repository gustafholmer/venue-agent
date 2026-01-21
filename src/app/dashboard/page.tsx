import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get venue
  const { data: venue } = await supabase
    .from('venues')
    .select('id, name, status')
    .eq('owner_id', user!.id)
    .single()

  // Get pending bookings count
  const { count: pendingCount } = await supabase
    .from('booking_requests')
    .select('*', { count: 'exact', head: true })
    .eq('venue_id', venue?.id || '')
    .eq('status', 'pending')

  // Get upcoming bookings
  const { data: upcomingBookings } = await supabase
    .from('booking_requests')
    .select('*')
    .eq('venue_id', venue?.id || '')
    .eq('status', 'accepted')
    .gte('event_date', new Date().toISOString().split('T')[0])
    .order('event_date', { ascending: true })
    .limit(5)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Dashboard</h1>
          <p className="text-[#6b7280]">
            {venue ? venue.name : 'Ingen lokal ännu'}
          </p>
        </div>
        {!venue && (
          <Link href="/dashboard/venue/new">
            <Button>Skapa lokal</Button>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
          <p className="text-sm text-[#6b7280]">Status</p>
          <p className="text-2xl font-semibold text-[#111827]">
            {venue?.status === 'published' ? 'Publicerad' :
             venue?.status === 'draft' ? 'Utkast' : 'Ingen lokal'}
          </p>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
          <p className="text-sm text-[#6b7280]">Nya förfrågningar</p>
          <p className="text-2xl font-semibold text-[#1e3a8a]">
            {pendingCount || 0}
          </p>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
          <p className="text-sm text-[#6b7280]">Kommande bokningar</p>
          <p className="text-2xl font-semibold text-[#111827]">
            {upcomingBookings?.length || 0}
          </p>
        </div>
      </div>

      {/* Pending requests */}
      {(pendingCount || 0) > 0 && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-[#111827] mb-4">
            Väntar på svar ({pendingCount})
          </h2>
          <Link href="/dashboard/bookings?status=pending">
            <Button variant="outline">Visa förfrågningar</Button>
          </Link>
        </div>
      )}

      {/* Quick actions */}
      {!venue && (
        <div className="bg-[#1e3a8a]/5 border border-[#1e3a8a]/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[#1e3a8a] mb-2">
            Kom igång
          </h2>
          <p className="text-[#374151] mb-4">
            Skapa din lokal för att börja ta emot bokningsförfrågningar.
          </p>
          <Link href="/dashboard/venue/new">
            <Button>Skapa lokal</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
