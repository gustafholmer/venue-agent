'use server'

import { trackEvent } from '@/lib/analytics'
import { parseVenueFormData, venueFormSchema } from '@/lib/validation/schemas'

export async function createVenue(formData: FormData): Promise<{ success: boolean; venueId?: string; error?: string }> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const { isDemoMode } = await import('@/lib/demo-mode')

    if (isDemoMode()) {
      return { success: true, venueId: 'demo' }
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Verify user is a venue owner
    const { data: profile } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.roles.includes('venue_owner')) {
      return { success: false, error: 'Ej behörig' }
    }

    // Parse and validate form data
    const rawData = parseVenueFormData(formData)
    const parsed = venueFormSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: 'Ogiltiga uppgifter' }
    }
    const data = parsed.data

    // Generate embedding for description if available
    let descriptionEmbedding: number[] | null = null
    if (data.description) {
      try {
        const { generateEmbedding } = await import('@/lib/gemini/embeddings')
        const embeddingText = `${data.name}\n${data.description}\n${data.venue_types.join(', ')}\n${data.vibes.join(', ')}\n${data.amenities.join(', ')}`
        descriptionEmbedding = await generateEmbedding(embeddingText)
      } catch (error) {
        console.error('Error generating embedding:', error)
        // Continue without embedding
      }
    }

    // Create venue with draft status
    const { data: newVenue, error } = await supabase
      .from('venues')
      .insert({
        owner_id: user.id,
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
        status: 'draft',
        description_embedding: descriptionEmbedding,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating venue:', error)
      return { success: false, error: 'Kunde inte skapa lokalen' }
    }

    trackEvent('venue_listed', {}, user.id)

    return { success: true, venueId: newVenue.id }
  } catch (error) {
    console.error('Error creating venue:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
