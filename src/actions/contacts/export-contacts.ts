'use server'

import { createClient } from '@/lib/supabase/server'

export interface ExportContactsResult {
  success: boolean
  csv?: string
  error?: string
}

export async function exportContacts(
  venueId?: string
): Promise<ExportContactsResult> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Get owned venues
    const { data: venues } = await supabase
      .from('venues')
      .select('id')
      .eq('owner_id', user.id)

    if (!venues || venues.length === 0) {
      return { success: false, error: 'Inga lokaler hittades' }
    }

    const venueIds = venueId ? [venueId] : venues.map(v => v.id)

    // Verify ownership if filtering by specific venue
    if (venueId && !venues.some(v => v.id === venueId)) {
      return { success: false, error: 'Lokalen hittades inte' }
    }

    const { data: contacts, error } = await supabase
      .from('venue_contacts')
      .select('*')
      .in('venue_id', venueIds)
      .order('last_interaction_at', { ascending: false })

    if (error) {
      return { success: false, error: 'Kunde inte hämta kontakter' }
    }

    if (!contacts || contacts.length === 0) {
      return { success: false, error: 'Inga kontakter att exportera' }
    }

    // Build CSV
    const headers = [
      'Namn', 'E-post', 'Telefon', 'Företag',
      'Antal bokningar', 'Totalt spenderat (kr)', 'Eventtyper',
      'Första interaktion', 'Senaste aktivitet',
    ]

    const rows = contacts.map(c => [
      escapeCsvField(c.customer_name),
      escapeCsvField(c.customer_email),
      escapeCsvField(c.customer_phone || ''),
      escapeCsvField(c.company_name || ''),
      String(c.completed_bookings),
      String(c.total_spend),
      escapeCsvField((c.event_types || []).join(', ')),
      formatDate(c.first_interaction_at),
      formatDate(c.last_interaction_at),
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n')

    return { success: true, csv }
  } catch (error) {
    console.error('Unexpected error exporting contacts:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('sv-SE')
}
