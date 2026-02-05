import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/service'
import { isDemoMode } from '@/lib/demo-mode'

// ---------------------------------------------------------------------------
// In-memory fallback (used in demo mode or when DB is unavailable)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitEntry>()
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  lastCleanup = now
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime < now) {
      store.delete(key)
    }
  }
}

function inMemoryRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup()

  const now = Date.now()
  const entry = store.get(identifier)

  // No existing entry or expired entry
  if (!entry || entry.resetTime < now) {
    store.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return {
      success: true,
      remaining: config.limit - 1,
      resetTime: now + config.windowMs,
    }
  }

  // Check if limit exceeded
  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  // Increment count
  entry.count++
  return {
    success: true,
    remaining: config.limit - entry.count,
    resetTime: entry.resetTime,
  }
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Time window in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get client IP address from request headers
 */
export async function getClientIp(): Promise<string> {
  const headersList = await headers()

  // Check common proxy headers
  const forwardedFor = headersList.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = headersList.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Vercel-specific header
  const vercelForwardedFor = headersList.get('x-vercel-forwarded-for')
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim()
  }

  return 'unknown'
}

// ---------------------------------------------------------------------------
// Supabase-backed rate limiting
// ---------------------------------------------------------------------------

async function supabaseRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const supabase = createServiceClient()

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_identifier: identifier,
    p_limit: config.limit,
    p_window_ms: config.windowMs,
  })

  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    // Fall back to in-memory on any DB error
    console.warn('[rate-limit] Supabase RPC failed, falling back to in-memory:', error?.message)
    return inMemoryRateLimit(identifier, config)
  }

  const row = Array.isArray(data) ? data[0] : data

  return {
    success: row.allowed,
    remaining: row.remaining,
    resetTime: new Date(row.reset_at).getTime(),
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Rate limit middleware for API routes.
 * Uses Supabase for persistence across cold starts, with in-memory fallback.
 */
export async function rateLimit(
  endpoint: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const ip = await getClientIp()
  const identifier = `${ip}:${endpoint}`

  if (isDemoMode()) {
    return inMemoryRateLimit(identifier, config)
  }

  return supabaseRateLimit(identifier, config)
}

// ---------------------------------------------------------------------------
// Predefined rate limit configurations
// ---------------------------------------------------------------------------

export const RATE_LIMITS = {
  /** Venue assistant API - 20 requests per minute */
  venueAssistant: { limit: 20, windowMs: 60 * 1000 },

  /** Photo upload API - 10 requests per minute */
  photoUpload: { limit: 10, windowMs: 60 * 1000 },

  /** Booking creation - 5 requests per minute */
  createBooking: { limit: 5, windowMs: 60 * 1000 },

  /** Sign up - 5 requests per minute */
  signUp: { limit: 5, windowMs: 60 * 1000 },

  /** Sign in - 10 requests per minute */
  signIn: { limit: 10, windowMs: 60 * 1000 },
} as const

/** Standard Swedish error message for rate limiting */
export const RATE_LIMIT_ERROR = 'För många förfrågningar. Försök igen om en stund.'
