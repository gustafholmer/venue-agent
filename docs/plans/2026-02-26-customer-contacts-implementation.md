# Customer Contact List Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an auto-populating CRM for venue owners — contacts created from bookings and inquiries, with list views, detail pages, CSV export, and outbound messaging.

**Architecture:** New `venue_contacts` table with denormalized summary fields, upserted from existing `createInquiry` and `createBookingRequest` actions. Per-venue and cross-venue list pages follow existing dashboard patterns. Outbound messaging reuses the inquiry + message infrastructure.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL + RLS), TypeScript, Tailwind CSS

---

### Task 1: Database Migration — Create `venue_contacts` Table

**Files:**
- Create: `supabase/migrations/20260226120000_create_venue_contacts.sql`

**Step 1: Write the migration**

```sql
-- Create venue_contacts table
create table public.venue_contacts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  company_name text,
  total_bookings integer not null default 0,
  completed_bookings integer not null default 0,
  total_inquiries integer not null default 0,
  total_spend numeric not null default 0,
  first_interaction_at timestamptz not null default now(),
  last_interaction_at timestamptz not null default now(),
  event_types text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One contact per customer-email per venue
alter table public.venue_contacts
  add constraint venue_contacts_venue_email_unique unique (venue_id, customer_email);

-- Index for owner-scoped queries (get all contacts for owned venues)
create index idx_venue_contacts_venue_id on public.venue_contacts(venue_id);

-- Index for customer lookup (backfill customer_id when they sign up)
create index idx_venue_contacts_customer_email on public.venue_contacts(customer_email);

-- RLS
alter table public.venue_contacts enable row level security;

-- Venue owners can read contacts for their venues
create policy "Venue owners can view their contacts"
  on public.venue_contacts for select
  using (
    venue_id in (
      select id from public.venues where owner_id = auth.uid()
    )
  );
```

**Step 2: Apply the migration**

Run: `npx supabase db push` or apply via Supabase dashboard.

**Step 3: Commit**

```bash
git add supabase/migrations/20260226120000_create_venue_contacts.sql
git commit -m "feat: add venue_contacts table migration"
```

---

### Task 2: TypeScript Types — Add `venue_contacts` to `database.ts`

**Files:**
- Modify: `src/types/database.ts`

**Step 1: Add the table type block**

Insert the `venue_contacts` table definition inside `Database['public']['Tables']`, after the `agent_sessions` block (after line 665, before the closing `}` of `Tables`):

```typescript
      venue_contacts: {
        Row: {
          id: string
          venue_id: string
          customer_id: string | null
          customer_name: string
          customer_email: string
          customer_phone: string | null
          company_name: string | null
          total_bookings: number
          completed_bookings: number
          total_inquiries: number
          total_spend: number
          first_interaction_at: string
          last_interaction_at: string
          event_types: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          venue_id: string
          customer_id?: string | null
          customer_name: string
          customer_email: string
          customer_phone?: string | null
          company_name?: string | null
          total_bookings?: number
          completed_bookings?: number
          total_inquiries?: number
          total_spend?: number
          first_interaction_at?: string
          last_interaction_at?: string
          event_types?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          venue_id?: string
          customer_id?: string | null
          customer_name?: string
          customer_email?: string
          customer_phone?: string | null
          company_name?: string | null
          total_bookings?: number
          completed_bookings?: number
          total_inquiries?: number
          total_spend?: number
          first_interaction_at?: string
          last_interaction_at?: string
          event_types?: string[]
          created_at?: string
          updated_at?: string
        }
      }
```

**Step 2: Add the convenience alias**

After line 740 (after `export type AgentSession = ...`), add:

```typescript
export type VenueContact = Tables<'venue_contacts'>
```

