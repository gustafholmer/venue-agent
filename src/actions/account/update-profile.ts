'use server'

import { logger } from '@/lib/logger'

import { createClient } from '@/lib/supabase/server'
import { updateProfileSchema } from '@/lib/validation/schemas'
import { revalidatePath } from 'next/cache'

interface UpdateProfileData {
  full_name?: string
  phone?: string
}

export async function updateProfile(data: UpdateProfileData): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Validate data
    const parsed = updateProfileSchema.safeParse(data)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Ogiltiga uppgifter'
      return { success: false, error: firstError }
    }
    const validData = parsed.data

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: validData.full_name?.trim(),
        phone: validData.phone?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      logger.error('Error updating profile', { updateError })
      return { success: false, error: 'Kunde inte uppdatera profilen' }
    }

    revalidatePath('/account')
    revalidatePath('/account/settings')

    return { success: true }
  } catch (error) {
    logger.error('Unexpected error updating profile', { error })
    return {
      success: false,
      error: 'Ett ovantat fel uppstod',
    }
  }
}
