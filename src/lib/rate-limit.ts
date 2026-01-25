import { headers } from 'next/headers'

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// Note: Resets on serverless cold starts, which is acceptable for abuse prevention
const store = new Map<string, RateLimitEntry>()

// Clean up old entries every 5 minutes to prevent memory leaks
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

/**
 * Get client IP address from request headers
 */
export async function getClientIp(): Promise<string> {
  const headersList = await headers()

  // Check common proxy headers
  const forwardedFor = headersList.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
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

  // Fallback - shouldn't happen in production
  return 'unknown'
}

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (usually IP + endpoint)
 * @param config - Rate limit configuration
 * @returns Rate limit result with success status and remaining requests
 */
export function checkRateLimit(
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

/**
 * Rate limit middleware for API routes
 * @param endpoint - Endpoint name for tracking
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function rateLimit(
  endpoint: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const ip = await getClientIp()
  const identifier = `${ip}:${endpoint}`
  return checkRateLimit(identifier, config)
}

// Predefined rate limit configurations
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
