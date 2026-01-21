import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { NotificationBell } from '@/components/notifications/notification-bell'

export default async function AccountLayout({
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
    .select('full_name, email, user_type')
    .eq('id', user.id)
    .single()

  // Only customers can access this area
  if (profile?.user_type === 'venue_owner') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      {/* Top header bar */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#e5e7eb] z-40">
        <div className="h-full px-4 lg:px-6 flex items-center justify-between">
          {/* Logo / Brand */}
          <Link
            href="/"
            className="font-[family-name:var(--font-playfair)] text-xl text-[#111827] hover:text-[#1e3a8a] transition-colors"
          >
            Venue Agent
          </Link>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="text-sm text-[#6b7280] hidden sm:block">
              {profile?.full_name || user.email}
            </span>
            <Link
              href="/"
              className="text-sm text-[#374151] hover:text-[#111827] transition-colors"
            >
              Till startsidan
            </Link>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="fixed left-0 top-14 w-64 h-[calc(100vh-3.5rem)] bg-white border-r border-[#e5e7eb] p-4 hidden lg:block">
        <nav className="space-y-1">
          <Link
            href="/account"
            className="block px-3 py-2 rounded-lg text-[#374151] hover:bg-[#f3f4f6]"
          >
            Mitt konto
          </Link>
          <Link
            href="/account/bookings"
            className="block px-3 py-2 rounded-lg text-[#374151] hover:bg-[#f3f4f6]"
          >
            Mina bokningar
          </Link>
          <Link
            href="/account/saved"
            className="block px-3 py-2 rounded-lg text-[#374151] hover:bg-[#f3f4f6]"
          >
            Sparade lokaler
          </Link>
          <Link
            href="/account/settings"
            className="block px-3 py-2 rounded-lg text-[#374151] hover:bg-[#f3f4f6]"
          >
            Inställningar
          </Link>
        </nav>
      </aside>

      {/* Mobile navigation */}
      <div className="lg:hidden fixed top-14 left-0 right-0 bg-white border-b border-[#e5e7eb] z-30">
        <div className="flex overflow-x-auto">
          <Link
            href="/account"
            className="flex-shrink-0 px-4 py-3 text-sm text-[#374151] hover:text-[#111827] border-b-2 border-transparent hover:border-[#1e3a8a]"
          >
            Mitt konto
          </Link>
          <Link
            href="/account/bookings"
            className="flex-shrink-0 px-4 py-3 text-sm text-[#374151] hover:text-[#111827] border-b-2 border-transparent hover:border-[#1e3a8a]"
          >
            Mina bokningar
          </Link>
          <Link
            href="/account/saved"
            className="flex-shrink-0 px-4 py-3 text-sm text-[#374151] hover:text-[#111827] border-b-2 border-transparent hover:border-[#1e3a8a]"
          >
            Sparade lokaler
          </Link>
          <Link
            href="/account/settings"
            className="flex-shrink-0 px-4 py-3 text-sm text-[#374151] hover:text-[#111827] border-b-2 border-transparent hover:border-[#1e3a8a]"
          >
            Inställningar
          </Link>
        </div>
      </div>

      {/* Main content */}
      <main className="lg:pl-64 pt-14 lg:pt-14">
        <div className="pt-12 lg:pt-0 p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
