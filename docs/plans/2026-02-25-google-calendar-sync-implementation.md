# Google Calendar Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** One-way sync from Tryffle to Google Calendar — blocked dates and confirmed bookings push as all-day events.

**Architecture:** CalendarProvider abstraction with Google as first implementation. OAuth tokens stored encrypted in Supabase. Sync happens in existing server actions after DB writes, non-blocking with error feedback via inline messages.

**Tech Stack:** googleapis npm package, AES-256-GCM encryption, Next.js API routes for OAuth, Supabase migrations for schema.

**Design doc:** `docs/plans/2026-02-25-google-calendar-sync-design.md`

**Note:** This project has no automated test infrastructure. Each task includes manual verification steps instead of TDD. When a test framework is added, tests should be backfilled for the encryption and sync modules.

**Note:** `cancel-booking.ts:77` has a pre-existing bug — it matches `reason: Bokning: ${bookingId}` but `accept-booking.ts:115` stores `reason: Bokning: ${booking.customer_name}`. This is out of scope for this feature but noted for awareness.

---

### Task 1: Install googleapis dependency

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

Run: `npm install googleapis`

**Step 2: Verify installation**

Run: `node -e "const { google } = require('googleapis'); console.log('googleapis loaded, calendar version:', Object.keys(google.calendar).length > 0 ? 'ok' : 'fail')"`

Expected: prints "googleapis loaded, calendar version: ok"

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add googleapis dependency for calendar sync"
```

---

### Task 2: Database migration — 3 new tables

**Files:**
- Create: `supabase/migrations/00022_calendar_sync.sql`

**Step 1: Create the migration file**

Follow the existing migration pattern (see `00018_analytics_events.sql` for reference — plain SQL DDL, RLS enabled, indexes).

```sql
-- Calendar connections: stores encrypted OAuth tokens per user-provider link
create table calendar_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  provider text not null,
  encrypted_access_token text not null,
  encrypted_refresh_token text not null,
  token_expires_at timestamptz not null,
  provider_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, provider)
);

alter table calendar_connections enable row level security;

create policy "Users can view own connections"
  on calendar_connections for select
  using (auth.uid() = user_id);

create policy "Users can insert own connections"
  on calendar_connections for insert
  with check (auth.uid() = user_id);

create policy "Users can update own connections"
  on calendar_connections for update
  using (auth.uid() = user_id);

create policy "Users can delete own connections"
  on calendar_connections for delete
  using (auth.uid() = user_id);

-- Venue calendar mappings: which calendar each venue syncs to
create table venue_calendar_mappings (
  id uuid default gen_random_uuid() primary key,
  venue_id uuid not null references venues(id) on delete cascade unique,
  connection_id uuid not null references calendar_connections(id) on delete cascade,
  external_calendar_id text not null,
  sync_enabled boolean default true,
  created_at timestamptz default now()
);

alter table venue_calendar_mappings enable row level security;

-- Venue owners can manage their venue's calendar mapping
create policy "Venue owners can view mapping"
  on venue_calendar_mappings for select
  using (
    exists (
      select 1 from venues
      where venues.id = venue_calendar_mappings.venue_id
      and venues.owner_id = auth.uid()
    )
  );

create policy "Venue owners can insert mapping"
  on venue_calendar_mappings for insert
  with check (
    exists (
      select 1 from venues
      where venues.id = venue_calendar_mappings.venue_id
      and venues.owner_id = auth.uid()
    )
  );

create policy "Venue owners can update mapping"
  on venue_calendar_mappings for update
  using (
    exists (
      select 1 from venues
      where venues.id = venue_calendar_mappings.venue_id
      and venues.owner_id = auth.uid()
    )
  );

create policy "Venue owners can delete mapping"
  on venue_calendar_mappings for delete
  using (
    exists (
      select 1 from venues
      where venues.id = venue_calendar_mappings.venue_id
      and venues.owner_id = auth.uid()
    )
  );

