import type { CalendarProvider } from './types'
import { GoogleCalendarProvider } from './providers/google'

const providers: Record<string, () => CalendarProvider> = {
  google: () => new GoogleCalendarProvider(),
}

export function getCalendarProvider(provider: string): CalendarProvider {
  const factory = providers[provider]
  if (!factory) {
    throw new Error(`Unknown calendar provider: ${provider}`)
  }
  return factory()
}

export { type CalendarProvider, type CalendarEvent, type ExternalCalendar, type TokenSet, type SyncOptions, type SyncResult } from './types'
