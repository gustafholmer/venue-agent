'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signIn(formData: FormData): Promise<void> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // TODO: Handle error display properly with useFormState
    redirect(`/auth/sign-in?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/')
}
