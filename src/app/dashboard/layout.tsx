import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { MobileMenu } from '@/components/dashboard/mobile-menu'
import { SidebarNav } from '@/components/dashboard/sidebar-nav'

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
    .select('user_type, company_name, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.user_type !== 'venue_owner') {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      {/* Top header bar */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#e5e7eb] z-40">
        <div className="h-full px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MobileMenu />
            <Link
              href="/dashboard"
              className="font-[family-name:var(--font-playfair)] text-xl text-[#111827] hover:text-[#1e3a8a] transition-colors"
            >
              Tryffle
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="text-sm text-[#6b7280] hidden sm:block">
              {profile.company_name || profile.full_name || user.email}
            </span>
            <Link
              href="/"
              className="text-sm text-[#374151] hover:text-[#111827] transition-colors"
            >
              Till sidan
            </Link>
          </div>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-14 w-64 h-[calc(100vh-3.5rem)] bg-white border-r border-[#e5e7eb] p-4 hidden lg:block">
        <SidebarNav />
      </aside>

      {/* Main content */}
      <main className="lg:pl-64 pt-14">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