-- Calendar sync events: maps Tryffle entities to external calendar events
create table calendar_sync_events (
  id uuid default gen_random_uuid() primary key,
  venue_calendar_mapping_id uuid not null references venue_calendar_mappings(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  external_event_id text not null,
  last_synced_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (venue_calendar_mapping_id, entity_type, entity_id)
);

alter table calendar_sync_events enable row level security;

-- Venue owners can view/manage sync events via venue ownership chain
create policy "Venue owners can view sync events"
  on calendar_sync_events for select
  using (
    exists (
      select 1 from venue_calendar_mappings vcm
      join venues v on v.id = vcm.venue_id
      where vcm.id = calendar_sync_events.venue_calendar_mapping_id
      and v.owner_id = auth.uid()
    )
  );

create policy "Venue owners can insert sync events"
  on calendar_sync_events for insert
  with check (
    exists (
      select 1 from venue_calendar_mappings vcm
      join venues v on v.id = vcm.venue_id
      where vcm.id = calendar_sync_events.venue_calendar_mapping_id
      and v.owner_id = auth.uid()
    )
  );

create policy "Venue owners can delete sync events"
  on calendar_sync_events for delete
  using (
    exists (
      select 1 from venue_calendar_mappings vcm
      join venues v on v.id = vcm.venue_id
      where vcm.id = calendar_sync_events.venue_calendar_mapping_id
      and v.owner_id = auth.uid()
    )
  );

-- Indexes for common queries
create index idx_calendar_connections_user on calendar_connections (user_id);
create index idx_venue_calendar_mappings_connection on venue_calendar_mappings (connection_id);
create index idx_calendar_sync_events_mapping on calendar_sync_events (venue_calendar_mapping_id);
create index idx_calendar_sync_events_entity on calendar_sync_events (entity_type, entity_id);
```

**Step 2: Apply migration locally**

Run: `npx supabase db reset`

Or if just applying the new migration:
Run: `npx supabase migration up`

Expected: Migration applies without errors.

**Step 3: Commit**

```bash
git add supabase/migrations/00022_calendar_sync.sql
git commit -m "feat: add calendar sync database tables (connections, mappings, sync events)"
```

---

### Task 3: Update database types

**Files:**
- Modify: `src/types/database.ts`

**Step 1: Add the 3 new table types**

Add these table definitions inside `Database['public']['Tables']` (after the existing tables, before the closing `}`). Follow the exact pattern used by other tables in the file (Row/Insert/Update).

Add inside the `Tables` block:

```typescript
calendar_connections: {
  Row: {
    id: string
    user_id: string
    provider: string
    encrypted_access_token: string
    encrypted_refresh_token: string
    token_expires_at: string
    provider_email: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    user_id: string
    provider: string
    encrypted_access_token: string
    encrypted_refresh_token: string
    token_expires_at: string
    provider_email?: string | null
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    user_id?: string
    provider?: string
    encrypted_access_token?: string
    encrypted_refresh_token?: string
    token_expires_at?: string
    provider_email?: string | null
    created_at?: string
    updated_at?: string
  }
}
venue_calendar_mappings: {
  Row: {
    id: string
    venue_id: string
    connection_id: string
    external_calendar_id: string
    sync_enabled: boolean
    created_at: string
  }
  Insert: {
    id?: string
    venue_id: string
    connection_id: string
    external_calendar_id: string
    sync_enabled?: boolean
    created_at?: string
  }
  Update: {
    id?: string
    venue_id?: string
    connection_id?: string
    external_calendar_id?: string
    sync_enabled?: boolean
    created_at?: string
  }
}
calendar_sync_events: {
  Row: {
    id: string
    venue_calendar_mapping_id: string
    entity_type: string
    entity_id: string
    external_event_id: string
    last_synced_at: string
    created_at: string
  }
  Insert: {
    id?: string
    venue_calendar_mapping_id: string
    entity_type: string
    entity_id: string
    external_event_id: string
    last_synced_at?: string
    created_at?: string
  }
  Update: {
    id?: string
    venue_calendar_mapping_id?: string
    entity_type?: string
    entity_id?: string
    external_event_id?: string
    last_synced_at?: string
    created_at?: string
  }
}
```

**Step 2: Add convenience type aliases**

Add after the existing aliases (after `export type AgentSession = Tables<'agent_sessions'>` at line 631):

```typescript
export type CalendarConnection = Tables<'calendar_connections'>
export type VenueCalendarMapping = Tables<'venue_calendar_mappings'>
export type CalendarSyncEvent = Tables<'calendar_sync_events'>
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No new errors.

