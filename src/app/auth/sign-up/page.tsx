import Link from 'next/link'
import { AuthSkyline } from '@/components/illustrations/auth-skyline'

interface SignUpPageProps {
  searchParams: Promise<{ returnUrl?: string }>
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { returnUrl } = await searchParams
  const validReturnUrl = returnUrl && returnUrl.startsWith('/') ? returnUrl : null
  const qs = validReturnUrl ? `?returnUrl=${encodeURIComponent(validReturnUrl)}` : ''

  return (
    <main className="relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6 overflow-hidden">
      <div className="w-full max-w-xl relative z-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-[#78716c] hover:text-[#1a1a1a] mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Tillbaka
        </Link>

        <h1 className="font-[family-name:var(--font-playfair)] text-3xl text-[#1a1a1a] text-center mb-8">
          Skapa konto
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href={`/auth/sign-up/private${qs}`}
            className="flex flex-col items-center gap-3 rounded-xl border border-[#e7e5e4] p-6 text-center hover:border-[#c45a3b] hover:shadow-md transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#c45a3b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="7" r="4" />
              <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
            </svg>
            <span className="text-lg font-semibold text-[#1a1a1a]">Privatperson</span>
            <span className="text-sm text-[#78716c]">Boka lokal som privatperson</span>
          </Link>

          <Link
            href={`/auth/sign-up/company${qs}`}
            className="flex flex-col items-center gap-3 rounded-xl border border-[#e7e5e4] p-6 text-center hover:border-[#c45a3b] hover:shadow-md transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#c45a3b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="7" width="18" height="14" rx="2" />
              <path d="M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2" />
              <path d="M8 11h0" /><path d="M12 11h0" /><path d="M16 11h0" />
              <path d="M8 15h0" /><path d="M12 15h0" /><path d="M16 15h0" />
            </svg>
            <span className="text-lg font-semibold text-[#1a1a1a]">Företag</span>
            <span className="text-sm text-[#78716c]">Boka lokal för ditt företag</span>
          </Link>
        </div>

        <p className="text-center text-sm text-[#78716c] mt-8">
          Vill du lista din lokal?{' '}
          <Link href="/auth/sign-up/company" className="text-[#c45a3b] hover:underline">
            Registrera dig som företag
          </Link>
        </p>

        <p className="text-center text-sm text-[#78716c] mt-3">
          Har du redan ett konto?{' '}
          <Link href={`/auth/sign-in${qs}`} className="text-[#c45a3b] hover:underline">
            Logga in
          </Link>
        </p>
      </div>
      <AuthSkyline className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[48rem] max-w-none opacity-[0.12] pointer-events-none" />
    </main>
  )
}
