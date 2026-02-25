# Google Calendar Sync — Design

## Overview

One-way sync from Tryffle to Google Calendar. When a venue owner blocks a date or accepts a booking on Tryffle, it appears as an all-day event in their Google Calendar. Built with a provider abstraction so Outlook/iCal can be added later.

## Scope

**In scope (this feature):**
- Google OAuth connection from dashboard settings
- Per-venue calendar selection
- Push confirmed bookings and blocked dates to Google Calendar
- Delete events when dates are unblocked or bookings cancelled
- Error toast when sync fails (non-blocking)

**Out of scope (separate follow-ups):**
- Google → Tryffle sync (pull direction)
- Enhanced dashboard calendar view (revenue, pending inquiries)
- Outlook / iCal providers
- Retry queue for failed syncs

## Database Schema

### `calendar_connections`

Stores encrypted OAuth tokens per user-provider link.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → profiles |
| provider | text | `'google'` (extensible) |
| encrypted_access_token | text | AES-256-GCM encrypted |
| encrypted_refresh_token | text | AES-256-GCM encrypted |
| token_expires_at | timestamptz | When the access token expires |
| provider_email | text | Connected account email (for display) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Unique constraint: `(user_id, provider)`.

### `venue_calendar_mappings`

Maps each venue to a specific external calendar.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| venue_id | uuid | FK → venues, unique |
| connection_id | uuid | FK → calendar_connections |
| external_calendar_id | text | Google calendar ID (e.g. `"primary"`) |
| sync_enabled | boolean | Toggle without disconnecting |
| created_at | timestamptz | |

### `calendar_sync_events`

Tracks which Tryffle entities have been synced to which external events.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| venue_calendar_mapping_id | uuid | FK → venue_calendar_mappings |
| entity_type | text | `'blocked_date'` or `'booking'` |
| entity_id | uuid | FK → blocked date or booking ID |
| external_event_id | text | Google Calendar event ID |
| last_synced_at | timestamptz | |
| created_at | timestamptz | |

Unique constraint: `(venue_calendar_mapping_id, entity_type, entity_id)`.

## Provider Abstraction

### Interface (`src/lib/calendar/types.ts`)

```typescript
interface CalendarProvider {
  getAuthUrl(redirectUri: string, state: string): string
  exchangeCode(code: string, redirectUri: string): Promise<TokenSet>
  refreshToken(refreshToken: string): Promise<TokenSet>
  listCalendars(accessToken: string): Promise<ExternalCalendar[]>
  createEvent(accessToken: string, calendarId: string, event: CalendarEvent): Promise<string>
  updateEvent(accessToken: string, calendarId: string, eventId: string, event: CalendarEvent): Promise<void>
  deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void>
}

interface TokenSet {
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

interface ExternalCalendar {
  id: string
  name: string
  primary: boolean
}

interface CalendarEvent {
  title: string
  description?: string
  date: string        // "YYYY-MM-DD", all-day event
  status: 'confirmed' | 'tentative'
}
```

### Google Implementation (`src/lib/calendar/providers/google.ts`)

Class `GoogleCalendarProvider implements CalendarProvider` using the `googleapis` npm package.

### Factory (`src/lib/calendar/index.ts`)

```typescript
function getCalendarProvider(provider: string): CalendarProvider
```

## OAuth Flow

1. Owner clicks "Koppla Google Kalender" in `/dashboard/settings`
2. API route `/api/auth/google-calendar` generates Google OAuth URL:
   - Scopes: `calendar.readonly` + `calendar.events`
   - `access_type: 'offline'`, `prompt: 'consent'`
   - Signed `state` parameter with user ID (CSRF protection)
3. Owner authorizes in Google consent screen
4. Google redirects to `/api/auth/google-calendar/callback`
5. Callback exchanges code for tokens, encrypts them, stores in `calendar_connections`
6. Redirects to settings page showing connected account

### Token Refresh

Helper `getValidAccessToken(connectionId)` checks `token_expires_at`. If expired, calls `provider.refreshToken()`, updates encrypted tokens in DB, returns fresh access token. Runs before every API call.

### Encryption

AES-256-GCM via `CALENDAR_ENCRYPTION_KEY` env var. Helpers in `src/lib/calendar/encryption.ts`.

## Sync Logic

### Modified Server Actions

| Server Action | Sync Action |
|---|---|
| `blockDate(date)` | Create event: "Blockerad" |
| `blockDateRange(start, end)` | Create one event per date |
| `unblockDate(date)` | Delete event |
| `acceptBooking(bookingId)` | Create event: "Bokning: [customer] – [event type]" |
| `cancelBooking(bookingId)` | Delete event |
| `declineBooking(bookingId)` | No sync (pending bookings aren't synced) |

### Sync Helper (`src/lib/calendar/sync.ts`)

```typescript
async function syncToCalendar(venueId: string, options: {
  entityType: 'blocked_date' | 'booking'
  entityId: string
  action: 'create' | 'delete'
  event?: CalendarEvent
}): Promise<{ synced: boolean }>
```

1. Look up `venue_calendar_mapping` for venue — return silently if none
2. Get valid access token via `getValidAccessToken()`
3. Call provider `createEvent` / `deleteEvent`
4. Upsert/delete row in `calendar_sync_events`
5. Try/catch — log errors, never throw

### Event Format

- All-day events (dates only, no times)
- Blocked dates: title "Blockerad", description with reason if provided
- Bookings: title "Bokning: {customer name}", description with event type, guest count, time if available

### Error Handling

Server actions return `calendarSyncFailed: true` alongside `success: true` when sync fails. UI shows error toast: "Datumet blockerades, men kunde inte synkas till Google Kalender. Forsok igen senare."

## UI Changes

### Dashboard Settings — "Integrationer" Section

Added to existing `/dashboard/settings` page:

- Connection status: "Google Kalender: Kopplad som gustaf@example.com" or "Ej kopplad"
- Connect / disconnect button
- When connected: dropdown per venue to select target calendar, sync enable/disable toggle

No other UI changes. No new nav items.

## New Files

```
src/lib/calendar/
  types.ts              — CalendarProvider interface, TokenSet, CalendarEvent, etc.
  index.ts              — getCalendarProvider() factory
  sync.ts               — syncToCalendar() helper
  encryption.ts         — AES-256-GCM encrypt/decrypt helpers
  token-manager.ts      — getValidAccessToken() with auto-refresh
  providers/
    google.ts           — GoogleCalendarProvider implementation

src/app/api/auth/google-calendar/
  route.ts              — Initiates OAuth flow
  callback/route.ts     — Handles OAuth callback

src/actions/calendar/
  connect.ts            — Server actions for connection management
  disconnect.ts         — Remove connection + clean up
  update-venue-mapping.ts — Set/update calendar mapping per venue

supabase/migrations/
  XXXXXX_calendar_sync.sql — Creates the 3 new tables
```

## Modified Files

```
src/actions/venues/block-date.ts      — Add syncToCalendar call
src/actions/venues/unblock-date.ts    — Add syncToCalendar call
src/actions/bookings/accept-booking.ts — Add syncToCalendar call
src/actions/bookings/cancel-booking.ts — Add syncToCalendar call
src/app/(public)/dashboard/settings/page.tsx — Add integrations section
src/types/database.ts                 — Add new table types
package.json                          — Add googleapis dependency
```

## Environment Variables

```
GOOGLE_CLIENT_ID          — Google OAuth client ID
GOOGLE_CLIENT_SECRET      — Google OAuth client secret
CALENDAR_ENCRYPTION_KEY   — AES-256 key for token encryption
```
