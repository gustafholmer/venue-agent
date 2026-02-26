import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ActionFeed } from '@/components/agent/action-feed'

export default async function VenueActionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: venueId } = await params
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/sign-in')

  // Verify ownership
  const { data: venue } = await supabase
    .from('venues')
    .select('id, name, owner_id')
    .eq('id', venueId)
    .single()

  if (!venue || venue.owner_id !== user.id) redirect('/dashboard')

  // Fetch initial actions
  const { data: actions } = await supabase
    .from('agent_actions')
    .select('*')
    .eq('venue_id', venueId)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Atgarder</h1>
        <p className="text-[#78716c] mt-1">Hantera bokningsforfragan och forfragan</p>
      </div>
      <ActionFeed venueId={venueId} initialActions={actions ?? []} />
    </div>
  )
}
