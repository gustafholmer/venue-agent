'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { rateLimit, RATE_LIMITS, RATE_LIMIT_ERROR } from '@/lib/rate-limit'

export async function signUp(formData: FormData): Promise<void> {
  // Check rate limit
  const rateLimitResult = await rateLimit('sign-up', RATE_LIMITS.signUp)
  if (!rateLimitResult.success) {
    const returnUrl = formData.get('returnUrl') as string | null
    const validReturnUrl = returnUrl && returnUrl.startsWith('/') ? returnUrl : null
    const errorParams = new URLSearchParams({ error: RATE_LIMIT_ERROR })
    if (validReturnUrl) {
      errorParams.set('returnUrl', validReturnUrl)
    }
    redirect(`/auth/sign-up?${errorParams.toString()}`)
  }

  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const returnUrl = formData.get('returnUrl') as string | null

  // Validate returnUrl - only allow relative URLs (must start with /)
  const validReturnUrl = returnUrl && returnUrl.startsWith('/') ? returnUrl : null

  const { error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    // TODO: Handle error display properly with useFormState
    const errorParams = new URLSearchParams({ error: error.message })
    if (validReturnUrl) {
      errorParams.set('returnUrl', validReturnUrl)
    }
    redirect(`/auth/sign-up?${errorParams.toString()}`)
  }

  redirect(validReturnUrl || '/')
}