**Step 3: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add VenueContact type to database types"
```

---

### Task 3: Upsert Contact Helper

**Files:**
- Create: `src/actions/contacts/upsert-contact.ts`

**Context:** This is an internal helper called from `createInquiry` and `createBookingRequest`. It is NOT a user-facing server action — no `'use server'` directive needed since it won't be imported by client components. However, since it will be called from server actions that use the Supabase client, it receives the client as a parameter.

**Step 1: Write the helper**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

interface UpsertContactInput {
  venueId: string
  customerEmail: string
  customerName: string
  customerId?: string | null
  customerPhone?: string | null
  companyName?: string | null
  eventType?: string | null
  source: 'booking' | 'inquiry'
}

export async function upsertContact(
  supabase: SupabaseClient<Database>,
  input: UpsertContactInput
): Promise<void> {
  try {
    const email = input.customerEmail.trim().toLowerCase()
    const now = new Date().toISOString()

    // Check if contact already exists for this venue + email
    const { data: existing } = await supabase
      .from('venue_contacts')
      .select('id, event_types, total_bookings, total_inquiries')
      .eq('venue_id', input.venueId)
      .eq('customer_email', email)
      .maybeSingle()

    if (existing) {
      // Update existing contact
      const updatedEventTypes = existing.event_types || []
      if (input.eventType && !updatedEventTypes.includes(input.eventType)) {
        updatedEventTypes.push(input.eventType)
      }

      const updates: Record<string, unknown> = {
        customer_name: input.customerName,
        last_interaction_at: now,
        event_types: updatedEventTypes,
        updated_at: now,
      }

      // Update optional fields if provided
      if (input.customerPhone) updates.customer_phone = input.customerPhone
      if (input.companyName) updates.company_name = input.companyName
      if (input.customerId) updates.customer_id = input.customerId

      // Increment the appropriate counter
      if (input.source === 'booking') {
        updates.total_bookings = existing.total_bookings + 1
      } else {
        updates.total_inquiries = existing.total_inquiries + 1
      }

      await supabase
        .from('venue_contacts')
        .update(updates)
        .eq('id', existing.id)
    } else {
      // Create new contact
      const eventTypes = input.eventType ? [input.eventType] : []

      await supabase
        .from('venue_contacts')
        .insert({
          venue_id: input.venueId,
          customer_id: input.customerId || null,
          customer_name: input.customerName,
          customer_email: email,
          customer_phone: input.customerPhone || null,
          company_name: input.companyName || null,
          total_bookings: input.source === 'booking' ? 1 : 0,
          total_inquiries: input.source === 'inquiry' ? 1 : 0,
          first_interaction_at: now,
          last_interaction_at: now,
          event_types: eventTypes,
        })
    }
  } catch (error) {
    // Log but don't throw — contact upsert should never block the primary action
    console.error('Error upserting contact:', error)
  }
}
```

**Step 2: Commit**

```bash
git add src/actions/contacts/upsert-contact.ts
git commit -m "feat: add upsert-contact helper for auto-building contacts"
```

---

### Task 4: Integrate Upsert into `createBookingRequest`

**Files:**
- Modify: `src/actions/bookings/create-booking-request.ts`

**Context:** This is the easier integration — all contact fields (`customerName`, `customerEmail`, etc.) are directly available from the input. The upsert call goes after the booking is confirmed (after the `row.booking_id` check at line 211) and before the notification dispatch at line 222.

**Step 1: Add the import**

At the top of the file (after line 11), add:

```typescript
import { upsertContact } from '@/actions/contacts/upsert-contact'
```

**Step 2: Add the upsert call**

After line 219 (end of the error handling block for `row.booking_id`), before line 221 (`// Create notification for venue owner`), insert:

```typescript
    // Upsert venue contact
    await upsertContact(supabase, {
      venueId: input.venueId,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      customerId: user.id,
      customerPhone: input.customerPhone,
      companyName: input.companyName,
      eventType: input.eventType,
      source: 'booking',
    })
```

**Step 3: Verify the app still compiles**

Run: `npx next build` (or `npm run build`)

**Step 4: Commit**

```bash
git add src/actions/bookings/create-booking-request.ts
git commit -m "feat: upsert venue contact on booking creation"
```

---

### Task 5: Integrate Upsert into `createInquiry`

**Files:**
- Modify: `src/actions/inquiries/create-inquiry.ts`

