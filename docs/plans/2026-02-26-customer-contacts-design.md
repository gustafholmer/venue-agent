# Customer Contact List — Design

## Overview

A self-building CRM for venue owners. Every booking request and inquiry automatically creates or enriches a contact tied to that venue. After a year of activity, a venue owner has a complete list of past customers with full history — name, company, event types, spend, dates. Walking away from Tryffle means walking away from that list.

## Goals

- Zero manual effort for venue owners — contacts build themselves from platform activity
- Rich per-contact detail with activity timeline and aggregated stats
- Outbound messaging to past customers, driving repeat bookings through the platform
- CSV export for flexibility and trust
- Both per-venue and cross-venue views for multi-venue owners

## Data Model

### New table: `venue_contacts`

| Column | Type | Description |
|---|---|---|
| `id` | uuid, PK | |
| `venue_id` | uuid, FK → venues | Which venue this contact belongs to |
| `customer_id` | uuid, FK → profiles, nullable | Linked profile (null if booked without account) |
| `customer_name` | text | Denormalized — latest known name |
| `customer_email` | text | Canonical identifier for deduplication |
| `customer_phone` | text, nullable | Denormalized |
| `company_name` | text, nullable | Denormalized |
| `total_bookings` | int, default 0 | All booking requests |
| `completed_bookings` | int, default 0 | Completed/paid-out only |
| `total_inquiries` | int, default 0 | Inquiry threads |
| `total_spend` | numeric, default 0 | Sum of total_price from completed bookings |
| `first_interaction_at` | timestamptz | Earliest booking or inquiry |
| `last_interaction_at` | timestamptz | Most recent activity |
| `event_types` | text[] | Distinct event types across all interactions |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Unique constraint:** `(venue_id, customer_email)` — email is the deduplication key because bookings can exist without a linked profile.

**RLS:** Venue owner can SELECT contacts where `venue_id` belongs to a venue they own. No direct INSERT/UPDATE/DELETE — managed by server actions.

### Sync points

Contacts are upserted from existing server actions:

- `createInquiry` → upsert contact (increment `total_inquiries`, update timestamps, add event type)
- `createBookingRequest` → upsert contact (increment `total_bookings`, update timestamps, add event type)
- Booking status → `completed`/`paid_out` → increment `completed_bookings`, add to `total_spend`

No database triggers. Application-level updates following existing patterns.

## Server Actions

### `src/actions/contacts/`

**`upsert-contact.ts`** — internal helper, not user-facing. Called from inquiry/booking actions. Upserts by `(venue_id, customer_email)`, creates if new, increments counters if existing. Updates name/phone/company/customer_id to latest known values.

**`get-contacts.ts`** — `getVenueContacts(venueId, filters?)`. Per-venue contact list with optional search (name/email/company) and sort (last_interaction, total_spend, total_bookings). Ownership check on venue_id (Pattern A).

**`get-all-contacts.ts`** — `getAllContacts(filters?)`. Cross-venue aggregated list with optional venue filter. Fetches owned venue IDs first (Pattern B).

**`get-contact-detail.ts`** — single contact with activity timeline. Returns the contact row plus all related `booking_requests` and `venue_inquiries` for that `(venue_id, customer_email)`, ordered by date. Each timeline item includes status, event type, date, and link path.

**`export-contacts.ts`** — returns CSV as string. Client triggers download via Blob URL. Scoped to venue or all venues.

**`create-outbound-inquiry.ts`** — creates a venue-owner-initiated inquiry thread with a past customer. See Outbound Messaging section.

## Pages & Navigation

### Dashboard-level

- `/dashboard/contacts` — aggregated contact list across all venues, filterable by venue
- Added to sidebar in `nav-items.ts` as "Kontakter", between "Inkorg" and "Utbetalningar"

### Venue-scoped

- `/dashboard/venue/[id]/contacts` — contacts for that specific venue
- Added to `venue-nav.tsx` as "Kontakter" tab, after "Bokningar"

### Contact detail

