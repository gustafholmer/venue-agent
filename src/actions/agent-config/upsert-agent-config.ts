'use server'

import { createClient } from '@/lib/supabase/server'
import type {
  PricingRules, BookingParams, EventTypeConfig,
  PolicyConfig, FaqEntry
} from '@/types/agent-booking'

interface UpsertConfigInput {
  venueId: string
  pricingRules?: PricingRules
  bookingParams?: BookingParams
  eventTypes?: EventTypeConfig[]
  policies?: PolicyConfig
  faqEntries?: FaqEntry[]
  agentLanguage?: 'sv' | 'en'
  agentEnabled?: boolean
}

interface UpsertConfigResult {
  success: boolean
  error?: string
}

export async function upsertAgentConfig(input: UpsertConfigInput): Promise<UpsertConfigResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ej inloggad' }

  // Verify ownership
  const { data: venue } = await supabase
    .from('venues')
    .select('owner_id')
    .eq('id', input.venueId)
    .single()

  if (!venue || venue.owner_id !== user.id) {
    return { success: false, error: 'Ingen behörighet' }
  }

  const record: Record<string, unknown> = { venue_id: input.venueId }
  if (input.pricingRules !== undefined) record.pricing_rules = input.pricingRules
  if (input.bookingParams !== undefined) record.booking_params = input.bookingParams
  if (input.eventTypes !== undefined) record.event_types = input.eventTypes
  if (input.policies !== undefined) record.policies = input.policies
  if (input.faqEntries !== undefined) record.faq_entries = input.faqEntries
  if (input.agentLanguage !== undefined) record.agent_language = input.agentLanguage
  if (input.agentEnabled !== undefined) record.agent_enabled = input.agentEnabled

  const { error } = await supabase
    .from('venue_agent_config')
    .upsert(record, { onConflict: 'venue_id' })

  if (error) {
    console.error('Failed to upsert agent config:', error)
    return { success: false, error: 'Kunde inte spara konfiguration' }
  }

  return { success: true }
}
