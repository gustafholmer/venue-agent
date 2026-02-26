import { createServiceClient } from '@/lib/supabase/service'

interface UpsertContactInput {
  venueId: string
  customerEmail: string
  customerName: string
  customerId?: string | null
  customerPhone?: string | null
  companyName?: string | null
  eventType?: string | null
  source: 'booking' | 'inquiry'
}

export async function upsertContact(
  input: UpsertContactInput
): Promise<void> {
  try {
    const supabase = createServiceClient()
    const email = input.customerEmail.trim().toLowerCase()
    const now = new Date().toISOString()

    // Check if contact already exists for this venue + email
    const { data: existing } = await supabase
      .from('venue_contacts')
      .select('id, event_types, total_bookings, total_inquiries')
      .eq('venue_id', input.venueId)
      .eq('customer_email', email)
      .maybeSingle()

    if (existing) {
      // Update existing contact
      const updatedEventTypes = existing.event_types || []
      if (input.eventType && !updatedEventTypes.includes(input.eventType)) {
        updatedEventTypes.push(input.eventType)
      }

      const updates: Record<string, unknown> = {
        customer_name: input.customerName,
        last_interaction_at: now,
        event_types: updatedEventTypes,
        updated_at: now,
      }

      // Update optional fields if provided
      if (input.customerPhone) updates.customer_phone = input.customerPhone
      if (input.companyName) updates.company_name = input.companyName
      if (input.customerId) updates.customer_id = input.customerId

      // Increment the appropriate counter
      if (input.source === 'booking') {
        updates.total_bookings = existing.total_bookings + 1
      } else {
        updates.total_inquiries = existing.total_inquiries + 1
      }

      await supabase
        .from('venue_contacts')
        .update(updates)
        .eq('id', existing.id)
    } else {
      // Create new contact
      const eventTypes = input.eventType ? [input.eventType] : []

      await supabase
        .from('venue_contacts')
        .insert({
          venue_id: input.venueId,
          customer_id: input.customerId || null,
          customer_name: input.customerName,
          customer_email: email,
          customer_phone: input.customerPhone || null,
          company_name: input.companyName || null,
          total_bookings: input.source === 'booking' ? 1 : 0,
          total_inquiries: input.source === 'inquiry' ? 1 : 0,
          first_interaction_at: now,
          last_interaction_at: now,
          event_types: eventTypes,
        })
    }
  } catch (error) {
    // Log but don't throw — contact upsert should never block the primary action
    console.error('Error upserting contact:', error)
  }
}

export async function updateContactBookingCompleted(
  venueId: string,
  customerEmail: string,
  totalPrice: number
): Promise<void> {
  try {
    const supabase = createServiceClient()
    const email = customerEmail.trim().toLowerCase()

    const { data: contact } = await supabase
      .from('venue_contacts')
      .select('id, completed_bookings, total_spend')
      .eq('venue_id', venueId)
      .eq('customer_email', email)
      .maybeSingle()

    if (contact) {
      await supabase
        .from('venue_contacts')
        .update({
          completed_bookings: contact.completed_bookings + 1,
          total_spend: contact.total_spend + totalPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contact.id)
    }
  } catch (error) {
    console.error('Error updating contact booking completed:', error)
  }
}
