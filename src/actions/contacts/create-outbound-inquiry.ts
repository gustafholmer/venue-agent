'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/actions/messages/send-message'
import { dispatchNotification } from '@/lib/notifications/create-notification'
import { upsertContact } from '@/actions/contacts/upsert-contact'
import { ALLOWED_EVENT_TYPE_VALUES } from '@/lib/constants'
import { uuidSchema } from '@/lib/validation/schemas'
import { rateLimit, RATE_LIMITS, RATE_LIMIT_ERROR } from '@/lib/rate-limit'

export interface CreateOutboundInquiryInput {
  contactId: string
  eventDate: string
  eventType: string
  guestCount: number
  message: string
}

export interface CreateOutboundInquiryResult {
  success: boolean
  inquiryId?: string
  error?: string
}

export async function createOutboundInquiry(
  input: CreateOutboundInquiryInput
): Promise<CreateOutboundInquiryResult> {
  try {
    const rateLimitResult = await rateLimit('create-outbound-inquiry', RATE_LIMITS.createOutboundInquiry)
    if (!rateLimitResult.success) {
      return { success: false, error: RATE_LIMIT_ERROR }
    }

    const contactIdResult = uuidSchema.safeParse(input.contactId)
    if (!contactIdResult.success) {
      return { success: false, error: 'Ogiltigt kontakt-ID' }
    }

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Get the contact
    const { data: contact } = await supabase
      .from('venue_contacts')
      .select('*')
      .eq('id', input.contactId)
      .single()

    if (!contact) {
      return { success: false, error: 'Kontakten hittades inte' }
    }

    // Verify venue ownership
    const { data: venue } = await supabase
      .from('venues')
      .select('id, name, owner_id')
      .eq('id', contact.venue_id)
      .eq('owner_id', user.id)
      .single()

    if (!venue) {
      return { success: false, error: 'Du har inte behörighet' }
    }

    // Customer must have an account
    if (!contact.customer_id) {
      return { success: false, error: 'Kunden har inget Tryffle-konto och kan inte ta emot meddelanden' }
    }

    // Prevent self-messaging
    if (contact.customer_id === user.id) {
      return { success: false, error: 'Du kan inte skicka meddelanden till dig själv' }
    }

    // Validate fields
    if (!input.eventDate || !input.eventType || !input.guestCount || !input.message?.trim()) {
      return { success: false, error: 'Alla fält måste fyllas i' }
    }

    if (!ALLOWED_EVENT_TYPE_VALUES.includes(input.eventType.toLowerCase())) {
      return { success: false, error: 'Ogiltig eventtyp' }
    }

    const eventDate = new Date(input.eventDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (eventDate <= today) {
      return { success: false, error: 'Datum måste vara i framtiden' }
    }

    if (input.message.trim().length > 2000) {
      return { success: false, error: 'Meddelandet får max vara 2000 tecken' }
    }

    // Check for existing open inquiry
    const { data: existingInquiry } = await supabase
      .from('venue_inquiries')
      .select('id')
      .eq('venue_id', contact.venue_id)
      .eq('user_id', contact.customer_id)
      .eq('status', 'open')
      .maybeSingle()

    if (existingInquiry) {
      return { success: true, inquiryId: existingInquiry.id }
    }

    // Create the inquiry with customer as user_id (shows in their list)
    // Use service client to bypass RLS (auth user is venue owner, not customer)
    const serviceClient = createServiceClient()
    const { data: inquiry, error: insertError } = await serviceClient
      .from('venue_inquiries')
      .insert({
        venue_id: contact.venue_id,
        user_id: contact.customer_id,
        event_date: input.eventDate,
        event_type: input.eventType,
        guest_count: input.guestCount,
        message: input.message.trim(),
      })
      .select('id')
      .single()

    if (insertError || !inquiry) {
      logger.error('Error creating outbound inquiry', { insertError })
      return { success: false, error: 'Kunde inte skapa förfrågan' }
    }

    // Send the first message as the venue owner
    await sendMessage(inquiry.id, input.message.trim(), 'inquiry')

    // Notify the customer
    await dispatchNotification({
      recipient: contact.customer_id,
      category: 'new_inquiry',
      headline: 'Nytt meddelande',
      body: `${venue.name} har skickat dig ett meddelande`,
      reference: { kind: 'inquiry', id: inquiry.id },
      author: user.id,
      extra: {
        venue_name: venue.name,
        event_date: input.eventDate,
      },
    })

    // Update contact stats
    await upsertContact({
      venueId: contact.venue_id,
      customerEmail: contact.customer_email,
      customerName: contact.customer_name,
      customerId: contact.customer_id,
      eventType: input.eventType,
      source: 'inquiry',
    })

    return { success: true, inquiryId: inquiry.id }
  } catch (error) {
    logger.error('Unexpected error creating outbound inquiry', { error })
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
