import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getVenueBySlug } from '@/actions/venues/get-venue-by-slug'
import { createClient } from '@/lib/supabase/server'
import { BookingForm } from './booking-form'
import { trackEvent } from '@/lib/analytics'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const result = await getVenueBySlug(slug)

  if (!result.success || !result.venue) {
    return {
      title: 'Lokal hittades inte - Tryffle',
    }
  }

  return {
    title: `Boka ${result.venue.name} - Tryffle`,
    description: `Skicka en bokningsförfrågan för ${result.venue.name} i ${result.venue.area || result.venue.city}.`,
    robots: {
      index: false,
      follow: true,
    },
  }
}

async function BookingPageContent({ params }: PageProps) {
  const { slug } = await params
  const result = await getVenueBySlug(slug)

  if (!result.success || !result.venue) {
    notFound()
  }

  const venue = result.venue

  // Fetch current user and profile server-side
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let initialUser: { id: string; email?: string } | null = null
  let initialProfile: { fullName?: string; companyName?: string; phone?: string } | null = null

  if (user) {
    initialUser = { id: user.id, email: user.email }
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, company_name, phone')
      .eq('id', user.id)
      .single()
    if (profile) {
      initialProfile = {
        fullName: profile.full_name ?? undefined,
        companyName: profile.company_name ?? undefined,
        phone: profile.phone ?? undefined,
      }
    }
  }

  trackEvent('booking_started', { venue_id: venue.id, slug }, initialUser?.id)

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <BookingForm venue={venue} initialUser={initialUser} initialProfile={initialProfile} />
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[#e7e5e4] rounded w-1/2" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-48 bg-[#e7e5e4] rounded-xl" />
              <div className="h-32 bg-[#e7e5e4] rounded-xl" />
              <div className="h-32 bg-[#e7e5e4] rounded-xl" />
            </div>
            <div className="h-64 bg-[#e7e5e4] rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function BookingPage(props: PageProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <BookingPageContent params={props.params} />
    </Suspense>
  )
}
