'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signIn(formData: FormData): Promise<void> {
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
    // TODO: Handle error display properly with useFormState
    const errorParams = new URLSearchParams({ error: error.message })
    if (validReturnUrl) {
      errorParams.set('returnUrl', validReturnUrl)
    }
    redirect(`/auth/sign-in?${errorParams.toString()}`)
  }

  redirect(validReturnUrl || '/')
}
