'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { VenueWithDetails } from '@/actions/venues/get-venue-by-slug'
import { createBookingRequest } from '@/actions/bookings/create-booking-request'
import { getVenueAvailability } from '@/actions/bookings/get-venue-availability'
import { checkAuth } from '@/actions/auth/check-auth'
import { saveBookingFormData, getBookingFormData, clearBookingFormData } from '@/lib/booking-form-storage'
import { calculatePricing, formatPrice, PLATFORM_FEE_RATE } from '@/lib/pricing'
import { DatePicker } from '@/components/booking/date-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { VenueAssistant } from '@/components/chat/venue-assistant'
import { EVENT_TYPES, TIME_OPTIONS } from '@/lib/constants'

interface BookingFormProps {
  venue: VenueWithDetails
  initialUser: { id: string; email?: string } | null
}

export function BookingForm({ venue, initialUser }: BookingFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  // Form state
  const [eventDate, setEventDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [eventType, setEventType] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Availability state
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  const [bookedDates, setBookedDates] = useState<string[]>([])

  // Get venue slug for storage and URLs
  const slug = venue.slug || venue.id

  // On mount: check for ?fromAuth=true and restore form data from sessionStorage
  useEffect(() => {
    const fromAuth = searchParams.get('fromAuth') === 'true'
    if (fromAuth) {
      const savedData = getBookingFormData(slug)
      if (savedData) {
        setEventDate(savedData.eventDate)
        setStartTime(savedData.startTime)
        setEndTime(savedData.endTime)
        setEventType(savedData.eventType)
        setEventDescription(savedData.eventDescription)
        setGuestCount(savedData.guestCount)
        setCustomerName(savedData.customerName)
        setCustomerEmail(savedData.customerEmail)
        setCustomerPhone(savedData.customerPhone)
        setCompanyName(savedData.companyName)
        setAgreedToTerms(savedData.agreedToTerms)
      }
      // Clean up the URL by removing the fromAuth param
      window.history.replaceState({}, '', `/book/${slug}`)
    }
  }, [searchParams, slug])

  // Fetch availability for current and next 2 months on load
  useEffect(() => {
    async function fetchAvailability() {
      const now = new Date()
      const allBlocked: string[] = []
      const allBooked: string[] = []

      // Fetch for current month and next 2 months
      for (let i = 0; i < 3; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
        const result = await getVenueAvailability(
          venue.id,
          date.getFullYear(),
          date.getMonth() + 1
        )
        if (result.success && result.data) {
          allBlocked.push(...result.data.blockedDates)
          allBooked.push(...result.data.bookedDates)
        }
      }

      setBlockedDates(allBlocked)
      setBookedDates(allBooked)
    }
    fetchAvailability()
  }, [venue.id])

  // Calculate pricing
  const basePrice =
    venue.price_full_day ||
    venue.price_half_day ||
    venue.price_evening ||
    (venue.price_per_hour ? venue.price_per_hour * 8 : 0)

  const pricing = basePrice ? calculatePricing(basePrice) : null

  const primaryPhoto = venue.photos[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setShowLoginPrompt(false)

    if (!agreedToTerms) {
      setError('Du måste godkänna villkoren')
      return
    }

    setIsSubmitting(true)

    try {
      // Check if user is authenticated
      // Use initialUser first for quick check, then verify with server action
      let isAuthenticated = !!initialUser
      if (!isAuthenticated) {
        const authResult = await checkAuth()
        isAuthenticated = authResult.isAuthenticated
      }

      if (!isAuthenticated) {
        // Save form data to sessionStorage before showing login prompt
        saveBookingFormData({
          venueId: venue.id,
          venueSlug: slug,
          eventDate,
          startTime,
          endTime,
          eventType,
          eventDescription,
          guestCount,
          customerName,
          customerEmail,
          customerPhone,
          companyName,
          agreedToTerms,
          savedAt: Date.now(),
        })
        setShowLoginPrompt(true)
        setIsSubmitting(false)
        return
      }

      const result = await createBookingRequest({
        venueId: venue.id,
        eventDate,
        startTime,
        endTime,
        eventType,
        eventDescription: eventDescription || undefined,
        guestCount: parseInt(guestCount, 10),
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        companyName: companyName || undefined,
      })

      if (result.success && result.bookingId && result.verificationToken) {
        // Clear any saved form data on successful booking
        clearBookingFormData()
        // Redirect to confirmation page with booking ID and verification token
        router.push(`/book/${slug}/confirm?id=${result.bookingId}&token=${result.verificationToken}`)
      } else {
        setError(result.error || 'Något gick fel')
      }
    } catch {
      setError('Ett oväntat fel uppstod')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/venues/${venue.slug || venue.id}`}
          className="inline-flex items-center gap-2 text-[#6b7280] hover:text-[#1e3a8a] transition-colors mb-4"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Tillbaka till {venue.name}
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827]">
          Skicka bokningsförfrågan
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Details Section */}
            <div className="bg-white rounded-xl border border-[#e5e7eb] p-6">
              <h2 className="text-lg font-semibold text-[#111827] mb-6">
                Eventdetaljer
              </h2>

              {/* Date Picker */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#374151] mb-2">
                  Välj datum <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  value={eventDate}
                  onChange={setEventDate}
                  blockedDates={blockedDates}
                  bookedDates={bookedDates}
                />
              </div>

              {/* Time Selection */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    Starttid <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#e5e5e5] bg-white text-[#1f2937] focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
                    required
                  >
                    <option value="">Välj tid</option>
                    {TIME_OPTIONS.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    Sluttid <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#e5e5e5] bg-white text-[#1f2937] focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
                    required
                  >
                    <option value="">Välj tid</option>
                    {TIME_OPTIONS.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Event Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#374151] mb-2">
                  Typ av event <span className="text-red-500">*</span>
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#e5e5e5] bg-white text-[#1f2937] focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
                  required
                >
                  <option value="">Välj typ av event</option>
                  {EVENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Guest Count */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#374151] mb-2">
                  Antal gäster <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min={venue.min_guests || 1}
                  max={Math.max(
                    venue.capacity_standing || 0,
                    venue.capacity_seated || 0,
                    venue.capacity_conference || 0,
                    999
                  )}
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  placeholder="T.ex. 50"
                  required
                />
                {venue.min_guests > 1 && (
                  <p className="text-sm text-[#6b7280] mt-1">
                    Minst {venue.min_guests} gäster
                  </p>
                )}
              </div>

              {/* Event Description */}
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">
                  Beskriv ditt event
                </label>
                <Textarea
                  rows={4}
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Berätta lite mer om ditt event, t.ex. speciella önskemål, mat och dryck, aktiviteter..."
                />
              </div>
            </div>

            {/* Customer Details Section */}
            <div className="bg-white rounded-xl border border-[#e5e7eb] p-6">
              <h2 className="text-lg font-semibold text-[#111827] mb-6">
                Dina uppgifter
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    Namn <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ditt namn"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    E-post <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="din@email.se"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    Telefon
                  </label>
                  <Input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="07X XXX XX XX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    Företag
                  </label>
                  <Input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Företagsnamn (valfritt)"
                  />
                </div>
              </div>
            </div>

            {/* Terms & Submit (Mobile) */}
            <div className="lg:hidden space-y-4">
              {/* Terms Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 text-[#1e3a8a] border-[#e5e7eb] rounded focus:ring-[#1e3a8a]"
                />
                <span className="text-sm text-[#374151]">
                  Jag godkänner{' '}
                  <Link href="/terms" className="text-[#1e3a8a] hover:underline">
                    villkoren
                  </Link>{' '}
                  och{' '}
                  <Link href="/privacy" className="text-[#1e3a8a] hover:underline">
                    integritetspolicyn
                  </Link>
                </span>
              </label>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                  <span className="flex-1">{error}</span>
                  <button onClick={() => setError(null)} className="flex-shrink-0 p-1 hover:bg-red-100 rounded" aria-label="Stäng">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}

              {/* Login Prompt or Submit Button */}
              {showLoginPrompt ? (
                <div className="space-y-4 text-center p-4 bg-[#f3f4f6] rounded-lg">
                  <p className="text-[#374151]">Logga in för att boka</p>
                  <div className="flex gap-4 justify-center">
                    <Link href={`/auth/sign-in?returnUrl=${encodeURIComponent(`/book/${slug}?fromAuth=true`)}`}>
                      <Button type="button" variant="primary">Logga in</Button>
                    </Link>
                    <Link href={`/auth/sign-up?returnUrl=${encodeURIComponent(`/book/${slug}?fromAuth=true`)}`}>
                      <Button type="button" variant="outline">Skapa konto</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  loading={isSubmitting} disabled={!agreedToTerms}
                >
                  Skicka bokningsförfrågan
                </Button>
              )}
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              {/* Venue Card */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
                {primaryPhoto && (
                  <div className="aspect-[16/10] relative">
                    <Image
                      src={primaryPhoto.url}
                      alt={primaryPhoto.alt_text || venue.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-[#111827]">{venue.name}</h3>
                  <p className="text-sm text-[#6b7280]">
                    {venue.area ? `${venue.area}, ${venue.city}` : venue.city}
                  </p>
                </div>
              </div>

              {/* Price Summary */}
              {pricing && (
                <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
                  <h3 className="font-semibold text-[#111827] mb-4">Prisöversikt</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6b7280]">Pris</span>
                      <span className="text-[#111827]">{formatPrice(pricing.basePrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6b7280]">
                        Serviceavgift ({Math.round(PLATFORM_FEE_RATE * 100)}%)
                      </span>
                      <span className="text-[#111827]">{formatPrice(pricing.platformFee)}</span>
                    </div>
                    <div className="pt-3 border-t border-[#e5e7eb] flex justify-between">
                      <span className="font-semibold text-[#111827]">Totalt</span>
                      <span className="font-semibold text-[#111827]">
                        {formatPrice(pricing.totalPrice)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[#6b7280] mt-4">
                    Betalning sker efter att lokalägaren godkänt din förfrågan.
                  </p>
                </div>
              )}

              {/* Terms & Submit (Desktop) */}
              <div className="hidden lg:block space-y-4">
                {/* Terms Checkbox */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#1e3a8a] border-[#e5e7eb] rounded focus:ring-[#1e3a8a]"
                  />
                  <span className="text-sm text-[#374151]">
                    Jag godkänner{' '}
                    <Link href="/terms" className="text-[#1e3a8a] hover:underline">
                      villkoren
                    </Link>{' '}
                    och{' '}
                    <Link href="/privacy" className="text-[#1e3a8a] hover:underline">
                      integritetspolicyn
                    </Link>
                  </span>
                </label>

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                    <span className="flex-1">{error}</span>
                    <button onClick={() => setError(null)} className="flex-shrink-0 p-1 hover:bg-red-100 rounded" aria-label="Stäng">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}

                {/* Login Prompt or Submit Button */}
                {showLoginPrompt ? (
                  <div className="space-y-4 text-center p-4 bg-[#f3f4f6] rounded-lg">
                    <p className="text-[#374151]">Logga in för att boka</p>
                    <div className="flex gap-4 justify-center">
                      <Link href={`/auth/sign-in?returnUrl=${encodeURIComponent(`/book/${slug}?fromAuth=true`)}`}>
                        <Button type="button" variant="primary">Logga in</Button>
                      </Link>
                      <Link href={`/auth/sign-up?returnUrl=${encodeURIComponent(`/book/${slug}?fromAuth=true`)}`}>
                        <Button type="button" variant="outline">Skapa konto</Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    loading={isSubmitting} disabled={!agreedToTerms}
                  >
                    Skicka bokningsförfrågan
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Venue Assistant */}
      <VenueAssistant
        venue={{
          id: venue.id,
          name: venue.name,
          slug: venue.slug || venue.id,
          description: venue.description,
          area: venue.area,
          city: venue.city,
          capacity_standing: venue.capacity_standing,
          capacity_seated: venue.capacity_seated,
          capacity_conference: venue.capacity_conference,
          min_guests: venue.min_guests,
          amenities: venue.amenities,
          venue_types: venue.venue_types,
          price_per_hour: venue.price_per_hour,
          price_half_day: venue.price_half_day,
          price_full_day: venue.price_full_day,
          price_evening: venue.price_evening,
        }}
        isBookingPage
        formSetters={{
          setEventDate,
          setStartTime,
          setEndTime,
          setEventType,
          setGuestCount,
        }}
      />
    </div>
  )
}
