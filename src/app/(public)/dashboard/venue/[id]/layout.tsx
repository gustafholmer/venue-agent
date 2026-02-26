import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { VenueNav } from '@/components/dashboard/venue-nav'

export default async function VenueLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: venue } = await supabase
    .from('venues')
    .select('id, name')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!venue) {
    notFound()
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back link */}
      <Link
        href="/dashboard/venue"
        className="inline-flex items-center gap-1.5 text-sm text-[#78716c] hover:text-[#1a1a1a] transition-colors mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Tillbaka till mina lokaler
      </Link>

      {/* Venue name */}
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#1a1a1a] mb-4">
        {venue.name}
      </h1>

      {/* Secondary nav */}
      <VenueNav venueId={venue.id} />

      {/* Page content */}
      <div className="mt-6">
        {children}
      </div>
    </div>
  )
}
