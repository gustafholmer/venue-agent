'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function removeFavorite(listingId: string) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('user_interactions')
    .delete()
    .eq('user_id', user.id)
    .eq('listing_id', listingId)
    .eq('action', 'favorite')

  if (error) {
    console.error('Error removing favorite:', error)
    return { error: 'Failed to remove favorite' }
  }

  revalidatePath('/results')
  return { success: true }
}
