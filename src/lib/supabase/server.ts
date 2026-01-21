import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isDemoMode } from '@/lib/demo-mode'

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

export async function createClient() {
  const cookieStore = await cookies()

  // Use placeholder values if not configured to prevent crash
  // The caller should check isDemoMode() first
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component
          }
        },
      },
    }
  )
}

// Safe client that returns null if not configured
export async function createClientIfConfigured() {
  if (!isSupabaseConfigured() || isDemoMode()) {
    return null
  }
  return createClient()
}
