import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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

  return (
    <div className="bg-[#faf9f7]">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 bg-white border-r border-[#e7e5e4] p-4 hidden lg:block min-h-[calc(100vh-4rem)]">
          <nav className="space-y-1">
            <Link
              href="/account"
              className="block px-3 py-2 rounded-lg text-[#57534e] hover:bg-[#f5f5f4]"
            >
              Mitt konto
            </Link>
            <Link
              href="/account/bookings"
              className="block px-3 py-2 rounded-lg text-[#57534e] hover:bg-[#f5f5f4]"
            >
              Mina bokningar
            </Link>
            <Link
              href="/account/saved"
              className="block px-3 py-2 rounded-lg text-[#57534e] hover:bg-[#f5f5f4]"
            >
              Sparade lokaler
            </Link>
            <Link
              href="/account/settings"
              className="block px-3 py-2 rounded-lg text-[#57534e] hover:bg-[#f5f5f4]"
            >
              Inställningar
            </Link>
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Mobile navigation */}
          <div className="lg:hidden bg-white border-b border-[#e7e5e4]">
            <div className="flex overflow-x-auto">
              <Link
                href="/account"
                className="flex-shrink-0 px-4 py-3 text-sm text-[#57534e] hover:text-[#1a1a1a] border-b-2 border-transparent hover:border-[#c45a3b]"
              >
                Mitt konto
              </Link>
              <Link
                href="/account/bookings"
                className="flex-shrink-0 px-4 py-3 text-sm text-[#57534e] hover:text-[#1a1a1a] border-b-2 border-transparent hover:border-[#c45a3b]"
              >
                Mina bokningar
              </Link>
              <Link
                href="/account/saved"
                className="flex-shrink-0 px-4 py-3 text-sm text-[#57534e] hover:text-[#1a1a1a] border-b-2 border-transparent hover:border-[#c45a3b]"
              >
                Sparade lokaler
              </Link>
              <Link
                href="/account/settings"
                className="flex-shrink-0 px-4 py-3 text-sm text-[#57534e] hover:text-[#1a1a1a] border-b-2 border-transparent hover:border-[#c45a3b]"
              >
                Inställningar
              </Link>
            </div>
          </div>

          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
