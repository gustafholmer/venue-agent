'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { rateLimit, RATE_LIMITS, RATE_LIMIT_ERROR } from '@/lib/rate-limit'

export type SignUpState = {
  error: string | null
}

export async function signUp(
  prevState: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  // Check rate limit
  const rateLimitResult = await rateLimit('sign-up', RATE_LIMITS.signUp)
  if (!rateLimitResult.success) {
    return { error: RATE_LIMIT_ERROR }
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
    return { error: error.message }
  }

  redirect(validReturnUrl || '/')
}
