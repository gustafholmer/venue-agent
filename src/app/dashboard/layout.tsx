import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { NotificationBell } from '@/components/notifications/notification-bell'

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
          {/* Logo / Brand */}
          <Link
            href="/dashboard"
            className="font-[family-name:var(--font-playfair)] text-xl text-[#111827] hover:text-[#1e3a8a] transition-colors"
          >
            Tryffle
          </Link>

          {/* Right side actions */}
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

      {/* Sidebar */}
      <aside className="fixed left-0 top-14 w-64 h-[calc(100vh-3.5rem)] bg-white border-r border-[#e5e7eb] p-4 hidden lg:block">
        <nav className="space-y-1">
          <Link
            href="/dashboard"
            className="block px-3 py-2 rounded-lg text-[#374151] hover:bg-[#f3f4f6]"
          >
            Översikt
          </Link>
          <Link
            href="/dashboard/venue"
            className="block px-3 py-2 rounded-lg text-[#374151] hover:bg-[#f3f4f6]"
          >
            Min lokal
          </Link>
          <Link
            href="/dashboard/venue/photos"
            className="block px-3 py-2 rounded-lg text-[#374151] hover:bg-[#f3f4f6] pl-6 text-sm"
          >
            Bilder
          </Link>
          <Link
            href="/dashboard/bookings"
            className="block px-3 py-2 rounded-lg text-[#374151] hover:bg-[#f3f4f6]"
          >
            Bokningar
          </Link>
          <Link
            href="/dashboard/calendar"
            className="block px-3 py-2 rounded-lg text-[#374151] hover:bg-[#f3f4f6]"
          >
            Kalender
          </Link>
          <Link
            href="/dashboard/reviews"
            className="block px-3 py-2 rounded-lg text-[#374151] hover:bg-[#f3f4f6]"
          >
            Recensioner
          </Link>
          <Link
            href="/dashboard/payouts"
            className="block px-3 py-2 rounded-lg text-[#374151] hover:bg-[#f3f4f6]"
          >
            Utbetalningar
          </Link>
          <Link
            href="/dashboard/settings"
            className="block px-3 py-2 rounded-lg text-[#374151] hover:bg-[#f3f4f6]"
          >
            Inställningar
          </Link>
        </nav>
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
