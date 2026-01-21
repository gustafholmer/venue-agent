'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUp(formData: FormData): Promise<void> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    // TODO: Handle error display properly with useFormState
    redirect(`/auth/sign-up?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/')
}
