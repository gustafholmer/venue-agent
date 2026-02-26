'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { VenueWithDetails } from '@/actions/venues/get-venue-by-slug'
import { createBookingRequest } from '@/actions/bookings/create-booking-request'
import { getVenueAvailability } from '@/actions/bookings/get-venue-availability'
import { getInquiry } from '@/actions/inquiries/get-inquiry'
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
  initialProfile: { fullName?: string; companyName?: string; phone?: string } | null
}

export function BookingForm({ venue, initialUser, initialProfile }: BookingFormProps) {
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
  const [customerName, setCustomerName] = useState(initialProfile?.fullName ?? '')
  const [customerEmail, setCustomerEmail] = useState(initialUser?.email ?? '')
  const [customerPhone, setCustomerPhone] = useState(initialProfile?.phone ?? '')
  const [companyName, setCompanyName] = useState(initialProfile?.companyName ?? '')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Inquiry pre-fill state
  const [inquiryId, setInquiryId] = useState<string | null>(null)
  const [showInquiryBanner, setShowInquiryBanner] = useState(false)

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

  // On mount: check for ?inquiry=<id> and pre-fill form from inquiry data
  // This has lower priority than the fromAuth restore flow
  useEffect(() => {
    const fromAuth = searchParams.get('fromAuth') === 'true'
    if (fromAuth) return // fromAuth flow takes priority

    const inquiryParam = searchParams.get('inquiry')
    if (!inquiryParam) return

    let cancelled = false

    async function fetchAndPrefill() {
      const result = await getInquiry(inquiryParam!)
      if (cancelled) return

      if (result.success && result.inquiry) {
        const inquiry = result.inquiry
        setInquiryId(inquiry.id)
        setShowInquiryBanner(true)

        // Pre-fill only the fields that exist in the inquiry
        if (inquiry.event_date) setEventDate(inquiry.event_date)
        if (inquiry.event_type) setEventType(inquiry.event_type)
        if (inquiry.guest_count) setGuestCount(String(inquiry.guest_count))
      }
    }

    fetchAndPrefill()
    return () => { cancelled = true }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  // Track which months have been fetched
  const [fetchedMonths, setFetchedMonths] = useState<Set<string>>(new Set())
  const [isLoadingMonth, setIsLoadingMonth] = useState(false)

  // Fetch availability for a single month
  const fetchMonthAvailability = useCallback(async (year: number, month: number) => {
    const key = `${year}-${month}`
    if (fetchedMonths.has(key)) return

    setIsLoadingMonth(true)
    try {
      const result = await getVenueAvailability(venue.id, year, month)
      if (result.success && result.data) {
        setBlockedDates((prev) => [...prev, ...result.data!.blockedDates])
        setBookedDates((prev) => [...prev, ...result.data!.bookedDates])
      }
      setFetchedMonths((prev) => new Set(prev).add(key))
    } finally {
      setIsLoadingMonth(false)
    }
  }, [venue.id, fetchedMonths])

  // Fetch current month on mount
  useEffect(() => {
    const now = new Date()
    fetchMonthAvailability(now.getFullYear(), now.getMonth() + 1)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle calendar month navigation
  const handleMonthChange = useCallback((year: number, month: number) => {
    fetchMonthAvailability(year, month)
  }, [fetchMonthAvailability])

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
        inquiryId: inquiryId || undefined,
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
          className="inline-flex items-center gap-2 text-[#78716c] hover:text-[#c45a3b] transition-colors mb-4"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Tillbaka till {venue.name}
        </Link>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl font-semibold text-[#1a1a1a]">
          Skicka bokningsförfrågan
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Inquiry Pre-fill Banner */}
            {showInquiryBanner && (
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Du fyller i en bokning baserad på din förfrågan. Fälten är förifyllda men du kan ändra dem.</span>
              </div>
            )}

            {/* Event Details Section */}
            <div className="bg-white rounded-xl border border-[#e7e5e4] p-6">
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-6">
                Eventdetaljer
              </h2>

              {/* Date Picker */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#57534e] mb-2">
                  Välj datum <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  value={eventDate}
                  onChange={setEventDate}
                  blockedDates={blockedDates}
                  bookedDates={bookedDates}
                  onMonthChange={handleMonthChange}
                  isLoadingMonth={isLoadingMonth}
                />
              </div>

              {/* Time Selection */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-[#57534e] mb-2">
                    Starttid <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#e5e5e5] bg-white text-[#1a1a1a] focus:outline-none focus:border-[#c45a3b] focus:ring-1 focus:ring-[#c45a3b]"
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
                  <label className="block text-sm font-medium text-[#57534e] mb-2">
                    Sluttid <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#e5e5e5] bg-white text-[#1a1a1a] focus:outline-none focus:border-[#c45a3b] focus:ring-1 focus:ring-[#c45a3b]"
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
                <label className="block text-sm font-medium text-[#57534e] mb-2">
                  Typ av event <span className="text-red-500">*</span>
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#e5e5e5] bg-white text-[#1a1a1a] focus:outline-none focus:border-[#c45a3b] focus:ring-1 focus:ring-[#c45a3b]"
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
                <label className="block text-sm font-medium text-[#57534e] mb-2">
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
                  <p className="text-sm text-[#78716c] mt-1">
                    Minst {venue.min_guests} gäster
                  </p>
                )}
              </div>

              {/* Event Description */}
              <div>
                <label className="block text-sm font-medium text-[#57534e] mb-2">
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
            <div className="bg-white rounded-xl border border-[#e7e5e4] p-6">
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-6">
                Dina uppgifter
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#57534e] mb-2">
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
                  <label className="block text-sm font-medium text-[#57534e] mb-2">
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
                  <label className="block text-sm font-medium text-[#57534e] mb-2">
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
                  <label className="block text-sm font-medium text-[#57534e] mb-2">
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
                  className="mt-1 w-4 h-4 text-[#c45a3b] border-[#e7e5e4] rounded focus:ring-[#c45a3b]"
                />
                <span className="text-sm text-[#57534e]">
                  Jag godkänner{' '}
                  <Link href="/policy" className="text-[#c45a3b] hover:underline">
                    villkoren
                  </Link>{' '}
                  och{' '}
                  <Link href="/policy" className="text-[#c45a3b] hover:underline">
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
                  <p className="text-[#57534e]">Logga in för att boka</p>
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
              <div className="bg-white rounded-xl border border-[#e7e5e4] overflow-hidden">
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
                  <h3 className="font-semibold text-[#1a1a1a]">{venue.name}</h3>
                  <p className="text-sm text-[#78716c]">
                    {venue.area ? `${venue.area}, ${venue.city}` : venue.city}
                  </p>
                </div>
              </div>

              {/* Price Summary */}
              {pricing && (
                <div className="bg-white rounded-xl border border-[#e7e5e4] p-4">
                  <h3 className="font-semibold text-[#1a1a1a] mb-4">Prisöversikt</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#78716c]">Pris</span>
                      <span className="text-[#1a1a1a]">{formatPrice(pricing.basePrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#78716c]">
                        Serviceavgift ({Math.round(PLATFORM_FEE_RATE * 100)}%)
                      </span>
                      <span className="text-[#1a1a1a]">{formatPrice(pricing.platformFee)}</span>
                    </div>
                    <div className="pt-3 border-t border-[#e7e5e4] flex justify-between">
                      <span className="font-semibold text-[#1a1a1a]">Totalt</span>
                      <span className="font-semibold text-[#1a1a1a]">
                        {formatPrice(pricing.totalPrice)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[#78716c] mt-4">
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
                    className="mt-1 w-4 h-4 text-[#c45a3b] border-[#e7e5e4] rounded focus:ring-[#c45a3b]"
                  />
                  <span className="text-sm text-[#57534e]">
                    Jag godkänner{' '}
                    <Link href="/policy" className="text-[#c45a3b] hover:underline">
                      villkoren
                    </Link>{' '}
                    och{' '}
                    <Link href="/policy" className="text-[#c45a3b] hover:underline">
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
                    <p className="text-[#57534e]">Logga in för att boka</p>
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
