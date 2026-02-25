'use server'
import { createClient } from '@/lib/supabase/server'
import { getCalendarProvider } from '@/lib/calendar'
import { getValidAccessToken } from '@/lib/calendar/token-manager'
import type { ExternalCalendar } from '@/lib/calendar/types'

export async function listGoogleCalendars(): Promise<{
  success: boolean
  calendars?: ExternalCalendar[]
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ej inloggad' }

  const { data: connection } = await supabase
    .from('calendar_connections')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .single()

  if (!connection) return { success: false, error: 'Ingen Google Kalender-koppling hittades' }

  const tokenResult = await getValidAccessToken(connection.id)
  if (!tokenResult) return { success: false, error: 'Kunde inte hämta åtkomsttoken' }

  try {
    const provider = getCalendarProvider('google')
    const calendars = await provider.listCalendars(tokenResult.accessToken)
    return { success: true, calendars }
  } catch (err) {
    console.error('Failed to list calendars:', err)
    return { success: false, error: 'Kunde inte hämta kalendrar från Google' }
  }
}
