import Link from 'next/link'
import { SignUpFormCompany } from '@/components/auth/sign-up-form-company'
import { AuthSkyline } from '@/components/illustrations/auth-skyline'

interface PageProps {
  searchParams: Promise<{ returnUrl?: string }>
}

export default async function SignUpCompanyPage({ searchParams }: PageProps) {
  const { returnUrl } = await searchParams
  const validReturnUrl = returnUrl && returnUrl.startsWith('/') ? returnUrl : null
  const signInLink = validReturnUrl
    ? `/auth/sign-in?returnUrl=${encodeURIComponent(validReturnUrl)}`
    : '/auth/sign-in'

  return (
    <main className="relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6 overflow-hidden">
      <div className="w-full max-w-sm relative z-10">
        <Link href={`/auth/sign-up${validReturnUrl ? `?returnUrl=${encodeURIComponent(validReturnUrl)}` : ''}`} className="inline-flex items-center gap-1 text-sm text-[#78716c] hover:text-[#1a1a1a] mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Tillbaka
        </Link>

        <h1 className="font-[family-name:var(--font-playfair)] text-3xl text-[#1a1a1a] text-center mb-8">
          Skapa konto som företag
        </h1>

        <SignUpFormCompany returnUrl={validReturnUrl} signInLink={signInLink} />
      </div>
      <AuthSkyline className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[48rem] max-w-none opacity-[0.12] pointer-events-none" />
    </main>
  )
}
