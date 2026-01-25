import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { rateLimit, RATE_LIMITS, RATE_LIMIT_ERROR } from '@/lib/rate-limit'

export async function GET() {
  // Check rate limit
  const rateLimitResult = await rateLimit('venue-photos', RATE_LIMITS.photoUpload)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: RATE_LIMIT_ERROR },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
        },
      }
    )
  }

  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get venue owned by user
  const { data: venue } = await supabase
    .from('venues')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!venue) {
    return NextResponse.json({ photos: [] })
  }

  // Get photos for venue
  const { data: photos, error } = await supabase
    .from('venue_photos')
    .select('id, url, alt_text, sort_order, is_primary')
    .eq('venue_id', venue.id)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching photos:', error)
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
  }

  return NextResponse.json({ photos: photos || [] })
}
