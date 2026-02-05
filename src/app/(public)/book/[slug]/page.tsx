import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getVenueBySlug } from '@/actions/venues/get-venue-by-slug'
import { createClient } from '@/lib/supabase/server'
import { BookingForm } from './booking-form'

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
  }
}

async function BookingPageContent({ params }: PageProps) {
  const { slug } = await params
  const result = await getVenueBySlug(slug)

  if (!result.success || !result.venue) {
    notFound()
  }

  const venue = result.venue

  // Fetch current user server-side
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const initialUser = user ? { id: user.id, email: user.email } : null

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <BookingForm venue={venue} initialUser={initialUser} />
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[#e5e7eb] rounded w-1/2" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-48 bg-[#e5e7eb] rounded-xl" />
              <div className="h-32 bg-[#e5e7eb] rounded-xl" />
              <div className="h-32 bg-[#e5e7eb] rounded-xl" />
            </div>
            <div className="h-64 bg-[#e5e7eb] rounded-xl" />
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
