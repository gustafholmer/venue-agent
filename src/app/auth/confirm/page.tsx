import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AuthSkyline } from '@/components/illustrations/auth-skyline'

interface ConfirmPageProps {
  searchParams: Promise<{ token_hash?: string; type?: string }>
}

export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const { token_hash, type } = await searchParams

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'signup' | 'email',
    })

    if (!error) {
      redirect('/')
    }

    // Verification failed — show error
    return (
      <main className="relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6 overflow-hidden">
        <div className="w-full max-w-sm text-center relative z-10">
          <h1 className="font-[family-name:var(--font-heading)] text-3xl text-[#1a1a1a] mb-4">
            Verifiering misslyckades
          </h1>
          <p className="text-[#78716c] mb-8">
            Länken kan ha gått ut. Försök registrera dig igen eller kontakta support.
          </p>
          <a
            href="/auth/sign-up"
            className="text-[#c45a3b] hover:underline text-sm"
          >
            Tillbaka till registrering
          </a>
        </div>
        <AuthSkyline className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[48rem] max-w-none opacity-[0.12] pointer-events-none" />
      </main>
    )
  }

  // No token — show the "check your email" message
  return (
    <main className="relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6 overflow-hidden">
      <div className="w-full max-w-sm text-center relative z-10">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl text-[#1a1a1a] mb-4">
          Kolla din e-post
        </h1>
        <p className="text-[#78716c] mb-8">
          Vi har skickat en bekräftelselänk till din e-postadress. Klicka på länken för att aktivera ditt konto.
        </p>
        <a
          href="/auth/sign-in"
          className="text-[#c45a3b] hover:underline text-sm"
        >
          Tillbaka till inloggning
        </a>
      </div>
      <AuthSkyline className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[48rem] max-w-none opacity-[0.12] pointer-events-none" />
    </main>
  )
}
