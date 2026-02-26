import Link from 'next/link'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo-mode'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { UserMenu } from '@/components/user-menu'
import { WorkspaceSwitcher } from '@/components/workspace-switcher'
import { TryffleLogo } from '@/components/illustrations/agent-mascot'
import { SavedVenuesProvider } from '@/contexts/saved-venues-context'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const inDemoMode = isDemoMode() || !isSupabaseConfigured()

  let user = null
  let profile: { roles: string[] } | null = null
  if (!inDemoMode) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data?.user || null
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('roles')
        .eq('id', user.id)
        .single()
      profile = profileData
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="relative bg-gradient-to-r from-[#e8cec8] via-[#f0ddd6] to-[#e4d5cf] border-b border-[#d4bfb6]">
        <div className="px-4 sm:px-6">
          <div className="flex justify-between h-16 items-center">
            <Link
              href="/"
              className="flex items-center gap-2.5 group"
            >
              <div className="relative">
                <TryffleLogo variant="small" className="w-12 h-12 transition-transform duration-200 group-hover:scale-110" />
              </div>
              <span className="text-2xl font-[family-name:var(--font-heading)] tracking-tight text-[#1a1a1a] group-hover:text-[#c45a3b] transition-colors">
                Tryffle
              </span>
            </Link>

            <nav className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/venues"
                className="sm:hidden inline-flex items-center justify-center w-11 h-11 rounded-full text-[#5a4a42] hover:bg-[#c45a3b]/10 hover:text-[#c45a3b] transition-all"
                aria-label="Sök eventlokaler"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </Link>
              <Link
                href="/venues"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full text-[#5a4a42] hover:bg-[#c45a3b]/10 hover:text-[#c45a3b] transition-all"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <span>Eventlokaler</span>
              </Link>
              {!user && (
                <Link
                  href="/auth/sign-up/company"
                  className="hidden sm:inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full text-[#5a4a42] hover:bg-[#7b4a6b]/10 hover:text-[#7b4a6b] transition-all"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span>Lista eventlokal</span>
                </Link>
              )}

              {user ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  {profile?.roles?.includes('venue_owner') && (
                    <WorkspaceSwitcher />
                  )}
                  <NotificationBell viewAllHref={
                    profile?.roles?.includes('venue_owner')
                      ? '/dashboard/notifications'
                      : '/account/notifications'
                  } />
                  <UserMenu isVenueOwner={profile?.roles?.includes('venue_owner') ?? false} />
                </div>
              ) : (
                <Link
                  href="/auth/sign-in"
                  className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-full bg-[#c45a3b] text-white hover:bg-[#a84832] transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                  <span>Logga in</span>
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <SavedVenuesProvider>
          {children}
        </SavedVenuesProvider>
      </main>

      {/* Footer */}
      <footer className="bg-[#2a1f1a] mt-auto">
        <div className="px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <Link
                href="/"
                className="flex items-center gap-2 text-sm text-[#fef3c7]"
              >
                <TryffleLogo variant="small" className="w-5 h-5" />
                Tryffle
              </Link>
              <p className="text-sm text-[#a8977a] mt-1">
                Din personliga lokalagent
              </p>
            </div>

            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#a8977a]">
              <Link href="/venues" className="hover:text-[#fef3c7] transition-colors">
                Sök eventlokaler
              </Link>
              {!user && (
                <Link href="/auth/sign-up/company" className="hover:text-[#fef3c7] transition-colors">
                  Lista din eventlokal
                </Link>
              )}
              <Link href="/faq" className="hover:text-[#fef3c7] transition-colors">
                FAQ
              </Link>
              <Link href="/about" className="hover:text-[#fef3c7] transition-colors">
                Om oss
              </Link>
              <Link href="/policy" className="hover:text-[#fef3c7] transition-colors">
                Villkor
              </Link>
            </nav>
          </div>

          <div className="mt-8 pt-6 border-t border-[#3d2f27]">
            <p className="text-xs text-[#6b5c4f]">
              &copy; {new Date().getFullYear()} Tryffle
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
