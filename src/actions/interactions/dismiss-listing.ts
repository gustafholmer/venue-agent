'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function dismissListing(listingId: string) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase.from('user_interactions').insert({
    user_id: user.id,
    listing_id: listingId,
    action: 'dismiss',
  })

  if (error) {
    console.error('Error dismissing listing:', error)
    return { error: 'Failed to dismiss listing' }
  }

  revalidatePath('/results')
  return { success: true }
}
