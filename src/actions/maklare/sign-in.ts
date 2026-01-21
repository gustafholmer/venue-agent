'use server'

import { redirect } from 'next/navigation'

export async function signInMaklare(formData: FormData) {
  const { isDemoMode } = await import('@/lib/demo-mode')

  // In demo mode, just redirect to dashboard
  if (isDemoMode()) {
    return redirect('/maklare/dashboard')
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect('/maklare/sign-in?error=invalid_credentials')
  }

  return redirect('/maklare/dashboard')
}
