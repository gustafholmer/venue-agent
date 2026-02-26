'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { rateLimit, RATE_LIMITS, RATE_LIMIT_ERROR } from '@/lib/rate-limit'

export type FieldErrors = Record<string, string>

export type SignUpState = {
  fieldErrors: FieldErrors
  formError: string | null
  fields?: Record<string, string>
}

export async function signUp(
  prevState: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  // Check rate limit
  const rateLimitResult = await rateLimit('sign-up', RATE_LIMITS.signUp)
  if (!rateLimitResult.success) {
    return { fieldErrors: {}, formError: RATE_LIMIT_ERROR }
  }

  try {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const accountType = formData.get('accountType') as string
    const fullName = (formData.get('fullName') || formData.get('contactPerson')) as string
    const phone = formData.get('phone') as string | null
    const companyName = formData.get('companyName') as string | null
    const orgNumber = formData.get('orgNumber') as string | null

    const fields: Record<string, string> = {
      email: email || '',
      fullName: fullName || '',
      phone: phone || '',
      ...(accountType === 'company' && {
        companyName: companyName || '',
        orgNumber: orgNumber || '',
      }),
    }

    const fieldErrors: FieldErrors = {}

    if (!fullName) fieldErrors.fullName = 'Namn krävs.'
    if (accountType === 'company') {
      if (!companyName) fieldErrors.companyName = 'Företagsnamn krävs.'
      if (!orgNumber) {
        fieldErrors.orgNumber = 'Organisationsnummer krävs.'
      } else {
        const orgNumberRegex = /^\d{6}-?\d{4}$/
        if (!orgNumberRegex.test(orgNumber)) {
          fieldErrors.orgNumber = 'Ogiltigt format. Ange t.ex. 556123-4567.'
        }
      }
    }
    if (!email) fieldErrors.email = 'E-post krävs.'
    if (!password) {
      fieldErrors.password = 'Lösenord krävs.'
    } else {
      const pwErrors: string[] = []
      if (password.length < 8) pwErrors.push('minst 8 tecken')
      if (!/[A-Z]/.test(password)) pwErrors.push('en versal')
      if (!/\d/.test(password)) pwErrors.push('en siffra')
      if (pwErrors.length > 0) {
        fieldErrors.password = `Lösenordet behöver ${pwErrors.join(', ')}.`
      }
    }

    if (Object.keys(fieldErrors).length > 0) return { fieldErrors, formError: null, fields }

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
      return { fieldErrors: {}, formError: error.message, fields }
    }

    if (authData.user) {
      const serviceClient = createServiceClient()

      const profileData: Record<string, string | string[] | null> = {
        full_name: fullName,
        phone: phone || null,
      }

      if (accountType === 'company') {
        profileData.company_name = companyName!
        profileData.org_number = orgNumber!
        profileData.roles = ['customer', 'venue_owner']
      } else {
        profileData.roles = ['customer']
      }

      const { error: profileError } = await serviceClient
        .from('profiles')
        .upsert({ id: authData.user.id, email, ...profileData }, { onConflict: 'id' })

      if (profileError) {
        logger.error('Profile update error', { profileError })
      }
    }

    redirect('/auth/confirm')
  } catch (error) {
    if (isRedirectError(error)) throw error
    logger.error('Sign up error', { error })
    return { fieldErrors: {}, formError: 'Ett oväntat fel uppstod' }
  }
}
