type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  [key: string]: unknown
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  }

  if (process.env.NODE_ENV === 'production') {
    // JSON output for log aggregation
    const method = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info
    method(JSON.stringify(entry))
  } else {
    // Readable output in development
    const method = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info
    method(`[${level.toUpperCase()}] ${message}`, context || '')
  }
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
}
