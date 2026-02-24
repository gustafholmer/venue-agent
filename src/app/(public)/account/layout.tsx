import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AccountNav } from '@/components/account-nav'

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
        <AccountNav />

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
