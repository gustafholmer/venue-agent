import Link from 'next/link'
import { SignUpFormPrivate } from '@/components/auth/sign-up-form-private'

interface PageProps {
  searchParams: Promise<{ returnUrl?: string }>
}

export default async function SignUpPrivatePage({ searchParams }: PageProps) {
  const { returnUrl } = await searchParams
  const validReturnUrl = returnUrl && returnUrl.startsWith('/') ? returnUrl : null
  const signInLink = validReturnUrl
    ? `/auth/sign-in?returnUrl=${encodeURIComponent(validReturnUrl)}`
    : '/auth/sign-in'

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href={`/auth/sign-up${validReturnUrl ? `?returnUrl=${encodeURIComponent(validReturnUrl)}` : ''}`} className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#111827] mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Tillbaka
        </Link>

        <h1 className="font-[family-name:var(--font-playfair)] text-3xl text-[#111827] text-center mb-8">
          Skapa konto som privatperson
        </h1>

        <SignUpFormPrivate returnUrl={validReturnUrl} signInLink={signInLink} />
      </div>
    </main>
  )
}
