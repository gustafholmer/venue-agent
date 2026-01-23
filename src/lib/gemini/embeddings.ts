import { embeddingModel } from './client'

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!embeddingModel) {
    throw new Error('Gemini embedding model is not configured')
  }

  const result = await embeddingModel.embedContent(text)
  return result.embedding.values
}
