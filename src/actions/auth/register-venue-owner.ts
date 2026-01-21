'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function registerVenueOwner(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const companyName = formData.get('companyName') as string
  const orgNumber = formData.get('orgNumber') as string
  const phone = formData.get('phone') as string | null

  // Validate org number format (XXXXXX-XXXX)
  const orgNumberRegex = /^\d{6}-?\d{4}$/
  if (!orgNumberRegex.test(orgNumber)) {
    return redirect('/auth/register/venue?error=' + encodeURIComponent('Ogiltigt organisationsnummer (format: XXXXXX-XXXX)'))
  }

  // Sign up the user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    console.error('Auth error:', authError)
    return redirect('/auth/register/venue?error=' + encodeURIComponent(authError.message))
  }

  if (!authData.user) {
    return redirect('/auth/register/venue?error=' + encodeURIComponent('Failed to create user'))
  }

  // Update the profile with venue owner details
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      user_type: 'venue_owner',
      full_name: fullName,
      company_name: companyName,
      org_number: orgNumber.replace('-', ''),
      phone: phone || null,
    })
    .eq('id', authData.user.id)

  if (profileError) {
    console.error('Profile error:', profileError)
    return redirect('/auth/register/venue?error=' + encodeURIComponent('Failed to update profile'))
  }

  redirect('/dashboard')
}
