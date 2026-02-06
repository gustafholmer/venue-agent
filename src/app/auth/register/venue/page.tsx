import Link from 'next/link'
import { registerVenueOwner } from '@/actions/auth/register-venue-owner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function VenueOwnerRegistrationPage({ searchParams }: PageProps) {
  const params = await searchParams
  const error = params.error

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#111827] mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Tillbaka
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-[#111827]">
            Lista din lokal
          </h1>
          <p className="text-[#6b7280] mt-2">
            Skapa ett konto för att börja ta emot bokningar
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
            {decodeURIComponent(error)}
          </div>
        )}

        <form action={registerVenueOwner} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-[#374151] mb-1">
              Ditt namn *
            </label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              required
              placeholder="Anna Andersson"
            />
          </div>

          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-[#374151] mb-1">
              Företagsnamn *
            </label>
            <Input
              id="companyName"
              name="companyName"
              type="text"
              required
              placeholder="AB Eventlokal"
            />
          </div>

          <div>
            <label htmlFor="orgNumber" className="block text-sm font-medium text-[#374151] mb-1">
              Organisationsnummer *
            </label>
            <Input
              id="orgNumber"
              name="orgNumber"
              type="text"
              required
              placeholder="556123-4567"
              maxLength={11}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#374151] mb-1">
              E-post *
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="anna@eventlokal.se"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-[#374151] mb-1">
              Telefon
            </label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="070-123 45 67"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#374151] mb-1">
              Lösenord *
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Minst 8 tecken"
            />
          </div>

          <Button type="submit" className="w-full mt-6">
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
