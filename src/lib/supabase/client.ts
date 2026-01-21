import { createBrowserClient } from '@supabase/ssr'

// Check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return Boolean(
    url &&
    key &&
    url !== 'your_supabase_url' &&
    key !== 'your_supabase_anon_key'
  )
}

export function createClient() {
  // Use placeholder values if not configured to prevent crash
  // The caller should check isSupabaseConfigured() first for safety
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

  return createBrowserClient(url, key)
}

// Safe client that returns null if not configured
export function createClientIfConfigured() {
  if (!isSupabaseConfigured()) {
    return null
  }
  return createClient()
}
