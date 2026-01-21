import { signUp } from '@/actions/auth/sign-up'
import { Button } from '@/components/ui/button'

export default function SignUpPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl text-[#111827] text-center mb-8">Skapa konto</h1>

        <form action={signUp} className="space-y-4">
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
              minLength={6}
              placeholder="Minst 6 tecken"
              className="w-full h-11 px-4 border border-[#e5e7eb] rounded-xl text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
            />
          </div>

          <Button type="submit" className="w-full">
            Skapa konto
          </Button>
        </form>

        <p className="text-center text-sm text-[#6b7280] mt-6">
          Har du redan ett konto?{' '}
          <a href="/auth/sign-in" className="text-[#1e3a8a] hover:underline">
            Logga in
          </a>
        </p>
      </div>
    </main>
  )
}
