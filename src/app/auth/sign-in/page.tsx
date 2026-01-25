import { signIn } from '@/actions/auth/sign-in'
import { Button } from '@/components/ui/button'

interface SignInPageProps {
  searchParams: Promise<{ returnUrl?: string }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { returnUrl } = await searchParams
  // Validate returnUrl - only allow relative URLs (must start with /)
  const validReturnUrl = returnUrl && returnUrl.startsWith('/') ? returnUrl : null
  const signUpLink = validReturnUrl
    ? `/auth/sign-up?returnUrl=${encodeURIComponent(validReturnUrl)}`
    : '/auth/sign-up'

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl text-[#111827] text-center mb-8">Välkommen tillbaka</h1>

        <form action={signIn} className="space-y-4">
          {validReturnUrl && (
            <input type="hidden" name="returnUrl" value={validReturnUrl} />
          )}
          <div>
            <label htmlFor="email" className="block text-sm text-[#374151] mb-1.5">
              E-post
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="namn@exempel.se"
              className="w-full h-11 px-4 border border-[#e5e7eb] rounded-xl text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-[#374151] mb-1.5">
              Lösenord
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full h-11 px-4 border border-[#e5e7eb] rounded-xl text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
            />
          </div>

          <Button type="submit" className="w-full">
            Logga in
          </Button>
        </form>

        <p className="text-center text-sm text-[#6b7280] mt-6">
          Inget konto?{' '}
          <a href={signUpLink} className="text-[#1e3a8a] hover:underline">
            Skapa ett här
          </a>
        </p>
      </div>
    </main>
  )
}
