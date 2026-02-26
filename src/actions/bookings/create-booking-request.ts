'use server'

import crypto from 'crypto'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { calculatePricing } from '@/lib/pricing'
import { dispatchNotification } from '@/lib/notifications/create-notification'
import { rateLimit, RATE_LIMITS, RATE_LIMIT_ERROR } from '@/lib/rate-limit'
import { ALLOWED_EVENT_TYPE_VALUES } from '@/lib/constants'
import { trackEvent } from '@/lib/analytics'
import { convertInquiry } from '@/actions/inquiries/convert-inquiry'

export interface CreateBookingInput {
  venueId: string
  eventDate: string // ISO date YYYY-MM-DD
  startTime: string
  endTime: string
  eventType: string
  eventDescription?: string
  guestCount: number
  customerName: string
  customerEmail: string
  customerPhone?: string
  companyName?: string
  inquiryId?: string
}

interface CreateBookingResult {
  success: boolean
  bookingId?: string
  verificationToken?: string
  error?: string
}

const MAX_LENGTHS = {
  customerName: 200,
  customerEmail: 254,
  customerPhone: 30,
  companyName: 200,
  eventDescription: 5000,
} as const

export async function createBookingRequest(
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  try {
    // Check rate limit
    const rateLimitResult = await rateLimit('create-booking', RATE_LIMITS.createBooking)
    if (!rateLimitResult.success) {
      return { success: false, error: RATE_LIMIT_ERROR }
    }

    const supabase = await createClient()

    // Validate required fields
    if (!input.venueId) {
      return { success: false, error: 'Lokal-ID saknas' }
    }
    if (!input.eventDate) {
      return { success: false, error: 'Välj ett datum' }
    }
    if (!input.startTime) {
      return { success: false, error: 'Välj en starttid' }
    }
    if (!input.endTime) {
      return { success: false, error: 'Välj en sluttid' }
    }

    // Validate end time is after start time
    if (input.startTime >= input.endTime) {
      return { success: false, error: 'Sluttiden måste vara efter starttiden' }
    }

    if (!input.eventType) {
      return { success: false, error: 'Välj typ av event' }
    }

    // Validate event type against allowed values
    if (!ALLOWED_EVENT_TYPE_VALUES.includes(input.eventType.toLowerCase())) {
      return { success: false, error: 'Ogiltig eventtyp' }
    }
    if (!input.guestCount || input.guestCount < 1) {
      return { success: false, error: 'Ange antal gäster' }
    }
    if (!input.customerName?.trim()) {
      return { success: false, error: 'Ange ditt namn' }
    }
    if (!input.customerEmail?.trim()) {
      return { success: false, error: 'Ange din e-postadress' }
    }

    // Validate input lengths
    if (input.customerName.trim().length > MAX_LENGTHS.customerName) {
      return { success: false, error: `Namn får max vara ${MAX_LENGTHS.customerName} tecken` }
    }
    if (input.customerEmail.trim().length > MAX_LENGTHS.customerEmail) {
      return { success: false, error: 'Ogiltig e-postadress' }
    }
    if (input.customerPhone && input.customerPhone.trim().length > MAX_LENGTHS.customerPhone) {
      return { success: false, error: `Telefonnummer får max vara ${MAX_LENGTHS.customerPhone} tecken` }
    }
    if (input.companyName && input.companyName.trim().length > MAX_LENGTHS.companyName) {
      return { success: false, error: `Företagsnamn får max vara ${MAX_LENGTHS.companyName} tecken` }
    }
    if (input.eventDescription && input.eventDescription.length > MAX_LENGTHS.eventDescription) {
      return { success: false, error: `Eventbeskrivning får max vara ${MAX_LENGTHS.eventDescription} tecken` }
    }

    // Validate email format
    const emailResult = z.string().email().safeParse(input.customerEmail.trim())
    if (!emailResult.success) {
      return { success: false, error: 'Ogiltig e-postadress' }
    }

    // Validate date is in the future
    const eventDate = new Date(input.eventDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (eventDate <= today) {
      return { success: false, error: 'Datum måste vara i framtiden' }
    }

    // Fetch venue to verify it exists and is published
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id, name, owner_id, status, price_per_hour, price_half_day, price_full_day, price_evening, min_guests, capacity_standing, capacity_seated, capacity_conference')
      .eq('id', input.venueId)
      .single()

    if (venueError || !venue) {
      return { success: false, error: 'Lokalen hittades inte' }
    }

    if (venue.status !== 'published') {
      return { success: false, error: 'Lokalen är inte tillgänglig för bokning' }
    }

    // Check minimum guest count
    if (venue.min_guests && input.guestCount < venue.min_guests) {
      return {
        success: false,
        error: `Minsta antal gäster för denna lokal är ${venue.min_guests}`,
      }
    }

    // Check maximum capacity
    const maxCapacity = Math.max(
      venue.capacity_standing || 0,
      venue.capacity_seated || 0,
      venue.capacity_conference || 0
    )
    if (maxCapacity > 0 && input.guestCount > maxCapacity) {
      return {
        success: false,
        error: `Lokalen rymmer max ${maxCapacity} gäster`,
      }
    }

    // Calculate price server-side (never trust frontend)
    const basePrice =
      venue.price_full_day ||
      venue.price_half_day ||
      venue.price_evening ||
      (venue.price_per_hour ? venue.price_per_hour * 8 : 0)

    if (!basePrice || basePrice <= 0) {
      return { success: false, error: 'Lokalen saknar prisuppgifter' }
    }

    const pricing = calculatePricing(basePrice)

    // Get current user - must be logged in to book
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Du måste vara inloggad för att boka' }
    }

    // Generate verification token for secure public access
    const verificationToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16)

    // Atomic booking creation with race condition protection
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('create_booking_if_available', {
        p_venue_id: input.venueId,
        p_event_date: input.eventDate,
        p_customer_id: user.id,
        p_event_type: input.eventType,
        p_event_description: input.eventDescription || null,
        p_guest_count: input.guestCount,
        p_start_time: input.startTime,
        p_end_time: input.endTime,
        p_customer_name: input.customerName.trim(),
        p_customer_email: input.customerEmail.trim().toLowerCase(),
        p_customer_phone: input.customerPhone?.trim() || null,
        p_company_name: input.companyName?.trim() || null,
        p_base_price: pricing.basePrice,
        p_platform_fee: pricing.platformFee,
        p_total_price: pricing.totalPrice,
        p_venue_payout: pricing.venuePayout,
        p_verification_token: verificationToken,
      })

    if (rpcError) {
      console.error('Booking RPC error:', rpcError)
      return { success: false, error: 'Kunde inte skapa bokningsförfrågan' }
    }

    const row = rpcResult?.[0]
    if (!row?.booking_id) {
      if (row?.error_code === 'date_blocked') {
        return { success: false, error: 'Valt datum är inte tillgängligt' }
      }
      if (row?.error_code === 'date_booked') {
        return { success: false, error: 'Valt datum är redan bokat' }
      }
      return { success: false, error: 'Kunde inte skapa bokningsförfrågan' }
    }

    // Create notification for venue owner
    await dispatchNotification({
      recipient: venue.owner_id,
      category: 'booking_request',
      headline: 'Ny bokningsförfrågan',
      body: `${input.customerName} vill boka ${venue.name} den ${formatDate(input.eventDate)}`,
      reference: { kind: 'booking', id: row.booking_id },
      author: user?.id,
      extra: {
        customer_name: input.customerName,
        event_date: input.eventDate,
        event_type: input.eventType,
        guest_count: input.guestCount,
      },
    })

    trackEvent('booking_completed', {
      venue_id: input.venueId,
      event_type: input.eventType,
      guest_count: input.guestCount,
    }, user.id)

    // If created from an inquiry, convert the inquiry to linked status
    if (input.inquiryId) {
      try {
        const conversionResult = await convertInquiry(input.inquiryId, row.booking_id)
        if (!conversionResult.success) {
          console.error('Failed to convert inquiry:', conversionResult.error)
        }
      } catch (conversionError) {
        console.error('Error converting inquiry after booking creation:', conversionError)
      }
    }

    return {
      success: true,
      bookingId: row.booking_id,
      verificationToken,
    }
  } catch (error) {
    console.error('Unexpected error creating booking:', error)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod',
    }
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
