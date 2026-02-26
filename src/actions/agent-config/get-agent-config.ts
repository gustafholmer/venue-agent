'use server'

import { createClient } from '@/lib/supabase/server'
import type { VenueAgentConfig } from '@/types/agent-booking'

interface GetConfigResult {
  success: boolean
  config?: VenueAgentConfig
  error?: string
}

export async function getAgentConfig(venueId: string): Promise<GetConfigResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ej inloggad' }

  const { data, error } = await supabase
    .from('venue_agent_config')
    .select('*')
    .eq('venue_id', venueId)
    .single()

  if (error && error.code !== 'PGRST116') {
    return { success: false, error: 'Kunde inte hämta konfiguration' }
  }

  return { success: true, config: data ?? undefined }
}
