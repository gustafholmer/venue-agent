import Link from 'next/link'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo-mode'
import { NotificationBell } from '@/components/notifications/notification-bell'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const inDemoMode = isDemoMode() || !isSupabaseConfigured()

  let user = null
  if (!inDemoMode) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data?.user || null
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[#e7e5e4]">
        <div className="px-4 sm:px-6">
          <div className="flex justify-between h-14 items-center">
            <Link
              href="/"
              className="text-lg tracking-tight text-[#1a1a1a] hover:text-[#c45a3b] transition-colors"
            >
              venue agent
            </Link>

            <nav className="flex items-center gap-6">
              <Link
                href="/venues"
                className="inline-flex items-center gap-1.5 text-sm text-[#78716c] hover:text-[#1a1a1a] transition-colors hidden sm:inline-flex"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <span>Eventlokaler</span>
              </Link>
              <Link
                href="/auth/register/venue"
                className="inline-flex items-center gap-1.5 text-sm text-[#78716c] hover:text-[#1a1a1a] transition-colors hidden sm:inline-flex"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span>Lista eventlokal</span>
              </Link>

              {user ? (
                <div className="flex items-center gap-4">
                  <NotificationBell />
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 text-sm text-[#1a1a1a] hover:text-[#c45a3b] transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    <span>Konto</span>
                  </Link>
                </div>
              ) : (
                <Link
                  href="/auth/sign-in"
                  className="inline-flex items-center gap-1.5 text-sm text-[#1a1a1a] hover:text-[#c45a3b] transition-colors"
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
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e7e5e4] mt-auto">
        <div className="px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <Link
                href="/"
                className="text-sm text-[#1a1a1a]"
              >
                venue agent
              </Link>
              <p className="text-sm text-[#78716c] mt-1">
                Din personliga lokalagent
              </p>
            </div>

            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#78716c]">
              <Link href="/venues" className="hover:text-[#1a1a1a] transition-colors">
                Sök eventlokaler
              </Link>
              <Link href="/auth/register/venue" className="hover:text-[#1a1a1a] transition-colors">
                Lista din eventlokal
              </Link>
              <Link href="/faq" className="hover:text-[#1a1a1a] transition-colors">
                FAQ
              </Link>
              <Link href="/about" className="hover:text-[#1a1a1a] transition-colors">
                Om oss
              </Link>
              <Link href="/policy" className="hover:text-[#1a1a1a] transition-colors">
                Villkor
              </Link>
            </nav>
          </div>

          <div className="mt-8 pt-6 border-t border-[#e7e5e4]">
            <p className="text-xs text-[#78716c]">
              &copy; {new Date().getFullYear()} Venue Agent
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
