'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
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
  const accountType = formData.get('accountType') as string
  const fullName = (formData.get('fullName') || formData.get('contactPerson')) as string
  const phone = formData.get('phone') as string | null
  const companyName = formData.get('companyName') as string | null
  const orgNumber = formData.get('orgNumber') as string | null

  if (!email || !password) {
    return { error: 'E-post och lösenord krävs.' }
  }

  if (password.length < 8) {
    return { error: 'Lösenordet måste vara minst 8 tecken.' }
  }

  if (!fullName) {
    return { error: 'Namn krävs.' }
  }

  if (accountType === 'company') {
    if (!companyName) {
      return { error: 'Företagsnamn krävs.' }
    }
    if (!orgNumber) {
      return { error: 'Organisationsnummer krävs.' }
    }
  }

  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get('origin') || 'http://localhost:3000'

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (authData.user) {
    const serviceClient = createServiceClient()

    const profileData: Record<string, string | null> = {
      full_name: fullName,
      phone: phone || null,
    }

    if (accountType === 'company') {
      profileData.company_name = companyName!
      profileData.org_number = orgNumber!
    }

    const { error: profileError } = await serviceClient
      .from('profiles')
      .update(profileData)
      .eq('id', authData.user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
    }
  }

  redirect('/auth/confirm')
}
