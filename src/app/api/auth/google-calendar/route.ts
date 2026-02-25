import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCalendarProvider } from '@/lib/calendar'
import { createHmac } from 'crypto'

function signState(userId: string): string {
  const secret = process.env.CALENDAR_ENCRYPTION_KEY
  if (!secret) throw new Error('CALENDAR_ENCRYPTION_KEY not set')
  const hmac = createHmac('sha256', secret).update(userId).digest('hex')
  return `${userId}:${hmac}`
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url))
  }

  const provider = getCalendarProvider('google')
  const origin = request.nextUrl.origin
  const redirectUri = `${origin}/api/auth/google-calendar/callback`
  const state = signState(user.id)

  const authUrl = provider.getAuthUrl(redirectUri, state)
  return NextResponse.redirect(authUrl)
}
