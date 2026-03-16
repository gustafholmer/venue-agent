import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ConversationList } from '@/components/agent/conversation-list'

export default async function DashboardActionsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/sign-in')

  // Verify owner has venues
  const { data: venues } = await supabase
    .from('venues')
    .select('id')
    .eq('owner_id', user.id)

  if (!venues || venues.length === 0) redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Kundkonversationer</h1>
        <p className="text-[#78716c] mt-1">Samtal mellan AI-agenten och kunder på dina lokaler</p>
      </div>
      <ConversationList />
    </div>
  )
}
