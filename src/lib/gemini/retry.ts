interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
}

const DEFAULTS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
}

function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('429') || msg.includes('rate limit')) return true
    if (msg.includes('500') || msg.includes('503') || msg.includes('server error')) return true
    if (msg.includes('timeout') || msg.includes('econnreset') || msg.includes('fetch failed')) return true
  }
  return false
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULTS, ...options }
  let lastError: unknown

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt === opts.maxAttempts || !isRetryable(error)) {
        throw error
      }
      const delay = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200,
        opts.maxDelayMs
      )
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}
