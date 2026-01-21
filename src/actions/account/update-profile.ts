'use server'

import { createClient } from '@/lib/supabase/server'
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
    if (data.full_name !== undefined && data.full_name.trim().length === 0) {
      return { success: false, error: 'Namn kan inte vara tomt' }
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: data.full_name?.trim(),
        phone: data.phone?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return { success: false, error: 'Kunde inte uppdatera profilen' }
    }

    revalidatePath('/account')
    revalidatePath('/account/settings')

    return { success: true }
  } catch (error) {
    console.error('Unexpected error updating profile:', error)
    return {
      success: false,
      error: 'Ett ovantat fel uppstod',
    }
  }
}
