'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'

export interface InboxItem {
  id: string
  type: 'inquiry' | 'booking'
  customerName: string | null
  customerEmail: string
  venueName: string
  venueId: string
  status: string
  eventDate: string | null
  guestCount: number | null
  eventType: string | null
  lastMessagePreview: string | null
  lastActivityAt: string
  unreadCount: number
}

export interface InboxFilters {
  venueId?: string
  type?: 'inquiry' | 'booking' | 'all'
  status?: string
}

export interface GetInboxItemsResult {
  success: boolean
  items?: InboxItem[]
  error?: string
}

export async function getInboxItems(
  filters: InboxFilters = {}
): Promise<GetInboxItemsResult> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Get all venues for this owner
    const { data: venues } = await supabase
      .from('venues')
      .select('id, name')
      .eq('owner_id', user.id)

    if (!venues || venues.length === 0) {
      return { success: true, items: [] }
    }

    const venueIds = filters.venueId
      ? [filters.venueId]
      : venues.map(v => v.id)
    const venueMap = new Map(venues.map(v => [v.id, v.name]))

    // Verify ownership if filtering by specific venue
    if (filters.venueId && !venueMap.has(filters.venueId)) {
      return { success: false, error: 'Ingen lokal hittades' }
    }

    const items: InboxItem[] = []

    // Fetch inquiries (unless filtering to bookings only)
    if (filters.type !== 'booking') {
      let inquiryQuery = supabase
        .from('venue_inquiries')
        .select(`
          id, venue_id, event_date, event_type, guest_count, message, status, created_at, updated_at,
          profile:profiles!inner(full_name, email)
        `)
        .in('venue_id', venueIds)
        .order('updated_at', { ascending: false })

      if (filters.status) {
        inquiryQuery = inquiryQuery.eq('status', filters.status)
      }

      const { data: inquiries } = await inquiryQuery

      for (const inq of inquiries || []) {
        const profile = inq.profile as unknown as { full_name: string | null; email: string }

        // Get latest message for this inquiry
        const { data: latestMsg } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('venue_inquiry_id', inq.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        // Get unread count
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('venue_inquiry_id', inq.id)
          .neq('sender_id', user.id)
          .eq('is_read', false)

        const lastActivity = latestMsg?.created_at || inq.updated_at || inq.created_at

        items.push({
          id: inq.id,
          type: 'inquiry',
          customerName: profile.full_name,
          customerEmail: profile.email,
          venueName: venueMap.get(inq.venue_id) || '',
          venueId: inq.venue_id,
          status: inq.status,
          eventDate: inq.event_date,
          guestCount: inq.guest_count,
          eventType: inq.event_type,
          lastMessagePreview: latestMsg?.content?.slice(0, 100) || inq.message.slice(0, 100),
          lastActivityAt: lastActivity,
          unreadCount: unreadCount || 0,
        })
      }
    }

    // Fetch bookings (unless filtering to inquiries only)
    if (filters.type !== 'inquiry') {
      let bookingQuery = supabase
        .from('booking_requests')
        .select('id, venue_id, customer_name, customer_email, event_type, event_date, guest_count, status, created_at, updated_at')
        .in('venue_id', venueIds)
        .order('updated_at', { ascending: false })

      if (filters.status) {
        bookingQuery = bookingQuery.eq('status', filters.status)
      }

      const { data: bookings } = await bookingQuery

      for (const booking of bookings || []) {
        // Get latest message for this booking
        const { data: latestMsg } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('booking_request_id', booking.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        // Get unread count
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('booking_request_id', booking.id)
          .neq('sender_id', user.id)
          .eq('is_read', false)

        const lastActivity = latestMsg?.created_at || booking.updated_at || booking.created_at

        items.push({
          id: booking.id,
          type: 'booking',
          customerName: booking.customer_name,
          customerEmail: booking.customer_email,
          venueName: venueMap.get(booking.venue_id) || '',
          venueId: booking.venue_id,
          status: booking.status,
          eventDate: booking.event_date,
          guestCount: booking.guest_count,
          eventType: booking.event_type,
          lastMessagePreview: latestMsg?.content?.slice(0, 100) || null,
          lastActivityAt: lastActivity,
          unreadCount: unreadCount || 0,
        })
      }
    }

    // Sort by latest activity, newest first
    items.sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime())

    return { success: true, items }
  } catch (error) {
    logger.error('Unexpected error fetching inbox items', { error })
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
