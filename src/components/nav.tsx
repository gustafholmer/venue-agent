import { Button } from '@/components/ui/button'
import { isDemoMode } from '@/lib/demo-mode'
import { MOCK_USER } from '@/lib/mock-data'

async function getNavData() {
  if (isDemoMode()) {
    return { user: MOCK_USER }
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { user }
}

export async function Nav() {
  const { user } = await getNavData()
  const demoMode = isDemoMode()

  async function handleSignOut() {
    'use server'
    if (isDemoMode()) return
    const { signOut } = await import('@/actions/auth/sign-out')
    await signOut()
  }

  return (
    <nav className="bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between h-14 items-center">
          <a href="/" className="font-[family-name:var(--font-playfair)] text-xl text-[#111827]">
            Bostadsagent
          </a>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-[#6b7280] hidden sm:block">{user.email}</span>
                {demoMode ? (
                  <Button variant="ghost" size="sm" disabled>
                    Logga ut
                  </Button>
                ) : (
                  <form action={handleSignOut}>
                    <Button variant="ghost" size="sm" type="submit">
                      Logga ut
                    </Button>
                  </form>
                )}
              </>
            ) : (
              <>
                <a href="/auth/sign-in">
                  <Button size="sm">
                    Login
                  </Button>
                </a>
                <a href="/auth/sign-up">
                  <Button variant="outline" size="sm">
                    Sign up for free
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
