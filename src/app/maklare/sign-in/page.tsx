import { signInMaklare } from '@/actions/maklare/sign-in'
import { Button } from '@/components/ui/button'
import { isDemoMode } from '@/lib/demo-mode'

export default function MaklareSignInPage() {
  const demoMode = isDemoMode()

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-[#f9fafb]">
      <div className="w-full max-w-sm">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl text-[#111827] text-center mb-8">
          Mäklarportal
        </h1>

        <form action={signInMaklare} className="bg-white border border-[#e5e7eb] rounded-xl p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-[#374151] mb-1.5">
              E-post
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={demoMode ? 'maklare@test.com' : ''}
              placeholder="namn@maklare.se"
              className="w-full h-11 px-4 border border-[#e5e7eb] rounded-lg text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
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
              defaultValue={demoMode ? 'test' : ''}
              placeholder="••••••••"
              className="w-full h-11 px-4 border border-[#e5e7eb] rounded-lg text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
            />
          </div>

          <Button type="submit" className="w-full">
            Logga in
          </Button>
        </form>

        <p className="text-center text-sm text-[#6b7280] mt-6">
          Inte partner än?{' '}
          <a href="/maklare/sign-up" className="text-[#1e3a8a] hover:underline">
            Bli partner
          </a>
        </p>

        <p className="text-center text-sm text-[#9ca3af] mt-4">
          <a href="/" className="hover:underline">
            ← Tillbaka till startsidan
          </a>
        </p>
      </div>
    </main>
  )
}
