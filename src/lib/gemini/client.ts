import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai'
import { serverEnv } from '@/lib/env'

let _genAI: GoogleGenerativeAI | null = null
let _initialized = false

function getApiKey(): string {
  return serverEnv.GEMINI_API_KEY
}

// Check if Gemini is properly configured
export function isGeminiConfigured(): boolean {
  const key = getApiKey()
  return Boolean(key && key !== 'your_gemini_api_key')
}

function ensureInitialized(): GoogleGenerativeAI | null {
  if (!_initialized) {
    _initialized = true
    if (isGeminiConfigured()) {
      _genAI = new GoogleGenerativeAI(getApiKey())
    }
  }
  return _genAI
}

export function getGenAI(): GoogleGenerativeAI | null {
  return ensureInitialized()
}

export function getGeminiModel(): GenerativeModel | null {
  const ai = ensureInitialized()
  return ai?.getGenerativeModel({ model: 'gemini-2.5-flash' }) ?? null
}

export function getEmbeddingApiKey(): string | null {
  if (!isGeminiConfigured()) return null
  return getApiKey()
}
