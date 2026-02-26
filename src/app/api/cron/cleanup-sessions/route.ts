import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { serverEnv } from '@/lib/env'

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron (or has valid secret)
  const authHeader = request.headers.get('authorization')
  const cronSecret = serverEnv.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('agent_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id')

  if (error) {
    console.error('Failed to cleanup expired sessions:', error)
    return NextResponse.json(
      { error: 'Cleanup failed', details: error.message },
      { status: 500 }
    )
  }

  // Expire agent conversations past their expiry
  const { error: convError } = await supabase
    .from('agent_conversations')
    .update({ status: 'expired' })
    .lt('expires_at', new Date().toISOString())
    .neq('status', 'expired')

  if (convError) {
    console.error('Failed to expire agent conversations:', convError)
  }

  // Expire pending agent actions older than 14 days
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const { error: actionError } = await supabase
    .from('agent_actions')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('created_at', fourteenDaysAgo)

  if (actionError) {
    console.error('Failed to expire agent actions:', actionError)
  }

  return NextResponse.json({
    success: true,
    deleted: data?.length ?? 0,
    timestamp: new Date().toISOString(),
  })
}