**Step 4: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add calendar sync types to database schema"
```

---

### Task 4: Encryption utilities

**Files:**
- Create: `src/lib/calendar/encryption.ts`

**Step 1: Create the encryption module**

```typescript
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const key = process.env.CALENDAR_ENCRYPTION_KEY
  if (!key) {
    throw new Error('CALENDAR_ENCRYPTION_KEY environment variable is not set')
  }
  // Key should be 32 bytes (256 bits), hex-encoded = 64 chars
  return Buffer.from(key, 'hex')
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:ciphertext (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey()
  const [ivHex, authTagHex, ciphertext] = encryptedData.split(':')

  if (!ivHex || !authTagHex || !ciphertext) {
    throw new Error('Invalid encrypted data format')
  }

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

Expected: No errors related to this file.

**Step 3: Commit**

```bash
git add src/lib/calendar/encryption.ts
git commit -m "feat: add AES-256-GCM encryption utilities for calendar tokens"
```

---

### Task 5: CalendarProvider interface and types

**Files:**
- Create: `src/lib/calendar/types.ts`

**Step 1: Create the types file**

```typescript
export interface CalendarProvider {
  /** Generate the OAuth authorization URL */
  getAuthUrl(redirectUri: string, state: string): string

  /** Exchange an authorization code for tokens */
  exchangeCode(code: string, redirectUri: string): Promise<TokenSet>

  /** Refresh an expired access token */
  refreshToken(refreshToken: string): Promise<TokenSet>

  /** List available calendars for the authenticated user */
  listCalendars(accessToken: string): Promise<ExternalCalendar[]>

  /** Create an event, returns the external event ID */
  createEvent(accessToken: string, calendarId: string, event: CalendarEvent): Promise<string>

  /** Update an existing event */
  updateEvent(accessToken: string, calendarId: string, eventId: string, event: CalendarEvent): Promise<void>

  /** Delete an event */
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
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/lib/calendar/types.ts
git commit -m "feat: add CalendarProvider interface and calendar sync types"
```

---

### Task 6: Google Calendar provider implementation

**Files:**
- Create: `src/lib/calendar/providers/google.ts`

**Step 1: Create the Google provider**

```typescript
import { google } from 'googleapis'
import type { CalendarProvider, TokenSet, ExternalCalendar, CalendarEvent } from '../types'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
]

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
}

export class GoogleCalendarProvider implements CalendarProvider {
  getAuthUrl(redirectUri: string, state: string): string {
    const client = getOAuth2Client()
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
      redirect_uri: redirectUri,
      state,
    })
  }

  async exchangeCode(code: string, redirectUri: string): Promise<TokenSet> {
    const client = getOAuth2Client()
    const { tokens } = await client.getToken({
      code,
      redirect_uri: redirectUri,
    })

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to get tokens from Google')
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date || Date.now() + 3600 * 1000),
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenSet> {
    const client = getOAuth2Client()
    client.setCredentials({ refresh_token: refreshToken })
    const { credentials } = await client.refreshAccessToken()

    if (!credentials.access_token) {
      throw new Error('Failed to refresh Google access token')
    }

    return {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || refreshToken,
      expiresAt: new Date(credentials.expiry_date || Date.now() + 3600 * 1000),
    }
  }

  async listCalendars(accessToken: string): Promise<ExternalCalendar[]> {
    const client = getOAuth2Client()
    client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: client })
    const res = await calendar.calendarList.list()

    return (res.data.items || []).map((cal) => ({
      id: cal.id || '',
      name: cal.summary || '',
      primary: cal.primary || false,
    }))
  }

  async createEvent(accessToken: string, calendarId: string, event: CalendarEvent): Promise<string> {
    const client = getOAuth2Client()
    client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: client })

    // All-day event: date (not dateTime), end date is exclusive (next day)
    const endDate = new Date(event.date)
    endDate.setDate(endDate.getDate() + 1)
    const endDateStr = endDate.toISOString().split('T')[0]

    const res = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: event.title,
        description: event.description,
        start: { date: event.date },
        end: { date: endDateStr },
        status: event.status,
        transparency: 'opaque',
      },
    })

    if (!res.data.id) {
      throw new Error('Google Calendar did not return an event ID')
    }

    return res.data.id
  }

  async updateEvent(accessToken: string, calendarId: string, eventId: string, event: CalendarEvent): Promise<void> {
    const client = getOAuth2Client()
    client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: client })

    const endDate = new Date(event.date)
    endDate.setDate(endDate.getDate() + 1)
    const endDateStr = endDate.toISOString().split('T')[0]

    await calendar.events.update({
      calendarId,
      eventId,
      requestBody: {
        summary: event.title,
        description: event.description,
        start: { date: event.date },
        end: { date: endDateStr },
        status: event.status,
        transparency: 'opaque',
      },
    })
  }

  async deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
    const client = getOAuth2Client()
    client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: client })

    await calendar.events.delete({
      calendarId,
      eventId,
    })
  }
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/lib/calendar/providers/google.ts
git commit -m "feat: implement GoogleCalendarProvider using googleapis"
```

---

### Task 7: Provider factory

**Files:**
- Create: `src/lib/calendar/index.ts`

**Step 1: Create the factory**

```typescript
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
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/lib/calendar/index.ts
git commit -m "feat: add calendar provider factory"
```

---

### Task 8: Token manager

**Files:**
- Create: `src/lib/calendar/token-manager.ts`

**Step 1: Create the token manager**

This module handles decrypting stored tokens, checking expiry, and refreshing when needed. It uses the service-role Supabase client to update tokens (since this runs in server actions where the user is already authenticated).

```typescript
import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from './encryption'
import { getCalendarProvider } from './index'

/**
 * Get a valid access token for a calendar connection.
 * If the token is expired, refreshes it and updates the DB.
 * Returns null if the connection doesn't exist or refresh fails.
 */
export async function getValidAccessToken(connectionId: string): Promise<{
  accessToken: string
  provider: string
  connectionId: string
} | null> {
  const supabase = await createClient()

  const { data: connection, error } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('id', connectionId)
    .single()

  if (error || !connection) {
    console.error('Failed to fetch calendar connection:', error)
    return null
  }

  const expiresAt = new Date(connection.token_expires_at)
  const now = new Date()
  // Refresh 5 minutes before expiry to avoid edge cases
  const needsRefresh = expiresAt.getTime() - now.getTime() < 5 * 60 * 1000

  if (!needsRefresh) {
    return {
      accessToken: decrypt(connection.encrypted_access_token),
      provider: connection.provider,
      connectionId: connection.id,
    }
  }

  // Refresh the token
  try {
    const provider = getCalendarProvider(connection.provider)
    const decryptedRefreshToken = decrypt(connection.encrypted_refresh_token)
    const newTokens = await provider.refreshToken(decryptedRefreshToken)

    // Update the stored tokens
    const { error: updateError } = await supabase
      .from('calendar_connections')
      .update({
        encrypted_access_token: encrypt(newTokens.accessToken),
        encrypted_refresh_token: encrypt(newTokens.refreshToken),
        token_expires_at: newTokens.expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    if (updateError) {
      console.error('Failed to update refreshed tokens:', updateError)
      return null
    }

    return {
      accessToken: newTokens.accessToken,
      provider: connection.provider,
      connectionId: connection.id,
    }
  } catch (err) {
    console.error('Failed to refresh calendar token:', err)
    return null
  }
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/lib/calendar/token-manager.ts
git commit -m "feat: add calendar token manager with auto-refresh"
```

---

### Task 9: Sync helper

**Files:**
- Create: `src/lib/calendar/sync.ts`

**Step 1: Create the sync helper**

This is the main entry point called by server actions. It's wrapped in try/catch and never throws.

```typescript
import { createClient } from '@/lib/supabase/server'
import { getCalendarProvider } from './index'
import { getValidAccessToken } from './token-manager'
import type { SyncOptions, SyncResult } from './types'

/**
 * Sync a Tryffle entity (blocked date or booking) to Google Calendar.
 * Never throws — returns { synced: false } on any failure.
 * Returns { synced: true } on success or if no calendar is configured.
 */
export async function syncToCalendar(
  venueId: string,
  options: SyncOptions
): Promise<SyncResult> {
  try {
    const supabase = await createClient()

    // Check if this venue has a calendar mapping
    const { data: mapping } = await supabase
      .from('venue_calendar_mappings')
      .select('id, connection_id, external_calendar_id, sync_enabled')
      .eq('venue_id', venueId)
      .single()

    // No mapping or sync disabled — nothing to do, not a failure
    if (!mapping || !mapping.sync_enabled) {
      return { synced: true }
    }

    // Get a valid access token
    const tokenResult = await getValidAccessToken(mapping.connection_id)
    if (!tokenResult) {
      console.error(`Calendar sync failed: could not get access token for venue ${venueId}`)
      return { synced: false, calendarSyncFailed: true }
    }

    const provider = getCalendarProvider(tokenResult.provider)

    if (options.action === 'create') {
      if (!options.event) {
        console.error('Calendar sync: create action requires an event')
        return { synced: false, calendarSyncFailed: true }
      }

      const externalEventId = await provider.createEvent(
        tokenResult.accessToken,
        mapping.external_calendar_id,
        options.event
      )

      // Record the sync
      await supabase.from('calendar_sync_events').upsert(
        {
          venue_calendar_mapping_id: mapping.id,
          entity_type: options.entityType,
          entity_id: options.entityId,
          external_event_id: externalEventId,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: 'venue_calendar_mapping_id,entity_type,entity_id' }
      )

      return { synced: true }
    }

    if (options.action === 'delete') {
      // Look up the external event ID
      const { data: syncEvent } = await supabase
        .from('calendar_sync_events')
        .select('id, external_event_id')
        .eq('venue_calendar_mapping_id', mapping.id)
        .eq('entity_type', options.entityType)
        .eq('entity_id', options.entityId)
        .single()

      if (!syncEvent) {
        // Nothing to delete — event was never synced
        return { synced: true }
      }

      await provider.deleteEvent(
        tokenResult.accessToken,
        mapping.external_calendar_id,
        syncEvent.external_event_id
      )

      // Remove the sync record
      await supabase
        .from('calendar_sync_events')
        .delete()
        .eq('id', syncEvent.id)

      return { synced: true }
    }

    return { synced: true }
  } catch (err) {
    console.error('Calendar sync error:', err)
    return { synced: false, calendarSyncFailed: true }
  }
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/lib/calendar/sync.ts
git commit -m "feat: add syncToCalendar helper for pushing events to external calendars"
```

---

### Task 10: OAuth API routes

**Files:**
- Create: `src/app/api/auth/google-calendar/route.ts`
- Create: `src/app/api/auth/google-calendar/callback/route.ts`

**Step 1: Create the OAuth initiate route**

This route redirects the user to Google's consent screen.

`src/app/api/auth/google-calendar/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCalendarProvider } from '@/lib/calendar'
import { createHmac } from 'crypto'

function signState(userId: string): string {
  const secret = process.env.CALENDAR_ENCRYPTION_KEY
  if (!secret) throw new Error('CALENDAR_ENCRYPTION_KEY not set')
  const hmac = createHmac('sha256', secret).update(userId).digest('hex')
  return `${userId}:${hmac}`
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url))
  }

  const provider = getCalendarProvider('google')
  const origin = request.nextUrl.origin
  const redirectUri = `${origin}/api/auth/google-calendar/callback`
  const state = signState(user.id)

  const authUrl = provider.getAuthUrl(redirectUri, state)
  return NextResponse.redirect(authUrl)
}
```

**Step 2: Create the OAuth callback route**

`src/app/api/auth/google-calendar/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCalendarProvider } from '@/lib/calendar'
import { encrypt } from '@/lib/calendar/encryption'
import { createHmac } from 'crypto'

function verifyState(state: string): string | null {
  const secret = process.env.CALENDAR_ENCRYPTION_KEY
  if (!secret) return null

  const [userId, hmac] = state.split(':')
  if (!userId || !hmac) return null

  const expected = createHmac('sha256', secret).update(userId).digest('hex')
  if (hmac !== expected) return null

  return userId
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const settingsUrl = new URL('/dashboard/settings', request.url)

  if (error || !code || !state) {
    settingsUrl.searchParams.set('calendar_error', error || 'missing_params')
    return NextResponse.redirect(settingsUrl)
  }

  // Verify the state parameter
  const userId = verifyState(state)
  if (!userId) {
    settingsUrl.searchParams.set('calendar_error', 'invalid_state')
    return NextResponse.redirect(settingsUrl)
  }

  // Verify the authenticated user matches the state
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.id !== userId) {
    settingsUrl.searchParams.set('calendar_error', 'auth_mismatch')
    return NextResponse.redirect(settingsUrl)
  }

  try {
    const provider = getCalendarProvider('google')
    const origin = request.nextUrl.origin
    const redirectUri = `${origin}/api/auth/google-calendar/callback`

    const tokens = await provider.exchangeCode(code, redirectUri)

    // Get the user's email from Google Calendar API to display in settings
    const calendars = await provider.listCalendars(tokens.accessToken)
    const primaryCalendar = calendars.find((c) => c.primary)
    const providerEmail = primaryCalendar?.name || null

    // Store encrypted tokens — upsert to handle re-connection
    const { error: dbError } = await supabase
      .from('calendar_connections')
      .upsert(
        {
          user_id: userId,
          provider: 'google',
          encrypted_access_token: encrypt(tokens.accessToken),
          encrypted_refresh_token: encrypt(tokens.refreshToken),
          token_expires_at: tokens.expiresAt.toISOString(),
          provider_email: providerEmail,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider' }
      )

    if (dbError) {
      console.error('Failed to store calendar connection:', dbError)
      settingsUrl.searchParams.set('calendar_error', 'storage_failed')
      return NextResponse.redirect(settingsUrl)
    }

    settingsUrl.searchParams.set('calendar_connected', 'true')
    return NextResponse.redirect(settingsUrl)
  } catch (err) {
    console.error('Google Calendar OAuth callback error:', err)
    settingsUrl.searchParams.set('calendar_error', 'exchange_failed')
    return NextResponse.redirect(settingsUrl)
  }
}
```

**Step 3: Verify both routes compile**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/app/api/auth/google-calendar/route.ts src/app/api/auth/google-calendar/callback/route.ts
git commit -m "feat: add Google Calendar OAuth initiate and callback API routes"
```

---

### Task 11: Calendar connection server actions

**Files:**
- Create: `src/actions/calendar/disconnect.ts`
- Create: `src/actions/calendar/update-venue-mapping.ts`
- Create: `src/actions/calendar/get-connection.ts`
- Create: `src/actions/calendar/list-calendars.ts`

**Step 1: Create get-connection action**

`src/actions/calendar/get-connection.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function getCalendarConnection(): Promise<{
  connected: boolean
  providerEmail?: string | null
  connectionId?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { connected: false }
  }

  const { data: connection } = await supabase
    .from('calendar_connections')
    .select('id, provider_email')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .single()

  if (!connection) {
    return { connected: false }
  }

  return {
    connected: true,
    providerEmail: connection.provider_email,
    connectionId: connection.id,
  }
}
```

**Step 2: Create list-calendars action**

`src/actions/calendar/list-calendars.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { getCalendarProvider } from '@/lib/calendar'
import { getValidAccessToken } from '@/lib/calendar/token-manager'
import type { ExternalCalendar } from '@/lib/calendar/types'

