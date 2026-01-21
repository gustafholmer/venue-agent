'use server'

import { redirect } from 'next/navigation'

export async function createListing(formData: FormData) {
  const { createClient } = await import('@/lib/supabase/server')
  const { isDemoMode } = await import('@/lib/demo-mode')

  if (isDemoMode()) {
    return redirect('/maklare/dashboard?success=demo')
  }

  const supabase = await createClient()

  // Get current user and their mäklare profile
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return redirect('/maklare/sign-in')
  }

  const { data: maklare } = await supabase
    .from('maklare')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!maklare) {
    return redirect('/maklare/sign-up')
  }

  // Parse form data
  const address = formData.get('address') as string
  const district = formData.get('district') as string
  const price = parseInt(formData.get('price') as string)
  const rooms = parseFloat(formData.get('rooms') as string)
  const area_sqm = parseInt(formData.get('area_sqm') as string)
  const description = formData.get('description') as string
  const monthly_fee = formData.get('monthly_fee') ? parseInt(formData.get('monthly_fee') as string) : null
  const year_built = formData.get('year_built') ? parseInt(formData.get('year_built') as string) : null
  const features = (formData.get('features') as string)?.split(',').map(f => f.trim()).filter(Boolean) || []
  const public_date = formData.get('public_date') as string || null

  // Create listing
  const { error } = await supabase
    .from('listings')
    .insert({
      maklare_id: maklare.id,
      title: `${rooms} rum på ${address}`,
      address,
      district,
      city: 'Stockholm',
      price,
      rooms,
      area_sqm,
      description,
      monthly_fee,
      year_built,
      features,
      status: 'early_access',
      public_date: public_date || null,
    })

  if (error) {
    console.error('Error creating listing:', error)
    return redirect('/maklare/listings/new?error=create_failed')
  }

  return redirect('/maklare/dashboard?success=listing_created')
}
