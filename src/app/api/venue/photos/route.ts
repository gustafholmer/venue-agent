import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
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
