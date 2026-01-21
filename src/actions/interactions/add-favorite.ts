'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addFavorite(listingId: string) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase.from('user_interactions').insert({
    user_id: user.id,
    listing_id: listingId,
    action: 'favorite',
  })

  if (error) {
    console.error('Error adding favorite:', error)
    return { error: 'Failed to add favorite' }
  }

  revalidatePath('/results')
  return { success: true }
}
