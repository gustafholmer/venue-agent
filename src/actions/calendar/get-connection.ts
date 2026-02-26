'use server'

import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

export async function getCalendarConnection(): Promise<{
  connected: boolean
  providerEmail?: string | null
  connectionId?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { connected: false }

    const { data: connection } = await supabase
      .from('calendar_connections')
      .select('id, provider_email')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .single()

    if (!connection) return { connected: false }
    return { connected: true, providerEmail: connection.provider_email, connectionId: connection.id }
  } catch (error) {
    logger.error('Failed to get calendar connection', { error })
    return { connected: false }
  }
}
