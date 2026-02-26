'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'
import type { VenueContact } from '@/types/database'

export interface ContactFilters {
  search?: string
  sortBy?: 'last_interaction_at' | 'total_spend' | 'total_bookings' | 'customer_name'
  sortOrder?: 'asc' | 'desc'
}

export interface ContactListItem extends VenueContact {
  venue_name?: string
}

export interface GetContactsResult {
  success: boolean
  contacts?: ContactListItem[]
  error?: string
}

export async function getVenueContacts(
  venueId: string,
  filters: ContactFilters = {}
): Promise<GetContactsResult> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Verify venue ownership (Pattern A)
    const { data: venue } = await supabase
      .from('venues')
      .select('id, name')
      .eq('id', venueId)
      .eq('owner_id', user.id)
      .single()

    if (!venue) {
      return { success: false, error: 'Lokalen hittades inte' }
    }

    let query = supabase
      .from('venue_contacts')
      .select('*')
      .eq('venue_id', venueId)

    // Apply search filter
    if (filters.search) {
      const search = `%${filters.search}%`
      query = query.or(`customer_name.ilike.${search},customer_email.ilike.${search},company_name.ilike.${search}`)
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'last_interaction_at'
    const sortOrder = filters.sortOrder || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const { data: contacts, error } = await query

    if (error) {
      logger.error('Error fetching venue contacts', { error })
      return { success: false, error: 'Kunde inte hämta kontakter' }
    }

    return {
      success: true,
      contacts: (contacts || []).map(c => ({ ...c, venue_name: venue.name })),
    }
  } catch (error) {
    logger.error('Unexpected error fetching venue contacts', { error })
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}

export async function getAllContacts(
  filters: ContactFilters & { venueId?: string } = {}
): Promise<GetContactsResult> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Get all venues for this owner (Pattern B)
    const { data: venues } = await supabase
      .from('venues')
      .select('id, name')
      .eq('owner_id', user.id)

    if (!venues || venues.length === 0) {
      return { success: true, contacts: [] }
    }

    const venueIds = filters.venueId
      ? [filters.venueId]
      : venues.map(v => v.id)
    const venueMap = new Map(venues.map(v => [v.id, v.name]))

    // Verify ownership if filtering by specific venue
    if (filters.venueId && !venueMap.has(filters.venueId)) {
      return { success: false, error: 'Lokalen hittades inte' }
    }

    let query = supabase
      .from('venue_contacts')
      .select('*')
      .in('venue_id', venueIds)

    // Apply search filter
    if (filters.search) {
      const search = `%${filters.search}%`
      query = query.or(`customer_name.ilike.${search},customer_email.ilike.${search},company_name.ilike.${search}`)
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'last_interaction_at'
    const sortOrder = filters.sortOrder || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const { data: contacts, error } = await query

    if (error) {
      logger.error('Error fetching all contacts', { error })
      return { success: false, error: 'Kunde inte hämta kontakter' }
    }

    return {
      success: true,
      contacts: (contacts || []).map(c => ({
        ...c,
        venue_name: venueMap.get(c.venue_id) || '',
      })),
    }
  } catch (error) {
    logger.error('Unexpected error fetching all contacts', { error })
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
