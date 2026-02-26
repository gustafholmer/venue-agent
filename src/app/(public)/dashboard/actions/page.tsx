import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ActionFeed } from '@/components/agent/action-feed'

export default async function DashboardActionsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/sign-in')

  // Get all venues for this owner
  const { data: venues } = await supabase
    .from('venues')
    .select('id')
    .eq('owner_id', user.id)

  if (!venues || venues.length === 0) redirect('/dashboard')

  const venueIds = venues.map(v => v.id)

  // Fetch initial actions across all venues
  const { data: actions } = await supabase
    .from('agent_actions')
    .select('*, venues!inner(name)')
    .in('venue_id', venueIds)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Atgarder</h1>
        <p className="text-[#78716c] mt-1">Alla atgarder for dina lokaler</p>
      </div>
      <ActionFeed initialActions={actions ?? []} />
    </div>
  )
}
