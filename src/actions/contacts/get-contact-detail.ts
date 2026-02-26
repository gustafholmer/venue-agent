'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'
import type { VenueContact } from '@/types/database'

export interface TimelineItem {
  id: string
  type: 'booking' | 'inquiry'
  status: string
  eventType: string | null
  eventDate: string
  guestCount: number | null
  totalPrice: number | null
  createdAt: string
  href: string
}

export interface ContactDetail extends VenueContact {
  venue_name: string
  average_spend: number
  timeline: TimelineItem[]
}

export interface GetContactDetailResult {
  success: boolean
  contact?: ContactDetail
  error?: string
}

export async function getContactDetail(
  contactId: string
): Promise<GetContactDetailResult> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Get the contact
    const { data: contact, error: contactError } = await supabase
      .from('venue_contacts')
      .select('*')
      .eq('id', contactId)
      .single()

    if (contactError || !contact) {
      return { success: false, error: 'Kontakten hittades inte' }
    }

    // Verify venue ownership
    const { data: venue } = await supabase
      .from('venues')
      .select('id, name')
      .eq('id', contact.venue_id)
      .eq('owner_id', user.id)
      .single()

    if (!venue) {
      return { success: false, error: 'Du har inte behörighet att se denna kontakt' }
    }

    // Build activity timeline
    const timeline: TimelineItem[] = []

    // Fetch bookings by email
    const { data: bookings } = await supabase
      .from('booking_requests')
      .select('id, status, event_type, event_date, guest_count, total_price, created_at')
      .eq('venue_id', contact.venue_id)
      .eq('customer_email', contact.customer_email)
      .order('created_at', { ascending: false })

    for (const b of bookings || []) {
      timeline.push({
        id: b.id,
        type: 'booking',
        status: b.status,
        eventType: b.event_type,
        eventDate: b.event_date,
        guestCount: b.guest_count,
        totalPrice: b.total_price,
        createdAt: b.created_at,
        href: `/dashboard/venue/${contact.venue_id}/bookings/${b.id}`,
      })
    }

    // Fetch inquiries by customer_id (inquiries use user_id FK)
    if (contact.customer_id) {
      const { data: inquiries } = await supabase
        .from('venue_inquiries')
        .select('id, status, event_type, event_date, guest_count, created_at')
        .eq('venue_id', contact.venue_id)
        .eq('user_id', contact.customer_id)
        .order('created_at', { ascending: false })

      for (const inq of inquiries || []) {
        timeline.push({
          id: inq.id,
          type: 'inquiry',
          status: inq.status,
          eventType: inq.event_type,
          eventDate: inq.event_date,
          guestCount: inq.guest_count,
          totalPrice: null,
          createdAt: inq.created_at,
          href: `/dashboard/inquiries/${inq.id}`,
        })
      }
    }

    // Sort timeline newest first
    timeline.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const averageSpend = contact.completed_bookings > 0
      ? contact.total_spend / contact.completed_bookings
      : 0

    return {
      success: true,
      contact: {
        ...contact,
        venue_name: venue.name,
        average_spend: averageSpend,
        timeline,
      },
    }
  } catch (error) {
    logger.error('Unexpected error fetching contact detail', { error })
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
