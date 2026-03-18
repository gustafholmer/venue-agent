/**
 * Backfill description_embedding for all venues that are missing one.
 * Run after `supabase db reset` to make semantic search work with seed data.
 *
 * Usage: npx tsx scripts/backfill-embeddings.ts
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const EMBEDDING_MODEL = 'gemini-embedding-001'
const EMBEDDING_DIMENSIONS = 768

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const geminiApiKey = process.env.GEMINI_API_KEY!

if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
  console.error('Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function generateEmbedding(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${geminiApiKey}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIMENSIONS,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Embedding API error: [${response.status}] ${body}`)
  }

  const result = await response.json()
  return result.embedding.values
}

async function main() {
  const { data: venues, error } = await supabase
    .from('venues')
    .select('id, name, description, venue_types, vibes, amenities')
    .is('description_embedding', null)

  if (error) {
    console.error('Failed to fetch venues:', error.message)
    process.exit(1)
  }

  if (!venues || venues.length === 0) {
    console.log('All venues already have embeddings.')
    return
  }

  console.log(`Generating embeddings for ${venues.length} venues...`)

  for (const venue of venues) {
    const parts = [
      venue.name,
      venue.description,
      venue.venue_types?.join(', '),
      venue.vibes?.join(', '),
      venue.amenities?.join(', '),
    ].filter(Boolean)

    const embeddingText = parts.join('\n')

    try {
      const embedding = await generateEmbedding(embeddingText)

      const { error: updateError } = await supabase
        .from('venues')
        .update({ description_embedding: embedding })
        .eq('id', venue.id)

      if (updateError) {
        console.error(`  Failed to update ${venue.name}:`, updateError.message)
      } else {
        console.log(`  ${venue.name} done`)
      }
    } catch (err) {
      console.error(`  Failed to embed ${venue.name}:`, err)
    }
  }

  console.log('Done.')
}

main()
