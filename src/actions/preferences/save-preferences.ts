'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parsePreferences } from '@/lib/gemini/parse-preferences'
import { generateEmbedding } from '@/lib/gemini/embeddings'
import { revalidatePath } from 'next/cache'

export async function savePreferences(rawInput: string) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  try {
    // Parse preferences with Gemini
    const parsed = await parsePreferences(rawInput)

    // Generate embedding for vibe description
    const embedding = parsed.vibe_description
      ? await generateEmbedding(parsed.vibe_description)
      : null

    // Use service client to bypass RLS for upsert
    const serviceClient = createServiceClient()

    const { error } = await serviceClient
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        raw_input: rawInput,
        parsed_filters: parsed.filters,
        vibe_description: parsed.vibe_description,
        embedding: embedding ? `[${embedding.join(',')}]` : null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (error) {
      console.error('Error saving preferences:', error)
      return { error: 'Failed to save preferences' }
    }

    revalidatePath('/results')
    return { success: true, parsed }
  } catch (err) {
    console.error('Error in savePreferences:', err)
    return { error: 'Failed to process preferences' }
  }
}
