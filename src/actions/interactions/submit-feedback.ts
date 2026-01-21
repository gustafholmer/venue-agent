'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitFeedback(listingId: string, feedbackText: string) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase.from('user_interactions').insert({
    user_id: user.id,
    listing_id: listingId,
    action: 'feedback',
    feedback_text: feedbackText,
  })

  if (error) {
    console.error('Error submitting feedback:', error)
    return { error: 'Failed to submit feedback' }
  }

  revalidatePath('/results')
  return { success: true }
}
