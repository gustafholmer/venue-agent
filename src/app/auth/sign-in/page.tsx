import { SignInForm } from '@/components/auth/sign-in-form'

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
        <SignInForm returnUrl={validReturnUrl} signUpLink={signUpLink} />
      </div>
    </main>
  )
}
