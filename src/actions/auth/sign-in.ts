'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { rateLimit, RATE_LIMITS, RATE_LIMIT_ERROR } from '@/lib/rate-limit'

export type SignInState = {
  error: string | null
}

export async function signIn(
  prevState: SignInState,
  formData: FormData
): Promise<SignInState> {
  // Check rate limit
  const rateLimitResult = await rateLimit('sign-in', RATE_LIMITS.signIn)
  if (!rateLimitResult.success) {
    return { error: RATE_LIMIT_ERROR }
  }

  try {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const returnUrl = formData.get('returnUrl') as string | null

    // Validate returnUrl - only allow relative URLs (must start with /)
    const validReturnUrl = returnUrl && returnUrl.startsWith('/') ? returnUrl : null

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message === 'Email not confirmed') {
        return { error: 'E-postadressen är inte verifierad ännu. Kolla din inkorg och klicka på bekräftelselänken.' }
      }
      return { error: 'Felaktig e-post eller lösenord.' }
    }

    redirect(validReturnUrl || '/')
  } catch (error) {
    if (isRedirectError(error)) throw error
    console.error('Sign in error:', error)
    return { error: 'Ett oväntat fel uppstod' }
  }
}
