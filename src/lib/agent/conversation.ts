import { createServiceClient } from '@/lib/supabase/service'
import type { AgentConversation, AgentConversationMessage } from '@/types/agent-booking'

export async function getOrCreateConversation(
  venueId: string,
  conversationId?: string,
  customerId?: string
): Promise<{ conversation: AgentConversation; isNew: boolean }> {
  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // 1. If conversationId provided, try to resume it
  if (conversationId) {
    const { data: existing } = await supabase
      .from('agent_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('venue_id', venueId)
      .neq('status', 'expired')
      .gt('expires_at', now)
      .maybeSingle()

    if (existing) {
      return { conversation: existing as AgentConversation, isNew: false }
    }
  }

  // 2. If customerId provided, look for existing active conversation for this customer + venue
  if (customerId) {
    const { data: existing } = await supabase
      .from('agent_conversations')
      .select('*')
      .eq('venue_id', venueId)
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      return { conversation: existing as AgentConversation, isNew: false }
    }
  }

  // 3. Create new conversation
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data: created, error } = await supabase
    .from('agent_conversations')
    .insert({
      venue_id: venueId,
      customer_id: customerId ?? null,
      status: 'active',
      messages: [],
      collected_booking_data: {},
      expires_at: expiresAt.toISOString(),
    })
    .select('*')
    .single()

  if (error || !created) {
    throw new Error(`Failed to create agent conversation: ${error?.message ?? 'unknown error'}`)
  }

  return { conversation: created as AgentConversation, isNew: true }
}

export async function updateConversation(
  conversationId: string,
  updates: {
    messages?: AgentConversationMessage[]
    status?: string
    collectedBookingData?: Record<string, unknown>
    tier?: number | null
  }
): Promise<void> {
  const supabase = createServiceClient()

  const dbUpdates: Record<string, unknown> = {}

  if (updates.messages !== undefined) {
    dbUpdates.messages = updates.messages
  }
  if (updates.status !== undefined) {
    dbUpdates.status = updates.status
  }
  if (updates.collectedBookingData !== undefined) {
    dbUpdates.collected_booking_data = updates.collectedBookingData
  }
  if (updates.tier !== undefined) {
    dbUpdates.tier = updates.tier
  }

  if (Object.keys(dbUpdates).length === 0) {
    return
  }

  const { error } = await supabase
    .from('agent_conversations')
    .update(dbUpdates)
    .eq('id', conversationId)

  if (error) {
    throw new Error(`Failed to update agent conversation: ${error.message}`)
  }
}

export async function linkConversationToCustomer(
  conversationId: string,
  customerId: string
): Promise<void> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('agent_conversations')
    .update({ customer_id: customerId })
    .eq('id', conversationId)
    .is('customer_id', null)

  if (error) {
    throw new Error(`Failed to link conversation to customer: ${error.message}`)
  }
}