- `/dashboard/venue/[id]/contacts/[contactId]` — full detail view
- Accessible from both list views (dashboard-level links to venue-scoped detail)

### Page patterns

Following existing conventions:

- `'use client'` components fetching via server actions in `useEffect`
- URL state for filters via `useSearchParams`
- Mobile card list + desktop table layout
- Skeleton loading states
- Empty state with centered icon + message

### Contact list columns (desktop)

| Namn | Foretag | Bokningar | Totalt spenderat | Senaste aktivitet |
|---|---|---|---|---|
| Name + email | Company | completed_bookings | Formatted SEK | Relative date |

### Contact detail layout

```
+-----------------------------------------+
| Summary Card                            |
| Name, email, phone, company             |
| +----------+ +----------+ +----------+  |
| | Bokningar| | Spenderat| | Snitt    |  |
| |    5     | | 45 000 kr| | 9 000 kr |  |
| +----------+ +----------+ +----------+  |
+-----------------------------------------+
| [Skicka meddelande]  [Exportera CSV]    |
+-----------------------------------------+
| Aktivitet                               |
|                                         |
| 2026-02-20  Bokning - AW, 30 gaster    |
|             Genomford · 12 000 kr    -> |
|                                         |
| 2026-01-15  Forfragen - Konferens       |
|             Stangd                   -> |
|                                         |
| 2025-11-03  Bokning - Julbord, 50 gaster|
|             Genomford · 33 000 kr    -> |
+-----------------------------------------+
```

Each timeline item links to its booking or inquiry detail page.

## Outbound Messaging

### Flow

1. Venue owner clicks "Skicka meddelande" on a contact detail page
2. Modal opens with form: event date, event type, guest count, message — pre-filled from contact's history where possible
3. Submitting creates a new `venue_inquiry` with `user_id = contact.customer_id`
4. First message in the thread sent by the venue owner via existing `sendMessage`
5. Customer receives notification and sees the thread in their inquiry list
6. Standard inquiry flow from there — messaging, possible conversion to booking

### Why this works

- Reuses entire existing inquiry + messaging infrastructure
- Thread visible in both owner's inbox and customer's inquiry list
- Leads to bookings through existing conversion flow

### Constraints

- Requires `customer_id` to be non-null (customer has a Tryffle account)
- "Skicka meddelande" disabled with tooltip for contacts without an account
- `createOutboundInquiry` rejects if `contact.customer_id === venue.owner_id`

### Action: `createOutboundInquiry(contactId, input)`

- Validates venue ownership, contact exists, customer_id not null
- Creates `venue_inquiry` with `user_id = contact.customer_id`, `venue_id = contact.venue_id`
- Sends first message as venue owner via `sendMessage`
- Dispatches notification to customer
- Updates contact's `last_interaction_at` and `total_inquiries`

## CSV Export

### Exported columns

| Column | Source |
|---|---|
| Namn | customer_name |
| E-post | customer_email |
| Telefon | customer_phone |
| Foretag | company_name |
| Antal bokningar | completed_bookings |
| Totalt spenderat (kr) | total_spend |
| Eventtyper | event_types joined with comma |
| Forsta interaktion | first_interaction_at |
| Senaste aktivitet | last_interaction_at |

### Export locations

- Contact list pages (both dashboard-level and venue-scoped) — exports current filtered list
- Contact detail page — exports that one contact's row

### Implementation

Server action returns CSV string. Client creates Blob and triggers download: `kontakter-{venue-slug}-{date}.csv`.

## Edge Cases

- **Customer changes profile info:** Contact row updates to latest values on next interaction
- **Same person, different emails:** Treated as separate contacts. No automated merging in v1.
- **Booking without account:** Contact created with email only. `customer_id` backfilled on next interaction if they sign up.
- **Venue owner is also a customer (dual-role):** `createOutboundInquiry` rejects self-messaging

## Future (v2)

- Outbound messaging to contacts without accounts (email-based)
- Contact merging for same person with multiple emails
- Manual notes and tags on contacts
- Smart segments (e.g. "repeat customers", "high spenders")
