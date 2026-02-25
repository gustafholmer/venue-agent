export interface CalendarProvider {
  getAuthUrl(redirectUri: string, state: string): string
  exchangeCode(code: string, redirectUri: string): Promise<TokenSet>
  refreshToken(refreshToken: string): Promise<TokenSet>
  listCalendars(accessToken: string): Promise<ExternalCalendar[]>
  createEvent(accessToken: string, calendarId: string, event: CalendarEvent): Promise<string>
  updateEvent(accessToken: string, calendarId: string, eventId: string, event: CalendarEvent): Promise<void>
  deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void>
}

export interface TokenSet {
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

export interface ExternalCalendar {
  id: string
  name: string
  primary: boolean
}

export interface CalendarEvent {
  title: string
  description?: string
  date: string // "YYYY-MM-DD", all-day event
  status: 'confirmed' | 'tentative'
}

export type SyncEntityType = 'blocked_date' | 'booking'

export interface SyncOptions {
  entityType: SyncEntityType
  entityId: string
  action: 'create' | 'delete'
  event?: CalendarEvent
}

export interface SyncResult {
  synced: boolean
  calendarSyncFailed?: boolean
}
