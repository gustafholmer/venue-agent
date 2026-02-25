import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCalendarProvider } from '@/lib/calendar'
import { encrypt } from '@/lib/calendar/encryption'
import { createHmac } from 'crypto'

function verifyState(state: string): string | null {
  const secret = process.env.CALENDAR_ENCRYPTION_KEY
  if (!secret) return null

  const [userId, hmac] = state.split(':')
  if (!userId || !hmac) return null

  const expected = createHmac('sha256', secret).update(userId).digest('hex')
  if (hmac !== expected) return null

  return userId
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const settingsUrl = new URL('/dashboard/settings', request.url)

  if (error || !code || !state) {
    settingsUrl.searchParams.set('calendar_error', error || 'missing_params')
    return NextResponse.redirect(settingsUrl)
  }

  // Verify the state parameter
  const userId = verifyState(state)
  if (!userId) {
    settingsUrl.searchParams.set('calendar_error', 'invalid_state')
    return NextResponse.redirect(settingsUrl)
  }

  // Verify the authenticated user matches the state
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.id !== userId) {
    settingsUrl.searchParams.set('calendar_error', 'auth_mismatch')
    return NextResponse.redirect(settingsUrl)
  }

  try {
    const provider = getCalendarProvider('google')
    const origin = request.nextUrl.origin
    const redirectUri = `${origin}/api/auth/google-calendar/callback`

    const tokens = await provider.exchangeCode(code, redirectUri)

    // Get the user's email from Google Calendar API to display in settings
    const calendars = await provider.listCalendars(tokens.accessToken)
    const primaryCalendar = calendars.find((c) => c.primary)
    const providerEmail = primaryCalendar?.name || null

    // Store encrypted tokens — upsert to handle re-connection
    const { error: dbError } = await supabase
      .from('calendar_connections')
      .upsert(
        {
          user_id: userId,
          provider: 'google',
          encrypted_access_token: encrypt(tokens.accessToken),
          encrypted_refresh_token: encrypt(tokens.refreshToken),
          token_expires_at: tokens.expiresAt.toISOString(),
          provider_email: providerEmail,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider' }
      )

    if (dbError) {
      console.error('Failed to store calendar connection:', dbError)
      settingsUrl.searchParams.set('calendar_error', 'storage_failed')
      return NextResponse.redirect(settingsUrl)
    }

    settingsUrl.searchParams.set('calendar_connected', 'true')
    return NextResponse.redirect(settingsUrl)
  } catch (err) {
    console.error('Google Calendar OAuth callback error:', err)
    settingsUrl.searchParams.set('calendar_error', 'exchange_failed')
    return NextResponse.redirect(settingsUrl)
  }
}
