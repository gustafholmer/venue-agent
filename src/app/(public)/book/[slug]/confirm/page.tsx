import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { getBooking } from '@/actions/bookings/get-booking'
import { formatPrice } from '@/lib/pricing'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ id?: string; token?: string }>
}

export const metadata: Metadata = {
  title: 'Bokningsförfrågan skickad - Tryffle',
  description: 'Din bokningsförfrågan har skickats till lokalägaren.',
  robots: {
    index: false,
    follow: false,
  },
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('sv-SE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatEventType(type: string | null): string {
  const types: Record<string, string> = {
    aw: 'AW / Afterwork',
    konferens: 'Konferens',
    fest: 'Fest / Firande',
    workshop: 'Workshop',
    middag: 'Middag / Bankett',
    foretag: 'Företagsevent',
    privat: 'Privat tillställning',
    annat: 'Annat',
  }
  return types[type || ''] || type || 'Ej angivet'
}

async function ConfirmationContent({ searchParams }: { searchParams: Promise<{ id?: string; token?: string }> }) {
  const { id, token } = await searchParams

  if (!id) {
    redirect('/')
  }

  const result = await getBooking(id, token)

  if (!result.success || !result.booking) {
    notFound()
  }

  const booking = result.booking
  const venue = booking.venue

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1a1a1a] mb-2">
            Din förfrågan har skickats!
          </h1>
          <p className="text-[#78716c]">
            Vi har skickat en bekräftelse till {booking.customer_email}
          </p>
        </div>

        {/* Booking Summary */}
        <div className="bg-white rounded-xl border border-[#e7e5e4] overflow-hidden mb-8">
          {/* Venue Header */}
          <div className="flex items-center gap-4 p-6 border-b border-[#e7e5e4]">
            {venue.primary_photo && (
              <div className="w-20 h-20 relative rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={venue.primary_photo.url}
                  alt={venue.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div>
              <h2 className="font-semibold text-[#1a1a1a]">{venue.name}</h2>
              <p className="text-sm text-[#78716c]">
                {venue.area ? `${venue.area}, ${venue.city}` : venue.city}
              </p>
            </div>
          </div>

          {/* Booking Details */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[#78716c]">Datum</p>
                <p className="font-medium text-[#1a1a1a] capitalize">
                  {formatDate(booking.event_date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#78716c]">Tid</p>
                <p className="font-medium text-[#1a1a1a]">
                  {booking.start_time} - {booking.end_time}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#78716c]">Typ av event</p>
                <p className="font-medium text-[#1a1a1a]">
                  {formatEventType(booking.event_type)}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#78716c]">Antal gäster</p>
                <p className="font-medium text-[#1a1a1a]">{booking.guest_count} personer</p>
              </div>
            </div>

            {booking.event_description && (
              <div>
                <p className="text-sm text-[#78716c]">Beskrivning</p>
                <p className="text-[#1a1a1a]">{booking.event_description}</p>
              </div>
            )}

            {/* Price Summary */}
            <div className="pt-4 border-t border-[#e7e5e4]">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#78716c]">Pris</span>
                <span className="text-[#1a1a1a]">{formatPrice(booking.base_price)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#78716c]">Serviceavgift</span>
                <span className="text-[#1a1a1a]">{formatPrice(booking.platform_fee)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t border-[#e7e5e4]">
                <span className="text-[#1a1a1a]">Totalt</span>
                <span className="text-[#1a1a1a]">{formatPrice(booking.total_price)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* What Happens Next */}
        <div className="bg-white rounded-xl border border-[#e7e5e4] p-6 mb-8">
          <h3 className="font-semibold text-[#1a1a1a] mb-4">Vad händer nu?</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[#c45a3b]/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-[#c45a3b]">1</span>
              </div>
              <div>
                <p className="font-medium text-[#1a1a1a]">Lokalägaren granskar</p>
                <p className="text-sm text-[#78716c]">
                  Lokalägaren har fått ett meddelande om din förfrågan och kommer att granska den.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[#c45a3b]/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-[#c45a3b]">2</span>
              </div>
              <div>
                <p className="font-medium text-[#1a1a1a]">Du får svar</p>
                <p className="text-sm text-[#78716c]">
                  Vi meddelar dig via e-post när lokalägaren har svarat på din förfrågan.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[#c45a3b]/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-[#c45a3b]">3</span>
              </div>
              <div>
                <p className="font-medium text-[#1a1a1a]">Bekräfta och betala</p>
                <p className="text-sm text-[#78716c]">
                  Om förfrågan godkänns kan du slutföra bokningen genom att betala.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/venues" className="flex-1">
            <Button variant="secondary" size="lg" className="w-full">
              Utforska fler lokaler
            </Button>
          </Link>
          <Link href="/auth/sign-up" className="flex-1">
            <Button variant="primary" size="lg" className="w-full">
              Skapa konto för att följa bokningen
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="animate-pulse space-y-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-[#e7e5e4] rounded-full mx-auto" />
            <div className="h-8 bg-[#e7e5e4] rounded w-3/4 mx-auto" />
            <div className="h-4 bg-[#e7e5e4] rounded w-1/2 mx-auto" />
          </div>
          <div className="h-64 bg-[#e7e5e4] rounded-xl" />
          <div className="h-48 bg-[#e7e5e4] rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export default async function ConfirmationPage(props: PageProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <ConfirmationContent searchParams={props.searchParams} />
    </Suspense>
  )
}
