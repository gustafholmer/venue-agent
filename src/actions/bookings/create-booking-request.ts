'use server'

import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { calculatePricing } from '@/lib/pricing'
import { dispatchNotification } from '@/lib/notifications/create-notification'

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
}

interface CreateBookingResult {
  success: boolean
  bookingId?: string
  verificationToken?: string
  error?: string
}

// Allowed event types (validated server-side)
const ALLOWED_EVENT_TYPES = ['aw', 'konferens', 'fest', 'workshop', 'middag', 'foretag', 'privat', 'annat']

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function createBookingRequest(
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  try {
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
    if (!ALLOWED_EVENT_TYPES.includes(input.eventType.toLowerCase())) {
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

    // Validate email format
    if (!EMAIL_REGEX.test(input.customerEmail)) {
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
      .select('id, name, owner_id, status, price_per_hour, price_half_day, price_full_day, price_evening, min_guests')
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

    // Check if date is blocked
    const { data: blockedDate } = await supabase
      .from('venue_blocked_dates')
      .select('id')
      .eq('venue_id', input.venueId)
      .eq('blocked_date', input.eventDate)
      .single()

    if (blockedDate) {
      return { success: false, error: 'Valt datum är inte tillgängligt' }
    }

    // Check if date already has an accepted or pending booking
    const { data: existingBooking } = await supabase
      .from('booking_requests')
      .select('id, status')
      .eq('venue_id', input.venueId)
      .eq('event_date', input.eventDate)
      .in('status', ['accepted', 'pending'])
      .single()

    if (existingBooking) {
      return { success: false, error: 'Valt datum är redan bokat' }
    }

    // Calculate price server-side (never trust frontend)
    // Use price_full_day as default, fall back to others
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

    // Create the booking request
    const { data: booking, error: bookingError } = await supabase
      .from('booking_requests')
      .insert({
        venue_id: input.venueId,
        customer_id: user.id,
        event_type: input.eventType,
        event_description: input.eventDescription || null,
        guest_count: input.guestCount,
        event_date: input.eventDate,
        start_time: input.startTime,
        end_time: input.endTime,
        customer_name: input.customerName.trim(),
        customer_email: input.customerEmail.trim().toLowerCase(),
        customer_phone: input.customerPhone?.trim() || null,
        company_name: input.companyName?.trim() || null,
        status: 'pending',
        base_price: pricing.basePrice,
        platform_fee: pricing.platformFee,
        total_price: pricing.totalPrice,
        venue_payout: pricing.venuePayout,
        verification_token: verificationToken,
      })
      .select('id')
      .single()

    if (bookingError || !booking) {
      console.error('Error creating booking:', bookingError)
      return { success: false, error: 'Kunde inte skapa bokningsförfrågan' }
    }

    // Create notification for venue owner
    await dispatchNotification({
      recipient: venue.owner_id,
      category: 'booking_request',
      headline: 'Ny bokningsförfrågan',
      body: `${input.customerName} vill boka ${venue.name} den ${formatDate(input.eventDate)}`,
      reference: { kind: 'booking', id: booking.id },
      author: user?.id,
      extra: {
        customer_name: input.customerName,
        event_date: input.eventDate,
        event_type: input.eventType,
        guest_count: input.guestCount,
      },
    })

    return {
      success: true,
      bookingId: booking.id,
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
