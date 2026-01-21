'use server'

import { redirect } from 'next/navigation'

export async function signUpMaklare(formData: FormData) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const company = formData.get('company') as string
  const phone = formData.get('phone') as string

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError || !authData.user) {
    return redirect('/maklare/sign-up?error=signup_failed')
  }

  // Create mäklare profile
  const { error: profileError } = await supabase
    .from('maklare')
    .insert({
      user_id: authData.user.id,
      email,
      name,
      company,
      phone,
    })

  if (profileError) {
    return redirect('/maklare/sign-up?error=profile_failed')
  }

  return redirect('/maklare/dashboard')
}
