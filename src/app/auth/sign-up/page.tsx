import Link from 'next/link'

interface SignUpPageProps {
  searchParams: Promise<{ returnUrl?: string }>
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { returnUrl } = await searchParams
  const validReturnUrl = returnUrl && returnUrl.startsWith('/') ? returnUrl : null
  const qs = validReturnUrl ? `?returnUrl=${encodeURIComponent(validReturnUrl)}` : ''

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6">
      <div className="w-full max-w-xl">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl text-[#111827] text-center mb-8">
          Skapa konto
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href={`/auth/sign-up/private${qs}`}
            className="flex flex-col items-center gap-3 rounded-xl border border-[#e5e7eb] p-6 text-center hover:border-[#1e3a8a] hover:shadow-md transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="7" r="4" />
              <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
            </svg>
            <span className="text-lg font-semibold text-[#111827]">Privatperson</span>
            <span className="text-sm text-[#6b7280]">Boka lokal som privatperson</span>
          </Link>

          <Link
            href={`/auth/sign-up/company${qs}`}
            className="flex flex-col items-center gap-3 rounded-xl border border-[#e5e7eb] p-6 text-center hover:border-[#1e3a8a] hover:shadow-md transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="7" width="18" height="14" rx="2" />
              <path d="M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2" />
              <path d="M8 11h0" /><path d="M12 11h0" /><path d="M16 11h0" />
              <path d="M8 15h0" /><path d="M12 15h0" /><path d="M16 15h0" />
            </svg>
            <span className="text-lg font-semibold text-[#111827]">Företag</span>
            <span className="text-sm text-[#6b7280]">Boka lokal för ditt företag</span>
          </Link>
        </div>

        <p className="text-center text-sm text-[#6b7280] mt-8">
          Vill du lista din lokal?{' '}
          <Link href="/auth/register/venue" className="text-[#1e3a8a] hover:underline">
            Registrera dig här
          </Link>
        </p>

        <p className="text-center text-sm text-[#6b7280] mt-3">
          Har du redan ett konto?{' '}
          <Link href={`/auth/sign-in${qs}`} className="text-[#1e3a8a] hover:underline">
            Logga in
          </Link>
        </p>
      </div>
    </main>
  )
}
