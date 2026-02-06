import { SignUpFormCompany } from '@/components/auth/sign-up-form-company'

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
    <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl text-[#111827] text-center mb-8">
          Skapa konto som företag
        </h1>

        <SignUpFormCompany returnUrl={validReturnUrl} signInLink={signInLink} />
      </div>
    </main>
  )
}
