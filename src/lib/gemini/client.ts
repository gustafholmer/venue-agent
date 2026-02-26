import { GoogleGenerativeAI } from '@google/generative-ai'
import { serverEnv } from '@/lib/env'

const apiKey = serverEnv.GEMINI_API_KEY

// Check if Gemini is properly configured
export function isGeminiConfigured(): boolean {
  return Boolean(apiKey && apiKey !== 'your_gemini_api_key')
}

const genAI = isGeminiConfigured() ? new GoogleGenerativeAI(apiKey) : null

export const geminiModel = genAI?.getGenerativeModel({ model: 'gemini-1.5-flash' }) || null
export const embeddingModel = genAI?.getGenerativeModel({ model: 'text-embedding-004' }) || null

export { genAI }
