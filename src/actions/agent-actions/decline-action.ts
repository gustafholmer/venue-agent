'use server'

import { createClient } from '@/lib/supabase/server'

interface DeclineResult {
  success: boolean
  error?: string
}

export async function declineAction(
  actionId: string,
  reason?: string
): Promise<DeclineResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Load action — RLS enforces venue ownership
    const { data: action, error: actionError } = await supabase
      .from('agent_actions')
      .select('*, venues!inner ( owner_id )')
      .eq('id', actionId)
      .single()

    if (actionError || !action) {
      return { success: false, error: 'Åtgärden hittades inte' }
    }

    const venue = action.venues as unknown as { owner_id: string }

    // Verify ownership
    if (venue.owner_id !== user.id) {
      return { success: false, error: 'Behörighet saknas' }
    }

    // Must be pending
    if (action.status !== 'pending') {
      return { success: false, error: 'Åtgärden är redan hanterad' }
    }

    // Update action: declined
    const { error: updateError } = await supabase
      .from('agent_actions')
      .update({
        status: 'declined',
        resolved_at: new Date().toISOString(),
        owner_response: reason ? { reason } : null,
      })
      .eq('id', actionId)

    if (updateError) {
      console.error('Failed to decline action:', updateError)
      return { success: false, error: 'Kunde inte avvisa åtgärden' }
    }

    // Set conversation back to active so agent can continue with customer
    await supabase
      .from('agent_conversations')
      .update({ status: 'active' })
      .eq('id', action.conversation_id)

    // Broadcast update on Realtime channel
    const channel = supabase.channel(`agent:${action.conversation_id}`)
    await channel.send({
      type: 'broadcast',
      event: 'action_update',
      payload: { actionId, status: 'declined', reason: reason ?? null },
    })
    await supabase.removeChannel(channel)

    return { success: true }
  } catch (error) {
    console.error('Error declining action:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
