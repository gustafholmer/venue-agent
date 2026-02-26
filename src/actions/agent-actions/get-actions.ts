'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

interface AgentActionRow {
  id: string
  venue_id: string
  conversation_id: string
  customer_id: string | null
  action_type: string
  status: string
  summary: Json
  owner_response: Json | null
  booking_request_id: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  venues: { name: string } | null
  agent_conversations: {
    customer_id: string | null
    status: string
    collected_booking_data: Json | null
  } | null
}

interface GetActionsResult {
  success: boolean
  actions?: AgentActionRow[]
  error?: string
}

export async function getAgentActions(options: {
  venueId?: string
  status?: string
  limit?: number
} = {}): Promise<GetActionsResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    const limit = options.limit ?? 50

    let query = supabase
      .from('agent_actions')
      .select(`
        id,
        venue_id,
        conversation_id,
        customer_id,
        action_type,
        status,
        summary,
        owner_response,
        booking_request_id,
        created_at,
        updated_at,
        resolved_at,
        venues!inner ( name ),
        agent_conversations!inner ( customer_id, status, collected_booking_data )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (options.venueId) {
      query = query.eq('venue_id', options.venueId)
    }

    // RLS ensures only venue owner's actions are returned
    // (policy: venues.owner_id = auth.uid())

    if (options.status) {
      query = query.eq('status', options.status)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Failed to fetch agent actions', { error })
      return { success: false, error: 'Kunde inte hämta åtgärder' }
    }

    return { success: true, actions: (data ?? []) as unknown as AgentActionRow[] }
  } catch (error) {
    logger.error('Error fetching agent actions', { error })
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
