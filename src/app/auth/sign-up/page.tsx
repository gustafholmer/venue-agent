import { SignUpForm } from '@/components/auth/sign-up-form'

interface SignUpPageProps {
  searchParams: Promise<{ returnUrl?: string }>
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { returnUrl } = await searchParams
  // Validate returnUrl - only allow relative URLs (must start with /)
  const validReturnUrl = returnUrl && returnUrl.startsWith('/') ? returnUrl : null
  const signInLink = validReturnUrl
    ? `/auth/sign-in?returnUrl=${encodeURIComponent(validReturnUrl)}`
    : '/auth/sign-in'

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl text-[#111827] text-center mb-8">Skapa konto</h1>
        <SignUpForm returnUrl={validReturnUrl} signInLink={signInLink} />
      </div>
    </main>
  )
}
