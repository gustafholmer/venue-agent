import { genAI } from './client'

const embeddingModel = genAI?.getGenerativeModel({ model: 'text-embedding-004' }) || null

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!embeddingModel) {
    throw new Error('Gemini API key not configured')
  }
  const result = await embeddingModel.embedContent(text)
  return result.embedding.values
}

export async function generateListingEmbedding(listing: {
  title: string
  description: string
  features: string[]
}): Promise<number[]> {
  const text = `${listing.title}\n${listing.description}\n${listing.features.join(', ')}`
  return generateEmbedding(text)
}
