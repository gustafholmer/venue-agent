import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard/dashboard-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.roles.includes('venue_owner')) {
    redirect('/')
  }

  return (
    <div className="bg-[#faf9f7]">
      <div className="flex">
        <DashboardNav />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
