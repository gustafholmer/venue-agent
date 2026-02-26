'use server'

import { createClient } from '@/lib/supabase/server'
import { dispatchNotification } from '@/lib/notifications/create-notification'
import { rateLimit, RATE_LIMITS, RATE_LIMIT_ERROR } from '@/lib/rate-limit'
import { inquiryInputSchema } from '@/lib/validation/schemas'
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

    // Validate input
    const parsed = inquiryInputSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Ogiltiga uppgifter'
      return { success: false, error: firstError }
    }
    const validInput = parsed.data

    // Check for existing open inquiry for same venue + user
    const { data: existingInquiry, error: existingError } = await supabase
      .from('venue_inquiries')
      .select('id')
      .eq('venue_id', validInput.venueId)
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
      .eq('id', validInput.venueId)
      .single()

    if (venueError || !venue) {
      return { success: false, error: 'Lokalen hittades inte' }
    }

    if (venue.status !== 'published') {
      return { success: false, error: 'Lokalen är inte tillgänglig för förfrågningar' }
    }

    // Check minimum guest count
    if (venue.min_guests && validInput.guestCount < venue.min_guests) {
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
    if (maxCapacity > 0 && validInput.guestCount > maxCapacity) {
      return {
        success: false,
        error: `Lokalen rymmer max ${maxCapacity} gäster`,
      }
    }

    // Insert inquiry
    const { data: inquiry, error: insertError } = await supabase
      .from('venue_inquiries')
      .insert({
        venue_id: validInput.venueId,
        user_id: user.id,
        event_date: validInput.eventDate,
        event_type: validInput.eventType,
        guest_count: validInput.guestCount,
        message: validInput.message.trim(),
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
      await upsertContact({
        venueId: validInput.venueId,
        customerEmail: profile.email,
        customerName: profile.full_name || profile.email,
        customerId: user.id,
        customerPhone: profile.phone,
        companyName: profile.company_name,
        eventType: validInput.eventType,
        source: 'inquiry',
      })
    }

    // Create notification for venue owner
    await dispatchNotification({
      recipient: venue.owner_id,
      category: 'new_inquiry',
      headline: 'Ny förfrågan',
      body: `Någon vill veta mer om ${venue.name} den ${formatDate(validInput.eventDate)}`,
      reference: { kind: 'inquiry', id: inquiry.id },
      author: user.id,
      extra: {
        event_date: validInput.eventDate,
        event_type: validInput.eventType,
        guest_count: validInput.guestCount,
      },
    })

    trackEvent('inquiry_created', {
      venue_id: validInput.venueId,
      event_type: validInput.eventType,
      guest_count: validInput.guestCount,
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
