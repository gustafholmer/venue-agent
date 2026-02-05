import { embeddingModel } from './client'
import { withRetry } from './retry'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

const embeddingCache = new Map<string, { embedding: number[]; timestamp: number }>()

function cleanExpiredEntries() {
  const now = Date.now()
  for (const [key, entry] of embeddingCache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      embeddingCache.delete(key)
    }
  }
}

// Clean up every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanExpiredEntries, CACHE_TTL_MS)
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!embeddingModel) {
    throw new Error('Gemini embedding model is not configured')
  }

  // Check cache
  const cached = embeddingCache.get(text)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.embedding
  }

  const model = embeddingModel
  const result = await withRetry(() => model.embedContent(text))
  const embedding = result.embedding.values

  // Store in cache
  embeddingCache.set(text, { embedding, timestamp: Date.now() })

  return embedding
}
