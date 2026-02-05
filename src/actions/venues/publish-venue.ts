'use server'

import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo-mode'
import { trackEvent } from '@/lib/analytics'

export interface PublishValidationError {
  field: string
  message: string
}

export interface PublishVenueResult {
  success: boolean
  errors?: PublishValidationError[]
}

export async function publishVenue(): Promise<PublishVenueResult> {
  if (isDemoMode()) {
    return { success: true }
  }

  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      success: false,
      errors: [{ field: 'auth', message: 'Du maste vara inloggad' }],
    }
  }

  // Get venue with photos
  const { data: venue } = await supabase
    .from('venues')
    .select(`
      id,
      name,
      address,
      capacity_standing,
      capacity_seated,
      capacity_conference,
      price_per_hour,
      price_half_day,
      price_full_day,
      price_evening
    `)
    .eq('owner_id', user.id)
    .single()

  if (!venue) {
    return {
      success: false,
      errors: [{ field: 'venue', message: 'Ingen lokal hittades' }],
    }
  }

  // Get photos count
  const { count: photoCount } = await supabase
    .from('venue_photos')
    .select('*', { count: 'exact', head: true })
    .eq('venue_id', venue.id)

  // Validate required fields
  const errors: PublishValidationError[] = []

  if (!venue.name || venue.name.trim() === '') {
    errors.push({ field: 'name', message: 'Namn kravs' })
  }

  if (!venue.address || venue.address.trim() === '') {
    errors.push({ field: 'address', message: 'Adress kravs' })
  }

  // At least one capacity field must be filled
  const hasCapacity =
    (venue.capacity_standing && venue.capacity_standing > 0) ||
    (venue.capacity_seated && venue.capacity_seated > 0) ||
    (venue.capacity_conference && venue.capacity_conference > 0)

  if (!hasCapacity) {
    errors.push({ field: 'capacity', message: 'Minst en kapacitet maste anges' })
  }

  // At least one price must be filled
  const hasPrice =
    (venue.price_per_hour && venue.price_per_hour > 0) ||
    (venue.price_half_day && venue.price_half_day > 0) ||
    (venue.price_full_day && venue.price_full_day > 0) ||
    (venue.price_evening && venue.price_evening > 0)

  if (!hasPrice) {
    errors.push({ field: 'price', message: 'Minst ett pris maste anges' })
  }

  // At least one photo required
  if (!photoCount || photoCount === 0) {
    errors.push({ field: 'photos', message: 'Minst en bild kravs' })
  }

  // Return errors if any
  if (errors.length > 0) {
    return { success: false, errors }
  }

  // Publish venue
  const { error } = await supabase
    .from('venues')
    .update({
      status: 'published',
      updated_at: new Date().toISOString(),
    })
    .eq('id', venue.id)

  if (error) {
    console.error('Error publishing venue:', error)
    return {
      success: false,
      errors: [{ field: 'server', message: 'Kunde inte publicera lokalen' }],
    }
  }

  trackEvent('venue_published', { venue_id: venue.id }, user.id)

  return { success: true }
}

export async function getPublishValidation(): Promise<PublishValidationError[]> {
  if (isDemoMode()) {
    return []
  }

  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return [{ field: 'auth', message: 'Du maste vara inloggad' }]
  }

  // Get venue
  const { data: venue } = await supabase
    .from('venues')
    .select(`
      id,
      name,
      address,
      capacity_standing,
      capacity_seated,
      capacity_conference,
      price_per_hour,
      price_half_day,
      price_full_day,
      price_evening
    `)
    .eq('owner_id', user.id)
    .single()

  if (!venue) {
    return [{ field: 'venue', message: 'Ingen lokal hittades' }]
  }

  // Get photos count
  const { count: photoCount } = await supabase
    .from('venue_photos')
    .select('*', { count: 'exact', head: true })
    .eq('venue_id', venue.id)

  // Validate required fields
  const errors: PublishValidationError[] = []

  if (!venue.name || venue.name.trim() === '') {
    errors.push({ field: 'name', message: 'Namn kravs' })
  }

  if (!venue.address || venue.address.trim() === '') {
    errors.push({ field: 'address', message: 'Adress kravs' })
  }

  // At least one capacity field must be filled
  const hasCapacity =
    (venue.capacity_standing && venue.capacity_standing > 0) ||
    (venue.capacity_seated && venue.capacity_seated > 0) ||
    (venue.capacity_conference && venue.capacity_conference > 0)

  if (!hasCapacity) {
    errors.push({ field: 'capacity', message: 'Minst en kapacitet maste anges' })
  }

  // At least one price must be filled
  const hasPrice =
    (venue.price_per_hour && venue.price_per_hour > 0) ||
    (venue.price_half_day && venue.price_half_day > 0) ||
    (venue.price_full_day && venue.price_full_day > 0) ||
    (venue.price_evening && venue.price_evening > 0)

  if (!hasPrice) {
    errors.push({ field: 'price', message: 'Minst ett pris maste anges' })
  }

  // At least one photo required
  if (!photoCount || photoCount === 0) {
    errors.push({ field: 'photos', message: 'Minst en bild kravs' })
  }

  return errors
}