**Context:** Unlike bookings, the inquiry flow only has `user.id` — no name/email/phone. You must fetch the user's profile to get contact fields. The upsert call goes after the inquiry insert succeeds (after line 158) and before the notification dispatch at line 160.

**Step 1: Add the import**

At the top of the file (after line 7), add:

```typescript
import { upsertContact } from '@/actions/contacts/upsert-contact'
```

**Step 2: Fetch the user's profile and upsert**

After line 158 (end of the insert error check), before line 160 (`// Create notification for venue owner`), insert:

```typescript
    // Fetch user profile for contact data
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone, company_name')
      .eq('id', user.id)
      .single()

    if (profile) {
      await upsertContact(supabase, {
        venueId: input.venueId,
        customerEmail: profile.email,
        customerName: profile.full_name || profile.email,
        customerId: user.id,
        customerPhone: profile.phone,
        companyName: profile.company_name,
        eventType: input.eventType,
        source: 'inquiry',
      })
    }
```

**Step 3: Verify the app still compiles**

Run: `npx next build` (or `npm run build`)

**Step 4: Commit**

```bash
git add src/actions/inquiries/create-inquiry.ts
git commit -m "feat: upsert venue contact on inquiry creation"
```

---

### Task 6: Get Contacts Server Actions

**Files:**
- Create: `src/actions/contacts/get-contacts.ts`

**Context:** Two exported functions: `getVenueContacts` for per-venue pages (Pattern A — ownership check on venue_id) and `getAllContacts` for the dashboard-level page (Pattern B — fetch owned venue IDs, then query with `.in()`). Follow the pattern from `get-inbox-items.ts`.

**Step 1: Write the server action**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { VenueContact } from '@/types/database'

export interface ContactFilters {
  search?: string
  sortBy?: 'last_interaction_at' | 'total_spend' | 'total_bookings' | 'customer_name'
  sortOrder?: 'asc' | 'desc'
}

export interface ContactListItem extends VenueContact {
  venue_name?: string
}

export interface GetContactsResult {
  success: boolean
  contacts?: ContactListItem[]
  error?: string
}

