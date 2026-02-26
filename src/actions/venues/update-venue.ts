'use server'

import { logger } from '@/lib/logger'

import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { parseVenueFormData, venueFormSchema, uuidSchema } from '@/lib/validation/schemas'

export async function updateVenue(venueId: string, formData: FormData) {
  try {
    // Validate venueId
    const idResult = uuidSchema.safeParse(venueId)
    if (!idResult.success) {
      return redirect('/dashboard?error=invalid_id')
    }

    const { createClient } = await import('@/lib/supabase/server')
    const { isDemoMode } = await import('@/lib/demo-mode')

    if (isDemoMode()) {
      return redirect(`/dashboard/venue/${venueId}?success=demo`)
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return redirect('/auth/sign-in')
    }

    // Verify user owns the venue
    const { data: existingVenue } = await supabase
      .from('venues')
      .select('id, description')
      .eq('id', venueId)
      .eq('owner_id', user.id)
      .single()

    if (!existingVenue) {
      return redirect('/dashboard?error=no_venue')
    }

    // Parse and validate form data
    const rawData = parseVenueFormData(formData)
    const parsed = venueFormSchema.safeParse(rawData)
    if (!parsed.success) {
      return redirect(`/dashboard/venue/${venueId}?error=invalid_data`)
    }
    const data = parsed.data

    // Re-generate embedding if description changed
    let descriptionEmbedding: number[] | null = null
    const descriptionChanged = data.description !== existingVenue.description
    if (data.description && descriptionChanged) {
      try {
        const { generateEmbedding } = await import('@/lib/gemini/embeddings')
        const embeddingText = `${data.name}\n${data.description}\n${data.venue_types.join(', ')}\n${data.vibes.join(', ')}\n${data.amenities.join(', ')}`
        descriptionEmbedding = await generateEmbedding(embeddingText)
      } catch (error) {
        logger.error('Error generating embedding', { error })
        // Continue without updating embedding
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      name: data.name,
      description: data.description,
      address: data.address,
      city: data.city,
      area: data.area,
      venue_types: data.venue_types,
      vibes: data.vibes,
      capacity_standing: data.capacity_standing,
      capacity_seated: data.capacity_seated,
      capacity_conference: data.capacity_conference,
      min_guests: data.min_guests,
      price_per_hour: data.price_per_hour,
      price_half_day: data.price_half_day,
      price_full_day: data.price_full_day,
      price_evening: data.price_evening,
      price_notes: data.price_notes,
      amenities: data.amenities,
      contact_email: data.contact_email,
      contact_phone: data.contact_phone,
      website: data.website,
      updated_at: new Date().toISOString(),
    }

    // Only update embedding if it was regenerated
    if (descriptionEmbedding) {
      updateData.description_embedding = descriptionEmbedding
    }

    // Update venue
    const { error } = await supabase
      .from('venues')
      .update(updateData)
      .eq('id', existingVenue.id)

    if (error) {
      logger.error('Error updating venue', { error })
      return redirect(`/dashboard/venue/${venueId}?error=update_failed`)
    }

    return redirect(`/dashboard/venue/${venueId}?success=venue_updated`)
  } catch (error) {
    if (isRedirectError(error)) throw error
    logger.error('Error updating venue', { error })
    return redirect(`/dashboard/venue/${venueId}?error=update_failed`)
  }
}
