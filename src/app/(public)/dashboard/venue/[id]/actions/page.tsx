import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ConversationList } from '@/components/agent/conversation-list'

export default async function VenueActionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: venueId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/sign-in')

  // Verify ownership
  const { data: venue } = await supabase
    .from('venues')
    .select('id, name, owner_id')
    .eq('id', venueId)
    .single()

  if (!venue || venue.owner_id !== user.id) redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">AI-agent</h1>
        <p className="text-[#78716c] mt-1">Konversationer mellan AI-agenten och kunder</p>
      </div>
      <ConversationList venueId={venueId} />
    </div>
  )
}
