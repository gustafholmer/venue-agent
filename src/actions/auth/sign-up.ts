'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
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

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'E-post och lösenord krävs.' }
  }

  if (password.length < 8) {
    return { error: 'Lösenordet måste vara minst 8 tecken.' }
  }

  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get('origin') || 'http://localhost:3000'

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/auth/confirm')
}