export async function getVenueContacts(
  venueId: string,
  filters: ContactFilters = {}
): Promise<GetContactsResult> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Verify venue ownership (Pattern A)
    const { data: venue } = await supabase
      .from('venues')
      .select('id, name')
      .eq('id', venueId)
      .eq('owner_id', user.id)
      .single()

    if (!venue) {
      return { success: false, error: 'Lokalen hittades inte' }
    }

    let query = supabase
      .from('venue_contacts')
      .select('*')
      .eq('venue_id', venueId)

    // Apply search filter
    if (filters.search) {
      const search = `%${filters.search}%`
      query = query.or(`customer_name.ilike.${search},customer_email.ilike.${search},company_name.ilike.${search}`)
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'last_interaction_at'
    const sortOrder = filters.sortOrder || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const { data: contacts, error } = await query

    if (error) {
      console.error('Error fetching venue contacts:', error)
      return { success: false, error: 'Kunde inte hämta kontakter' }
    }

    return {
      success: true,
      contacts: (contacts || []).map(c => ({ ...c, venue_name: venue.name })),
    }
  } catch (error) {
    console.error('Unexpected error fetching venue contacts:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}

export async function getAllContacts(
  filters: ContactFilters & { venueId?: string } = {}
): Promise<GetContactsResult> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Get all venues for this owner (Pattern B)
    const { data: venues } = await supabase
      .from('venues')
      .select('id, name')
      .eq('owner_id', user.id)

    if (!venues || venues.length === 0) {
      return { success: true, contacts: [] }
    }

    const venueIds = filters.venueId
      ? [filters.venueId]
      : venues.map(v => v.id)
    const venueMap = new Map(venues.map(v => [v.id, v.name]))

    // Verify ownership if filtering by specific venue
    if (filters.venueId && !venueMap.has(filters.venueId)) {
      return { success: false, error: 'Lokalen hittades inte' }
    }

    let query = supabase
      .from('venue_contacts')
      .select('*')
      .in('venue_id', venueIds)

    // Apply search filter
    if (filters.search) {
      const search = `%${filters.search}%`
      query = query.or(`customer_name.ilike.${search},customer_email.ilike.${search},company_name.ilike.${search}`)
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'last_interaction_at'
    const sortOrder = filters.sortOrder || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const { data: contacts, error } = await query

    if (error) {
      console.error('Error fetching all contacts:', error)
      return { success: false, error: 'Kunde inte hämta kontakter' }
    }

    return {
      success: true,
      contacts: (contacts || []).map(c => ({
        ...c,
        venue_name: venueMap.get(c.venue_id) || '',
      })),
    }
  } catch (error) {
    console.error('Unexpected error fetching all contacts:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
```

**Step 2: Commit**

```bash
git add src/actions/contacts/get-contacts.ts
git commit -m "feat: add get-contacts server actions for venue and dashboard views"
```

---

### Task 7: Get Contact Detail Server Action

**Files:**
- Create: `src/actions/contacts/get-contact-detail.ts`

**Context:** Returns a single contact with its full activity timeline — all bookings and inquiries for that `(venue_id, customer_email)` pair. Each timeline item includes enough data to render a card and link to the detail page.

**Step 1: Write the server action**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { VenueContact } from '@/types/database'

export interface TimelineItem {
  id: string
  type: 'booking' | 'inquiry'
  status: string
  eventType: string | null
  eventDate: string
  guestCount: number | null
  totalPrice: number | null
  createdAt: string
  href: string
}

export interface ContactDetail extends VenueContact {
  venue_name: string
  average_spend: number
  timeline: TimelineItem[]
}

export interface GetContactDetailResult {
  success: boolean
  contact?: ContactDetail
  error?: string
}

export async function getContactDetail(
  contactId: string
): Promise<GetContactDetailResult> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Get the contact
    const { data: contact, error: contactError } = await supabase
      .from('venue_contacts')
      .select('*')
      .eq('id', contactId)
      .single()

    if (contactError || !contact) {
      return { success: false, error: 'Kontakten hittades inte' }
    }

    // Verify venue ownership
    const { data: venue } = await supabase
      .from('venues')
      .select('id, name')
      .eq('id', contact.venue_id)
      .eq('owner_id', user.id)
      .single()

    if (!venue) {
      return { success: false, error: 'Du har inte behörighet att se denna kontakt' }
    }

    // Build activity timeline — fetch bookings and inquiries for this customer at this venue
    const timeline: TimelineItem[] = []

    // Fetch bookings by email (since customer_id may be null on older bookings)
    const { data: bookings } = await supabase
      .from('booking_requests')
      .select('id, status, event_type, event_date, guest_count, total_price, created_at')
      .eq('venue_id', contact.venue_id)
      .eq('customer_email', contact.customer_email)
      .order('created_at', { ascending: false })

    for (const b of bookings || []) {
      timeline.push({
        id: b.id,
        type: 'booking',
        status: b.status,
        eventType: b.event_type,
        eventDate: b.event_date,
        guestCount: b.guest_count,
        totalPrice: b.total_price,
        createdAt: b.created_at,
        href: `/dashboard/venue/${contact.venue_id}/bookings/${b.id}`,
      })
    }

    // Fetch inquiries — need to match by customer_id (inquiries use user_id FK, not email)
    if (contact.customer_id) {
      const { data: inquiries } = await supabase
        .from('venue_inquiries')
        .select('id, status, event_type, event_date, guest_count, created_at')
        .eq('venue_id', contact.venue_id)
        .eq('user_id', contact.customer_id)
        .order('created_at', { ascending: false })

      for (const inq of inquiries || []) {
        timeline.push({
          id: inq.id,
          type: 'inquiry',
          status: inq.status,
          eventType: inq.event_type,
          eventDate: inq.event_date,
          guestCount: inq.guest_count,
          totalPrice: null,
          createdAt: inq.created_at,
          href: `/dashboard/inquiries/${inq.id}`,
        })
      }
    }

    // Sort timeline by date, newest first
    timeline.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const averageSpend = contact.completed_bookings > 0
      ? contact.total_spend / contact.completed_bookings
      : 0

    return {
      success: true,
      contact: {
        ...contact,
        venue_name: venue.name,
        average_spend: averageSpend,
        timeline,
      },
    }
  } catch (error) {
    console.error('Unexpected error fetching contact detail:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
```

**Step 2: Commit**

```bash
git add src/actions/contacts/get-contact-detail.ts
git commit -m "feat: add get-contact-detail action with activity timeline"
```

---

### Task 8: Export Contacts Server Action

**Files:**
- Create: `src/actions/contacts/export-contacts.ts`

**Context:** Returns CSV as a string. The client triggers download via Blob URL. Supports both single-venue and all-venues export.

**Step 1: Write the server action**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export interface ExportContactsResult {
  success: boolean
  csv?: string
  error?: string
}

export async function exportContacts(
  venueId?: string
): Promise<ExportContactsResult> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Get owned venues
    const { data: venues } = await supabase
      .from('venues')
      .select('id')
      .eq('owner_id', user.id)

    if (!venues || venues.length === 0) {
      return { success: false, error: 'Inga lokaler hittades' }
    }

    const venueIds = venueId ? [venueId] : venues.map(v => v.id)

    // Verify ownership if filtering by specific venue
    if (venueId && !venues.some(v => v.id === venueId)) {
      return { success: false, error: 'Lokalen hittades inte' }
    }

    const { data: contacts, error } = await supabase
      .from('venue_contacts')
      .select('*')
      .in('venue_id', venueIds)
      .order('last_interaction_at', { ascending: false })

    if (error) {
      return { success: false, error: 'Kunde inte hämta kontakter' }
    }

    if (!contacts || contacts.length === 0) {
      return { success: false, error: 'Inga kontakter att exportera' }
    }

    // Build CSV
    const headers = [
      'Namn', 'E-post', 'Telefon', 'Företag',
      'Antal bokningar', 'Totalt spenderat (kr)', 'Eventtyper',
      'Första interaktion', 'Senaste aktivitet',
    ]

    const rows = contacts.map(c => [
      escapeCsvField(c.customer_name),
      escapeCsvField(c.customer_email),
      escapeCsvField(c.customer_phone || ''),
      escapeCsvField(c.company_name || ''),
      String(c.completed_bookings),
      String(c.total_spend),
      escapeCsvField((c.event_types || []).join(', ')),
      formatDate(c.first_interaction_at),
      formatDate(c.last_interaction_at),
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n')

    return { success: true, csv }
  } catch (error) {
    console.error('Unexpected error exporting contacts:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('sv-SE')
}
```

**Step 2: Commit**

```bash
git add src/actions/contacts/export-contacts.ts
git commit -m "feat: add CSV export server action for contacts"
```

---

### Task 9: Create Outbound Inquiry Server Action

**Files:**
- Create: `src/actions/contacts/create-outbound-inquiry.ts`

**Context:** Creates a venue-owner-initiated inquiry thread with a past customer. Reuses the existing `venue_inquiries` table and `sendMessage` action. The inquiry's `user_id` is the customer (so it shows up in their inquiry list), but the first message is sent by the venue owner.

**Step 1: Write the server action**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { sendMessage } from '@/actions/messages/send-message'
import { dispatchNotification } from '@/lib/notifications/create-notification'
import { upsertContact } from '@/actions/contacts/upsert-contact'
import { ALLOWED_EVENT_TYPE_VALUES } from '@/lib/constants'

export interface CreateOutboundInquiryInput {
  contactId: string
  eventDate: string
  eventType: string
  guestCount: number
  message: string
}

export interface CreateOutboundInquiryResult {
  success: boolean
  inquiryId?: string
  error?: string
}

export async function createOutboundInquiry(
  input: CreateOutboundInquiryInput
): Promise<CreateOutboundInquiryResult> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Get the contact
    const { data: contact } = await supabase
      .from('venue_contacts')
      .select('*')
      .eq('id', input.contactId)
      .single()

    if (!contact) {
      return { success: false, error: 'Kontakten hittades inte' }
    }

    // Verify venue ownership
    const { data: venue } = await supabase
      .from('venues')
      .select('id, name, owner_id')
      .eq('id', contact.venue_id)
      .eq('owner_id', user.id)
      .single()

    if (!venue) {
      return { success: false, error: 'Du har inte behörighet' }
    }

    // Customer must have an account
    if (!contact.customer_id) {
      return { success: false, error: 'Kunden har inget Tryffle-konto och kan inte ta emot meddelanden' }
    }

    // Prevent self-messaging
    if (contact.customer_id === user.id) {
      return { success: false, error: 'Du kan inte skicka meddelanden till dig själv' }
    }

    // Validate fields
    if (!input.eventDate || !input.eventType || !input.guestCount || !input.message?.trim()) {
      return { success: false, error: 'Alla fält måste fyllas i' }
    }

    if (!ALLOWED_EVENT_TYPE_VALUES.includes(input.eventType.toLowerCase())) {
      return { success: false, error: 'Ogiltig eventtyp' }
    }

    const eventDate = new Date(input.eventDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (eventDate <= today) {
      return { success: false, error: 'Datum måste vara i framtiden' }
    }

    if (input.message.trim().length > 2000) {
      return { success: false, error: 'Meddelandet får max vara 2000 tecken' }
    }

    // Create the inquiry with customer as user_id (so it shows in their list)
    const { data: inquiry, error: insertError } = await supabase
      .from('venue_inquiries')
      .insert({
        venue_id: contact.venue_id,
        user_id: contact.customer_id,
        event_date: input.eventDate,
        event_type: input.eventType,
        guest_count: input.guestCount,
        message: input.message.trim(),
      })
      .select('id')
      .single()

    if (insertError || !inquiry) {
      console.error('Error creating outbound inquiry:', insertError)
      return { success: false, error: 'Kunde inte skapa förfrågan' }
    }

    // Send the first message as the venue owner
    await sendMessage(inquiry.id, input.message.trim(), 'inquiry')

    // Notify the customer
    await dispatchNotification({
      recipient: contact.customer_id,
      category: 'new_inquiry',
      headline: 'Nytt meddelande',
      body: `${venue.name} har skickat dig ett meddelande`,
      reference: { kind: 'inquiry', id: inquiry.id },
      author: user.id,
      extra: {
        venue_name: venue.name,
        event_date: input.eventDate,
      },
    })

    // Update contact stats
    await upsertContact(supabase, {
      venueId: contact.venue_id,
      customerEmail: contact.customer_email,
      customerName: contact.customer_name,
      customerId: contact.customer_id,
      eventType: input.eventType,
      source: 'inquiry',
    })

    return { success: true, inquiryId: inquiry.id }
  } catch (error) {
    console.error('Unexpected error creating outbound inquiry:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
```

**Step 2: Commit**

```bash
git add src/actions/contacts/create-outbound-inquiry.ts
git commit -m "feat: add outbound inquiry action for venue-owner-initiated messaging"
```

---

### Task 10: Navigation — Add "Kontakter" to Sidebar and Venue Nav

**Files:**
- Modify: `src/components/dashboard/nav-items.ts`
- Modify: `src/components/dashboard/venue-nav.tsx`

**Step 1: Add to sidebar nav**

In `src/components/dashboard/nav-items.ts`, add `Kontakter` after `Inkorg` (line 4):

```typescript
export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Översikt' },
  { href: '/dashboard/venue', label: 'Mina lokaler' },
  { href: '/dashboard/inbox', label: 'Inkorg' },
  { href: '/dashboard/contacts', label: 'Kontakter' },
  { href: '/dashboard/payouts', label: 'Utbetalningar' },
  { href: '/dashboard/settings', label: 'Inställningar' },
]
```

**Step 2: Add to venue nav**

In `src/components/dashboard/venue-nav.tsx`, add `Kontakter` after `Kalender` (line 14):

```typescript
const NAV_ITEMS = [
  { path: '', label: 'Lokal' },
  { path: '/bookings', label: 'Bokningar' },
  { path: '/inquiries', label: 'Förfrågningar' },
  { path: '/contacts', label: 'Kontakter' },
  { path: '/calendar', label: 'Kalender' },
]
```

**Step 3: Commit**

```bash
git add src/components/dashboard/nav-items.ts src/components/dashboard/venue-nav.tsx
git commit -m "feat: add Kontakter to dashboard sidebar and venue nav"
```

---

### Task 11: Dashboard Contacts List Page

**Files:**
- Create: `src/app/(public)/dashboard/contacts/page.tsx`

**Context:** Cross-venue contact list. Follow the pattern from `src/app/(public)/dashboard/inbox/page.tsx` — `'use client'`, `useSearchParams` for filters, `useState`/`useEffect`/`useCallback`. Includes search input, venue filter (for multi-venue owners), sort options, and CSV export button.

**Step 1: Write the page**

Build a page that:
- Calls `getAllContacts(filters)` on mount and when filters change
- Renders a search input at the top
- Shows a responsive list: mobile cards + desktop table (follow bookings page pattern)
- Desktop table columns: Namn (name + email), Företag, Lokal (venue name — since this is cross-venue), Bokningar, Totalt spenderat, Senaste aktivitet
- Each row links to `/dashboard/venue/${contact.venue_id}/contacts/${contact.id}`
- Export button calls `exportContacts()` and triggers a CSV download
- Loading skeleton and empty state

**Key UI details:**
- Page title: "Kontakter"
- Empty state message: "Inga kontakter ännu. Kontakter skapas automatiskt när kunder bokar eller skickar förfrågningar."
- Use the same color palette: `text-[#1a1a1a]`, `text-[#78716c]`, `text-[#a8a29e]`, `border-[#e7e5e4]`, `bg-[#fafaf9]`, accent `text-[#c45a3b]`
- Format spend as SEK: `new Intl.NumberFormat('sv-SE').format(amount) + ' kr'`
- Format dates with `formatTimestamp` from `@/components/notifications/notification-utils` (already used in inbox page)

**Step 2: Verify it renders**

Run: `npm run dev`, navigate to `/dashboard/contacts`, verify the page loads with skeleton → empty state.

**Step 3: Commit**

```bash
git add src/app/\(public\)/dashboard/contacts/page.tsx
git commit -m "feat: add dashboard-level contacts list page"
```

---

### Task 12: Per-Venue Contacts List Page

**Files:**
- Create: `src/app/(public)/dashboard/venue/[id]/contacts/page.tsx`

**Context:** Per-venue contact list. Follow the pattern from `src/app/(public)/dashboard/venue/[id]/bookings/page.tsx` — `'use client'`, reads `venueId` from `useParams<{ id: string }>()`, fetches via `getVenueContacts(venueId, filters)`.

**Step 1: Write the page**

Build a page that:
- Calls `getVenueContacts(venueId, filters)` on mount and when filters/sort change
- Renders search input + sort dropdown
- Desktop table columns: Namn (name + email), Företag, Bokningar, Totalt spenderat, Senaste aktivitet (no Lokal column since it's venue-scoped)
- Each row links to `/dashboard/venue/${venueId}/contacts/${contact.id}`
- Export button calls `exportContacts(venueId)` and triggers CSV download
- Same loading skeleton and empty state pattern as Task 11

**Step 2: Verify it renders**

Run: `npm run dev`, navigate to `/dashboard/venue/[id]/contacts`, verify it loads.

**Step 3: Commit**

```bash
git add src/app/\(public\)/dashboard/venue/\[id\]/contacts/page.tsx
git commit -m "feat: add per-venue contacts list page"
```

---

### Task 13: Contact Detail Page

**Files:**
- Create: `src/app/(public)/dashboard/venue/[id]/contacts/[contactId]/page.tsx`

**Context:** Full contact detail with summary card, stats, and activity timeline. Follow the detail page pattern — `'use client'`, reads params, fetches `getContactDetail(contactId)`.

**Step 1: Write the page**

Build a page with three sections:

**Summary card** at the top:
- Customer name (large), email, phone (if available), company name (if available)
- Three stat boxes in a row: "Bokningar" (completed_bookings count), "Totalt spenderat" (formatted SEK), "Snittbelopp" (average_spend formatted SEK)

**Action bar:**
- "Skicka meddelande" button — opens the outbound inquiry modal (Task 14). Disabled with tooltip "Kunden behöver ett Tryffle-konto" if `customer_id` is null.
- "Exportera CSV" button — exports just this contact

**Activity timeline:**
- Chronological list of all bookings and inquiries
- Each item shows: date, type badge (Bokning/Förfrågan), event type + guest count, status badge, total price (for bookings)
- Each item is a link to the booking/inquiry detail page
- Use the same `StatusBadge` pattern from the inbox page

**Step 2: Verify it renders**

Run: `npm run dev`, navigate to a contact detail page.

**Step 3: Commit**

```bash
git add src/app/\(public\)/dashboard/venue/\[id\]/contacts/\[contactId\]/page.tsx
git commit -m "feat: add contact detail page with timeline and stats"
```

---

### Task 14: Outbound Inquiry Modal Component

**Files:**
- Create: `src/components/contacts/outbound-inquiry-modal.tsx`
- Modify: `src/app/(public)/dashboard/venue/[id]/contacts/[contactId]/page.tsx` (import and wire up)

**Context:** A modal dialog for sending a message to a past customer. Uses Radix UI Dialog (already a dependency — see `@radix-ui/react-dialog` in package.json). Contains a form with event date, event type, guest count, and message fields. Pre-fills event type and guest count from the contact's most recent interaction when available.

**Step 1: Write the modal component**

```typescript
'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { createOutboundInquiry, type CreateOutboundInquiryInput } from '@/actions/contacts/create-outbound-inquiry'
import { useRouter } from 'next/navigation'

interface OutboundInquiryModalProps {
  contactId: string
  contactName: string
  defaultEventType?: string
  defaultGuestCount?: number
  children: React.ReactNode // trigger button
}
```

The modal should:
- Use `Dialog.Root` / `Dialog.Trigger` / `Dialog.Portal` / `Dialog.Overlay` / `Dialog.Content` from Radix
- Title: "Skicka meddelande till {contactName}"
- Form fields: Datum (date input), Eventtyp (select with values from `ALLOWED_EVENT_TYPE_VALUES` — import from `@/lib/constants`), Antal gäster (number input), Meddelande (textarea)
- Pre-fill eventType and guestCount from props
- Submit calls `createOutboundInquiry(input)`
- On success: close modal, redirect to the new inquiry detail page (`/dashboard/inquiries/${inquiryId}`)
- On error: show inline error message
- Loading state on submit button

**Step 2: Wire up in contact detail page**

Import the modal in the contact detail page and wrap the "Skicka meddelande" button with it. Pass `contactId`, `contactName`, and default values from the contact's most recent timeline item.

**Step 3: Verify it works**

Run: `npm run dev`, navigate to a contact detail, click "Skicka meddelande", verify the modal opens and the form submits.

**Step 4: Commit**

```bash
git add src/components/contacts/outbound-inquiry-modal.tsx src/app/\(public\)/dashboard/venue/\[id\]/contacts/\[contactId\]/page.tsx
git commit -m "feat: add outbound inquiry modal for messaging past customers"
```

---

### Task 15: Verification & Polish

**Files:**
- All files from previous tasks

**Step 1: Full build check**

Run: `npm run build`
Expected: Clean build, no TypeScript errors.

**Step 2: Manual testing checklist**

1. Create a booking request → verify a contact appears in `/dashboard/venue/[id]/contacts`
2. Create an inquiry → verify a contact appears or is updated
3. Same customer books again → verify counters increment, not a new contact
4. Check `/dashboard/contacts` shows contacts across all venues
5. Click into a contact → verify summary card, stats, and timeline render correctly
6. Click a timeline item → verify it links to the correct booking/inquiry detail
7. Click "Exportera CSV" → verify CSV downloads with correct data
8. Click "Skicka meddelande" → verify modal opens, submit creates inquiry, redirects to thread
9. Check that the new inquiry appears in the customer's inquiry list
10. Verify mobile responsiveness on all three pages

**Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: polish contact list pages and fix issues found in testing"
```