export async function listGoogleCalendars(): Promise<{
  success: boolean
  calendars?: ExternalCalendar[]
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Ej inloggad' }
  }

  const { data: connection } = await supabase
    .from('calendar_connections')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .single()

  if (!connection) {
    return { success: false, error: 'Ingen Google Kalender-koppling hittades' }
  }

  const tokenResult = await getValidAccessToken(connection.id)
  if (!tokenResult) {
    return { success: false, error: 'Kunde inte hämta åtkomsttoken' }
  }

  try {
    const provider = getCalendarProvider('google')
    const calendars = await provider.listCalendars(tokenResult.accessToken)
    return { success: true, calendars }
  } catch (err) {
    console.error('Failed to list calendars:', err)
    return { success: false, error: 'Kunde inte hämta kalendrar från Google' }
  }
}
```

**Step 3: Create disconnect action**

`src/actions/calendar/disconnect.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function disconnectCalendar(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Ej inloggad' }
  }

  // Delete the connection — cascades to venue_calendar_mappings and calendar_sync_events
  const { error } = await supabase
    .from('calendar_connections')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', 'google')

  if (error) {
    console.error('Failed to disconnect calendar:', error)
    return { success: false, error: 'Kunde inte koppla bort Google Kalender' }
  }

  return { success: true }
}
```

**Step 4: Create update-venue-mapping action**

`src/actions/calendar/update-venue-mapping.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function updateVenueCalendarMapping(
  venueId: string,
  calendarId: string,
  syncEnabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Ej inloggad' }
  }

  // Verify venue ownership
  const { data: venue } = await supabase
    .from('venues')
    .select('id')
    .eq('id', venueId)
    .eq('owner_id', user.id)
    .single()

  if (!venue) {
    return { success: false, error: 'Lokalen hittades inte' }
  }

  // Get the user's calendar connection
  const { data: connection } = await supabase
    .from('calendar_connections')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .single()

  if (!connection) {
    return { success: false, error: 'Ingen Google Kalender-koppling hittades' }
  }

  // Upsert the mapping (venue_id is unique)
  const { error } = await supabase
    .from('venue_calendar_mappings')
    .upsert(
      {
        venue_id: venueId,
        connection_id: connection.id,
        external_calendar_id: calendarId,
        sync_enabled: syncEnabled,
      },
      { onConflict: 'venue_id' }
    )

  if (error) {
    console.error('Failed to update venue calendar mapping:', error)
    return { success: false, error: 'Kunde inte uppdatera kalenderkopplingen' }
  }

  return { success: true }
}
```

**Step 5: Verify all actions compile**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```bash
git add src/actions/calendar/
git commit -m "feat: add calendar connection server actions (get, list, disconnect, mapping)"
```

---

### Task 12: Settings UI — Integrations section

**Files:**
- Modify: `src/app/(public)/dashboard/settings/page.tsx`

**Step 1: Add the integrations section**

Modify `src/app/(public)/dashboard/settings/page.tsx`. Add the Google Calendar card between the profile form card (ends line 200) and the danger zone card (starts line 202). This requires:

1. Adding imports and state for the calendar integration
2. Adding a `useEffect` to load calendar connection status
3. Adding the UI section

At the top of the file, add these imports after line 4 (`import { Button } from '@/components/ui/button'`):

```typescript
import { getCalendarConnection } from '@/actions/calendar/get-connection'
import { listGoogleCalendars } from '@/actions/calendar/list-calendars'
import { disconnectCalendar } from '@/actions/calendar/disconnect'
import { updateVenueCalendarMapping } from '@/actions/calendar/update-venue-mapping'
import type { ExternalCalendar } from '@/lib/calendar/types'
```

Add these state variables after the existing state declarations (after line 24 `})`):

```typescript
// Calendar integration state
const [calendarConnected, setCalendarConnected] = useState(false)
const [calendarEmail, setCalendarEmail] = useState<string | null>(null)
const [calendars, setCalendars] = useState<ExternalCalendar[]>([])
const [selectedCalendarId, setSelectedCalendarId] = useState<string>('')
const [syncEnabled, setSyncEnabled] = useState(true)
const [venueId, setVenueId] = useState<string | null>(null)
const [calendarLoading, setCalendarLoading] = useState(true)
const [calendarMessage, setCalendarMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
const [isDisconnecting, setIsDisconnecting] = useState(false)
const [isSavingCalendar, setIsSavingCalendar] = useState(false)
```

Add a new `useEffect` after the existing one (after line 53 `}, [])`). This loads calendar connection state and the user's venue:

```typescript
useEffect(() => {
  async function loadCalendarState() {
    const supabase = createClient()

    // Check URL params for OAuth callback results
    const params = new URLSearchParams(window.location.search)
    if (params.get('calendar_connected') === 'true') {
      setCalendarMessage({ type: 'success', text: 'Google Kalender kopplad!' })
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('calendar_error')) {
      setCalendarMessage({ type: 'error', text: 'Kunde inte koppla Google Kalender. Försök igen.' })
      window.history.replaceState({}, '', window.location.pathname)
    }

    // Load connection status
    const connection = await getCalendarConnection()
    setCalendarConnected(connection.connected)
    setCalendarEmail(connection.providerEmail || null)

    // Load venue for this owner
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: venue } = await supabase
        .from('venues')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (venue) {
        setVenueId(venue.id)

        // Load existing mapping
        const { data: mapping } = await supabase
          .from('venue_calendar_mappings')
          .select('external_calendar_id, sync_enabled')
          .eq('venue_id', venue.id)
          .single()

        if (mapping) {
          setSelectedCalendarId(mapping.external_calendar_id)
          setSyncEnabled(mapping.sync_enabled)
        }
      }
    }

    // Load available calendars if connected
    if (connection.connected) {
      const result = await listGoogleCalendars()
      if (result.success && result.calendars) {
        setCalendars(result.calendars)
      }
    }

    setCalendarLoading(false)
  }

  loadCalendarState()
}, [])
```

Add handler functions before the `if (isLoading)` check (before line 92):

```typescript
const handleDisconnect = async () => {
  if (!confirm('Är du säker? Alla synkade kalenderhändelser kommer att finnas kvar i Google Kalender men nya händelser synkas inte längre.')) return
  setIsDisconnecting(true)
  const result = await disconnectCalendar()
  if (result.success) {
    setCalendarConnected(false)
    setCalendarEmail(null)
    setCalendars([])
    setSelectedCalendarId('')
    setCalendarMessage({ type: 'success', text: 'Google Kalender bortkopplad' })
  } else {
    setCalendarMessage({ type: 'error', text: result.error || 'Något gick fel' })
  }
  setIsDisconnecting(false)
}

