'use server'

import { createClient } from '@/lib/supabase/server'
import { dispatchNotification } from '@/lib/notifications/create-notification'
import { rateLimit, RATE_LIMITS, RATE_LIMIT_ERROR } from '@/lib/rate-limit'
import { ALLOWED_EVENT_TYPE_VALUES } from '@/lib/constants'
import { trackEvent } from '@/lib/analytics'
import { upsertContact } from '@/actions/contacts/upsert-contact'

export interface CreateInquiryInput {
  venueId: string
  eventDate: string
  eventType: string
  guestCount: number
  message: string
}

interface CreateInquiryResult {
  success: boolean
  inquiryId?: string
  existingInquiryId?: string
  error?: string
}

const MAX_MESSAGE_LENGTH = 2000

export async function createInquiry(
  input: CreateInquiryInput
): Promise<CreateInquiryResult> {
  try {
    // Check rate limit
    const rateLimitResult = await rateLimit('create-inquiry', RATE_LIMITS.createInquiry)
    if (!rateLimitResult.success) {
      return { success: false, error: RATE_LIMIT_ERROR }
    }

    const supabase = await createClient()

    // Get current user - must be logged in to send inquiry
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Du måste vara inloggad för att skicka en förfrågan' }
    }

    // Validate required fields
    if (!input.venueId) {
      return { success: false, error: 'Lokal-ID saknas' }
    }
    if (!input.eventDate) {
      return { success: false, error: 'Välj ett datum' }
    }
    if (!input.eventType) {
      return { success: false, error: 'Välj typ av event' }
    }

    // Validate event type against allowed values
    if (!ALLOWED_EVENT_TYPE_VALUES.includes(input.eventType.toLowerCase())) {
      return { success: false, error: 'Ogiltig eventtyp' }
    }

    // Validate guest count
    if (!input.guestCount || input.guestCount < 1) {
      return { success: false, error: 'Ange antal gäster' }
    }

    // Validate message
    if (!input.message?.trim()) {
      return { success: false, error: 'Skriv ett meddelande' }
    }
    if (input.message.trim().length > MAX_MESSAGE_LENGTH) {
      return {
        success: false,
        error: `Meddelandet får max vara ${MAX_MESSAGE_LENGTH} tecken`,
      }
    }

    // Validate date is in the future
    const eventDate = new Date(input.eventDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (eventDate <= today) {
      return { success: false, error: 'Datum måste vara i framtiden' }
    }

    // Check for existing open inquiry for same venue + user
    const { data: existingInquiry, error: existingError } = await supabase
      .from('venue_inquiries')
      .select('id')
      .eq('venue_id', input.venueId)
      .eq('user_id', user.id)
      .eq('status', 'open')
      .limit(1)
      .maybeSingle()

    if (existingError) {
      console.error('Error checking existing inquiry:', existingError)
      return { success: false, error: 'Kunde inte kontrollera befintliga förfrågningar' }
    }

    if (existingInquiry) {
      return { success: true, existingInquiryId: existingInquiry.id }
    }

    // Fetch venue to verify it exists and is published
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id, name, owner_id, status, min_guests, capacity_standing, capacity_seated, capacity_conference')
      .eq('id', input.venueId)
      .single()

    if (venueError || !venue) {
      return { success: false, error: 'Lokalen hittades inte' }
    }

    if (venue.status !== 'published') {
      return { success: false, error: 'Lokalen är inte tillgänglig för förfrågningar' }
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

    // Insert inquiry
    const { data: inquiry, error: insertError } = await supabase
      .from('venue_inquiries')
      .insert({
        venue_id: input.venueId,
        user_id: user.id,
        event_date: input.eventDate,
        event_type: input.eventType,
        guest_count: input.guestCount,
        message: input.message.trim(),
      })
      .select('id')
      .single()

    if (insertError || !inquiry) {
      console.error('Error creating inquiry:', insertError)
      return { success: false, error: 'Kunde inte skapa förfrågan' }
    }

    // Fetch user profile for contact data
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone, company_name')
      .eq('id', user.id)
      .single()

    if (profile) {
      await upsertContact(supabase, {
        venueId: input.venueId,
        customerEmail: profile.email,
        customerName: profile.full_name || profile.email,
        customerId: user.id,
        customerPhone: profile.phone,
        companyName: profile.company_name,
        eventType: input.eventType,
        source: 'inquiry',
      })
    }

    // Create notification for venue owner
    await dispatchNotification({
      recipient: venue.owner_id,
      category: 'new_inquiry',
      headline: 'Ny förfrågan',
      body: `Någon vill veta mer om ${venue.name} den ${formatDate(input.eventDate)}`,
      reference: { kind: 'inquiry', id: inquiry.id },
      author: user.id,
      extra: {
        event_date: input.eventDate,
        event_type: input.eventType,
        guest_count: input.guestCount,
      },
    })

    trackEvent('inquiry_created', {
      venue_id: input.venueId,
      event_type: input.eventType,
      guest_count: input.guestCount,
    }, user.id)

    return {
      success: true,
      inquiryId: inquiry.id,
    }
  } catch (error) {
    console.error('Unexpected error creating inquiry:', error)
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
