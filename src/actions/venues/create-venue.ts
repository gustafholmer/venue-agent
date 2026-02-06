'use server'

import { redirect } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'

export async function createVenue(formData: FormData) {
  const { createClient } = await import('@/lib/supabase/server')
  const { isDemoMode } = await import('@/lib/demo-mode')

  if (isDemoMode()) {
    return redirect('/dashboard/venue?success=demo')
  }

  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return redirect('/auth/sign-in')
  }

  // Verify user is a venue owner
  const { data: profile } = await supabase
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.roles.includes('venue_owner')) {
    return redirect('/')
  }

  // Parse form data
  const name = formData.get('name') as string
  const description = formData.get('description') as string || null
  const address = formData.get('address') as string
  const city = formData.get('city') as string || 'Stockholm'
  const area = formData.get('area') as string || null

  // Parse venue types (checkboxes)
  const venueTypes = formData.getAll('venue_types') as string[]

  // Parse vibes (checkboxes)
  const vibes = formData.getAll('vibes') as string[]

  // Parse capacity
  const capacityStanding = formData.get('capacity_standing')
    ? parseInt(formData.get('capacity_standing') as string)
    : null
  const capacitySeated = formData.get('capacity_seated')
    ? parseInt(formData.get('capacity_seated') as string)
    : null
  const capacityConference = formData.get('capacity_conference')
    ? parseInt(formData.get('capacity_conference') as string)
    : null
  const minGuests = formData.get('min_guests')
    ? parseInt(formData.get('min_guests') as string)
    : 1

  // Parse pricing
  const pricePerHour = formData.get('price_per_hour')
    ? parseInt(formData.get('price_per_hour') as string)
    : null
  const priceHalfDay = formData.get('price_half_day')
    ? parseInt(formData.get('price_half_day') as string)
    : null
  const priceFullDay = formData.get('price_full_day')
    ? parseInt(formData.get('price_full_day') as string)
    : null
  const priceEvening = formData.get('price_evening')
    ? parseInt(formData.get('price_evening') as string)
    : null
  const priceNotes = formData.get('price_notes') as string || null

  // Parse amenities (checkboxes)
  const amenities = formData.getAll('amenities') as string[]

  // Parse contact info
  const contactEmail = formData.get('contact_email') as string || null
  const contactPhone = formData.get('contact_phone') as string || null
  const website = formData.get('website') as string || null

  // Generate embedding for description if available
  let descriptionEmbedding: number[] | null = null
  if (description) {
    try {
      const { generateEmbedding } = await import('@/lib/gemini/embeddings')
      const embeddingText = `${name}\n${description}\n${venueTypes.join(', ')}\n${vibes.join(', ')}\n${amenities.join(', ')}`
      descriptionEmbedding = await generateEmbedding(embeddingText)
    } catch (error) {
      console.error('Error generating embedding:', error)
      // Continue without embedding
    }
  }

  // Create venue with draft status
  const { error } = await supabase
    .from('venues')
    .insert({
      owner_id: user.id,
      name,
      description,
      address,
      city,
      area,
      venue_types: venueTypes,
      vibes,
      capacity_standing: capacityStanding,
      capacity_seated: capacitySeated,
      capacity_conference: capacityConference,
      min_guests: minGuests,
      price_per_hour: pricePerHour,
      price_half_day: priceHalfDay,
      price_full_day: priceFullDay,
      price_evening: priceEvening,
      price_notes: priceNotes,
      amenities,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      website,
      status: 'draft',
      description_embedding: descriptionEmbedding,
    })

  if (error) {
    console.error('Error creating venue:', error)
    return redirect('/dashboard/venue/new?error=create_failed')
  }

  trackEvent('venue_listed', {}, user.id)

  return redirect('/dashboard/venue?success=venue_created')
}