const handleSaveCalendarMapping = async () => {
  if (!venueId || !selectedCalendarId) return
  setIsSavingCalendar(true)
  const result = await updateVenueCalendarMapping(venueId, selectedCalendarId, syncEnabled)
  if (result.success) {
    setCalendarMessage({ type: 'success', text: 'Kalenderinställningar sparade' })
  } else {
    setCalendarMessage({ type: 'error', text: result.error || 'Något gick fel' })
  }
  setIsSavingCalendar(false)
}
```

Add the calendar integration card in the JSX. Insert between the closing `</div>` of the profile form card (line 200) and the danger zone card comment (line 202). Add this block:

```tsx
{/* Calendar integration */}
<div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-6">
  <h2 className="text-lg font-semibold text-[#1a1a1a] mb-1">Integrationer</h2>
  <p className="text-[#78716c] text-sm mb-4">
    Koppla externa tjänster till ditt konto
  </p>

  {calendarMessage && (
    <div
      className={`mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${
        calendarMessage.type === 'success'
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-red-50 text-red-700 border border-red-200'
      }`}
    >
      <span className="flex-1">{calendarMessage.text}</span>
      <button
        onClick={() => setCalendarMessage(null)}
        className={`flex-shrink-0 p-1 rounded ${calendarMessage.type === 'success' ? 'hover:bg-green-100' : 'hover:bg-red-100'}`}
        aria-label="Stäng"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )}

  <div className="flex items-start gap-4">
    <div className="w-10 h-10 rounded-lg bg-[#f5f3f0] flex items-center justify-center flex-shrink-0">
      <svg className="w-5 h-5 text-[#57534e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    </div>
    <div className="flex-1">
      <h3 className="font-medium text-[#1a1a1a]">Google Kalender</h3>
      {calendarLoading ? (
        <p className="text-sm text-[#78716c] mt-1">Laddar...</p>
      ) : calendarConnected ? (
        <div className="mt-2 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#78716c]">
              Kopplad som <span className="font-medium text-[#1a1a1a]">{calendarEmail}</span>
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              loading={isDisconnecting}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              Koppla bort
            </Button>
          </div>

          {venueId && (
            <>
              <div>
                <label htmlFor="calendar-select" className="block text-sm font-medium text-[#57534e] mb-1">
                  Synka till kalender
                </label>
                <select
                  id="calendar-select"
                  value={selectedCalendarId}
                  onChange={(e) => setSelectedCalendarId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent"
                >
                  <option value="">Välj kalender...</option>
                  {calendars.map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.name}{cal.primary ? ' (primär)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncEnabled}
                  onChange={(e) => setSyncEnabled(e.target.checked)}
                  className="rounded border-[#e7e5e4] text-[#c45a3b] focus:ring-[#c45a3b]"
                />
                <span className="text-sm text-[#57534e]">Synkronisering aktiverad</span>
              </label>

              <Button
                onClick={handleSaveCalendarMapping}
                loading={isSavingCalendar}
                disabled={!selectedCalendarId}
              >
                Spara kalenderinställningar
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-sm text-[#78716c] mb-3">
            Synka blockerade datum och bokningar till din Google Kalender automatiskt.
          </p>
          <Button
            variant="secondary"
            onClick={() => { window.location.href = '/api/auth/google-calendar' }}
          >
            Koppla Google Kalender
          </Button>
        </div>
      )}
    </div>
  </div>
</div>
```

**Step 2: Verify the page compiles and renders**

Run: `npx tsc --noEmit`

Then start the dev server and visually check `/dashboard/settings`:
Run: `npm run dev`

Expected: Settings page shows the new "Integrationer" card with a "Koppla Google Kalender" button (when not connected).

**Step 3: Commit**

```bash
git add src/app/(public)/dashboard/settings/page.tsx
git commit -m "feat: add Google Calendar integration UI to dashboard settings"
```

---

### Task 13: Modify blockDate and blockDateRange

**Files:**
- Modify: `src/actions/venues/block-date.ts`

**Step 1: Add sync to blockDate**

Add import at the top of `src/actions/venues/block-date.ts` (after line 3):

```typescript
import { syncToCalendar } from '@/lib/calendar/sync'
```

Change the return type of `blockDate` from `Promise<{ success: boolean; error?: string }>` to `Promise<{ success: boolean; error?: string; calendarSyncFailed?: boolean }>`.

After the successful insert (line 69, just before `return { success: true }`), add:

```typescript
// Sync to external calendar
const syncResult = await syncToCalendar(venue.id, {
  entityType: 'blocked_date',
  entityId: date, // We use date as a lookup key since we don't have the inserted row's ID
  action: 'create',
  event: {
    title: 'Blockerad',
    description: reason || undefined,
    date,
    status: 'confirmed',
  },
})

return { success: true, calendarSyncFailed: syncResult.calendarSyncFailed }
```

Wait — we need the actual `id` of the inserted blocked date for `entityId`. Modify the insert to use `.select('id').single()`:

Replace the insert block (lines 58-64) with:

```typescript
const { data: insertedBlock, error: insertError } = await supabase
  .from('venue_blocked_dates')
  .insert({
    venue_id: venue.id,
    blocked_date: date,
    reason: reason || null,
  })
  .select('id')
  .single()
```

And update the error check (line 66-69) to also check `!insertedBlock`:

```typescript
if (insertError || !insertedBlock) {
  console.error('Error blocking date:', insertError)
  return { success: false, error: 'Kunde inte blockera datum' }
}
```

Then the sync call uses `insertedBlock.id`:

```typescript
const syncResult = await syncToCalendar(venue.id, {
  entityType: 'blocked_date',
  entityId: insertedBlock.id,
  action: 'create',
  event: {
    title: 'Blockerad',
    description: reason || undefined,
    date,
    status: 'confirmed',
  },
})

return { success: true, calendarSyncFailed: syncResult.calendarSyncFailed }
```

**Step 2: Add sync to blockDateRange**

Change the return type of `blockDateRange` to include `calendarSyncFailed?: boolean`.

After the successful range insert (line 150), modify the insert to return IDs:

Replace lines 142-150 with:

```typescript
const { data: insertedBlocks, error: insertError } = await supabase
  .from('venue_blocked_dates')
  .insert(
    datesToBlock.map(date => ({
      venue_id: venue.id,
      blocked_date: date,
      reason: reason || null,
    }))
  )
  .select('id, blocked_date')
```

Then after the error check, add sync for each inserted block:

```typescript
// Sync each blocked date to external calendar
let calendarSyncFailed = false
if (insertedBlocks) {
  for (const block of insertedBlocks) {
    const syncResult = await syncToCalendar(venue.id, {
      entityType: 'blocked_date',
      entityId: block.id,
      action: 'create',
      event: {
        title: 'Blockerad',
        description: reason || undefined,
        date: block.blocked_date,
        status: 'confirmed',
      },
    })
    if (syncResult.calendarSyncFailed) calendarSyncFailed = true
  }
}

return {
  success: true,
  blockedCount: datesToBlock.length,
  failedDates: failedDates.length > 0 ? failedDates : undefined,
  calendarSyncFailed: calendarSyncFailed || undefined,
}
```

**Step 3: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/actions/venues/block-date.ts
git commit -m "feat: sync blocked dates to Google Calendar from blockDate/blockDateRange"
```

---

### Task 14: Modify unblockDate

**Files:**
- Modify: `src/actions/venues/unblock-date.ts`

**Step 1: Add sync to unblockDate**

Add import at top (after line 3):

```typescript
import { syncToCalendar } from '@/lib/calendar/sync'
```

Change return type to `Promise<{ success: boolean; error?: string; calendarSyncFailed?: boolean }>`.

Before deleting, we need the blocked date's ID. Replace the delete block (lines 28-32) with a select-then-delete:

```typescript
// Get the blocked date ID first (for calendar sync)
const { data: blockedDate } = await supabase
  .from('venue_blocked_dates')
  .select('id')
  .eq('venue_id', venue.id)
  .eq('blocked_date', date)
  .single()

// Delete the blocked date
const { error: deleteError } = await supabase
  .from('venue_blocked_dates')
  .delete()
  .eq('venue_id', venue.id)
  .eq('blocked_date', date)
```

After the existing `return { success: true }` (line 39), replace it with:

```typescript
// Sync deletion to external calendar
let calendarSyncFailed: boolean | undefined
if (blockedDate) {
  const syncResult = await syncToCalendar(venue.id, {
    entityType: 'blocked_date',
    entityId: blockedDate.id,
    action: 'delete',
  })
  calendarSyncFailed = syncResult.calendarSyncFailed
}

return { success: true, calendarSyncFailed }
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/actions/venues/unblock-date.ts
git commit -m "feat: sync date unblocking to Google Calendar"
```

---

### Task 15: Modify acceptBooking

**Files:**
- Modify: `src/actions/bookings/accept-booking.ts`

**Step 1: Add sync to acceptBooking**

Add import after line 4:

```typescript
import { syncToCalendar } from '@/lib/calendar/sync'
```

Add `calendarSyncFailed?: boolean` to the `AcceptBookingResult` interface (line 11).

After the blocked date insert and before the notification dispatch (after line 121, before line 123), add:

```typescript
// Sync to external calendar
const syncResult = await syncToCalendar(booking.venue_id, {
  entityType: 'booking',
  entityId: booking.id,
  action: 'create',
  event: {
    title: `Bokning: ${booking.customer_name}${booking.event_type ? ' – ' + booking.event_type : ''}`,
    description: [
      booking.event_type && `Typ: ${booking.event_type}`,
      booking.guest_count && `Antal gäster: ${booking.guest_count}`,
      booking.start_time && `Tid: ${booking.start_time}${booking.end_time ? '–' + booking.end_time : ''}`,
      booking.event_description,
    ].filter(Boolean).join('\n'),
    date: booking.event_date,
    status: 'confirmed',
  },
})
```

Change `return { success: true }` (line 139) to:

```typescript
return { success: true, calendarSyncFailed: syncResult.calendarSyncFailed }
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/actions/bookings/accept-booking.ts
git commit -m "feat: sync accepted bookings to Google Calendar"
```

---

### Task 16: Modify cancelBooking

**Files:**
- Modify: `src/actions/bookings/cancel-booking.ts`

**Step 1: Add sync to cancelBooking**

Add import after line 4:

```typescript
import { syncToCalendar } from '@/lib/calendar/sync'
```

Add `calendarSyncFailed?: boolean` to the return type (line 9).

After the existing unblock logic (after line 78), add:

```typescript
// Sync deletion to external calendar (only if booking was accepted and synced)
let calendarSyncFailed: boolean | undefined
if (booking.status === 'accepted') {
  const syncResult = await syncToCalendar(booking.venue_id, {
    entityType: 'booking',
    entityId: booking.id,
    action: 'delete',
  })
  calendarSyncFailed = syncResult.calendarSyncFailed
}
```

Change `return { success: true }` (line 98) to:

```typescript
return { success: true, calendarSyncFailed }
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/actions/bookings/cancel-booking.ts
git commit -m "feat: sync booking cancellation to Google Calendar"
```

---

### Task 17: Add calendar sync error feedback to calendar page

**Files:**
- Modify: `src/app/(public)/dashboard/calendar/page.tsx`

**Step 1: Update the calendar page to show sync warnings**

The calendar page calls `blockDate`, `unblockDate`, and `blockDateRange`. After each call, check for `calendarSyncFailed` and show a warning.

Find the places where `result.success` is checked after calling these server actions and add a sync warning message. The pattern is:

```typescript
if (result.success) {
  showSuccessMessage('Datum blockerat')
  if (result.calendarSyncFailed) {
    showErrorMessage('Datumet blockerades, men kunde inte synkas till Google Kalender')
  }
  await fetchData()
}
```

Apply this pattern to all 3 server action call sites in the calendar page:
1. `blockDate` call (for single date click)
2. `unblockDate` call (for unblocking click)
3. `blockDateRange` call (for range blocking modal)

**Step 2: Verify it compiles and renders**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/app/(public)/dashboard/calendar/page.tsx
git commit -m "feat: show calendar sync failure warnings on dashboard calendar"
```

---

### Task 18: Add environment variables template

**Files:**
- Modify: `.env.example` (or `.env.local.example` if it exists, otherwise create `.env.example`)

**Step 1: Add the new env vars**

Append to the env example file:

```
# Google Calendar Sync
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CALENDAR_ENCRYPTION_KEY=   # Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add Google Calendar env vars to .env.example"
```

---

### Task 19: Final verification

**Step 1: Full TypeScript check**

Run: `npx tsc --noEmit`

Expected: No errors.

**Step 2: Dev server starts**

Run: `npm run dev`

Expected: Server starts without errors.

**Step 3: Visual check**

1. Navigate to `/dashboard/settings` — verify the "Integrationer" card appears
2. It should show "Koppla Google Kalender" button (since no env vars are set, OAuth won't work yet)

**Step 4: Final commit (if any fixes were needed)**

Only if earlier tasks needed corrections.
