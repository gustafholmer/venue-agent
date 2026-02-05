'use server'

import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo-mode'
import { revalidatePath } from 'next/cache'
import { trackEvent } from '@/lib/analytics'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function uploadPhoto(formData: FormData) {
  if (isDemoMode()) {
    return { success: false, error: 'Demo mode - uploads disabled' }
  }

  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Ej inloggad' }
  }

  // Get venue owned by user
  const { data: venue } = await supabase
    .from('venues')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!venue) {
    return { success: false, error: 'Ingen lokal hittad' }
  }

  // Get file from form data
  const file = formData.get('file') as File | null
  if (!file) {
    return { success: false, error: 'Ingen fil vald' }
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: 'Ogiltigt filformat. Tillaten: JPG, PNG, WebP' }
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: 'Filen ar for stor. Max 5MB.' }
  }

  // Generate unique ID for photo
  const photoId = crypto.randomUUID()
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const storagePath = `${venue.id}/${photoId}.${extension}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('venue-photos')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return { success: false, error: 'Kunde inte ladda upp filen' }
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('venue-photos')
    .getPublicUrl(storagePath)

  // Get current max sort order
  const { data: existingPhotos } = await supabase
    .from('venue_photos')
    .select('sort_order')
    .eq('venue_id', venue.id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextSortOrder = existingPhotos && existingPhotos.length > 0
    ? existingPhotos[0].sort_order + 1
    : 0

  // Check if this is the first photo (make it primary)
  const { count: photoCount } = await supabase
    .from('venue_photos')
    .select('*', { count: 'exact', head: true })
    .eq('venue_id', venue.id)

  const isPrimary = photoCount === 0

  // Create entry in venue_photos table
  const { error: dbError } = await supabase
    .from('venue_photos')
    .insert({
      id: photoId,
      venue_id: venue.id,
      url: publicUrl,
      sort_order: nextSortOrder,
      is_primary: isPrimary,
    })

  if (dbError) {
    console.error('Database insert error:', dbError)
    // Try to clean up uploaded file
    await supabase.storage.from('venue-photos').remove([storagePath])
    return { success: false, error: 'Kunde inte spara bildinformation' }
  }

  revalidatePath('/dashboard/venue/photos')
  trackEvent('venue_photo_uploaded', { venue_id: venue.id }, user.id)
  return { success: true, photoId }
}
