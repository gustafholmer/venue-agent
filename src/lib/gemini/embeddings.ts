import { getEmbeddingApiKey } from './client'
import { withRetry } from './retry'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const EMBEDDING_MODEL = 'gemini-embedding-001'
const EMBEDDING_DIMENSIONS = 768

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
  const apiKey = getEmbeddingApiKey()
  if (!apiKey) {
    throw new Error('Gemini embedding model is not configured')
  }

  // Check cache
  const cached = embeddingCache.get(text)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.embedding
  }

  const result = await withRetry(async () => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw Object.assign(
        new Error(`Embedding API error: [${response.status} ${response.statusText}] ${errorBody}`),
        { status: response.status, statusText: response.statusText }
      )
    }

    return response.json() as Promise<{ embedding: { values: number[] } }>
  })

  const embedding = result.embedding.values

  // Store in cache
  embeddingCache.set(text, { embedding, timestamp: Date.now() })

  return embedding
}
