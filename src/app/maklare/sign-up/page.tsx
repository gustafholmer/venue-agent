import { signUpMaklare } from '@/actions/maklare/sign-up'
import { Button } from '@/components/ui/button'

export default function MaklareSignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-[#f9fafb]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl text-[#111827] mb-2">
            Bli partner
          </h1>
          <p className="text-[#6b7280]">
            Få kvalificerade köpare direkt till dina objekt
          </p>
        </div>

        <form action={signUpMaklare} className="bg-white border border-[#e5e7eb] rounded-xl p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm text-[#374151] mb-1.5">
              Namn
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Ditt namn"
              className="w-full h-11 px-4 border border-[#e5e7eb] rounded-lg text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
            />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm text-[#374151] mb-1.5">
              Företag/Byrå
            </label>
            <input
              id="company"
              name="company"
              type="text"
              placeholder="Mäklarfirma AB"
              className="w-full h-11 px-4 border border-[#e5e7eb] rounded-lg text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm text-[#374151] mb-1.5">
              E-post
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="namn@maklare.se"
              className="w-full h-11 px-4 border border-[#e5e7eb] rounded-lg text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm text-[#374151] mb-1.5">
              Telefon
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="070-123 45 67"
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
              minLength={6}
              placeholder="Minst 6 tecken"
              className="w-full h-11 px-4 border border-[#e5e7eb] rounded-lg text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1e3a8a]"
            />
          </div>

          <Button type="submit" className="w-full">
            Skapa konto
          </Button>
        </form>

        <p className="text-center text-sm text-[#6b7280] mt-6">
          Redan partner?{' '}
          <a href="/maklare/sign-in" className="text-[#1e3a8a] hover:underline">
            Logga in
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
