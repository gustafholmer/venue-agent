# Booking Modification Design

## Problem

No way to modify a booking after creation. Dates and guest counts change constantly in event planning. Without modification support, users must cancel and rebook, which is friction for both parties and risks losing the booking slot.

## Decision Summary

- **Approach:** New `booking_modifications` table (Approach A — modification request table)
- **Who can modify:** Both customer and venue owner can propose changes
- **Modifiable fields:** Date, time, guest count, and pricing
- **Approval:** All changes require approval from the other party
- **Diff display:** Show old vs new values when reviewing a proposal
- **Limits:** No limit on total modifications; one pending modification per booking at a time

## Data Model

### New table: `booking_modifications`

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| booking_request_id | UUID (FK) | References `booking_requests` |
| proposed_by | UUID (FK) | References `profiles` — the user who proposed |
| status | text | `'pending'` / `'accepted'` / `'declined'` |
| proposed_event_date | date | null = no change |
| proposed_start_time | time | null = no change |
| proposed_end_time | time | null = no change |
| proposed_guest_count | integer | null = no change |
| proposed_base_price | numeric | null = no change |
| proposed_platform_fee | numeric | Calculated server-side from proposed_base_price |
| proposed_total_price | numeric | Calculated server-side |
| proposed_venue_payout | numeric | Calculated server-side |
| reason | text | Optional, max 500 chars — why the change is needed |
| responded_at | timestamptz | Set when accepted or declined |
| decline_reason | text | Max 500 chars |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

### Constraints

- **One pending per booking:** Unique partial index on `(booking_request_id) WHERE status = 'pending'`
- **Only modifiable statuses:** Modifications can only be proposed on bookings with status `pending` or `accepted`
- **Date availability:** Checked at accept time (not proposal time) for accepted bookings with date changes

### No changes to `booking_requests`

The booking record is only updated when a modification is accepted. The `updated_at` field reflects when the last change was applied.

## Server Actions

### `proposeModification(bookingId, changes)`

**Who:** Customer or venue owner (must be a party to the booking)
**When:** Booking status is `pending` or `accepted`, no pending modification exists

1. Validate user is either the customer or the venue owner
2. Check booking status is `pending` or `accepted`
3. Check no pending modification exists
4. Validate proposed values (guest count within capacity, date in future, price > 0)
5. If `proposed_base_price` set, calculate fee/total/payout server-side
6. Insert into `booking_modifications`
7. Dispatch `booking_modification_proposed` notification to the other party
8. Revalidate paths

### `acceptModification(modificationId)`

**Who:** The other party (not the proposer)
**When:** Modification status is `pending`

1. Validate user is the other party
2. Check modification is still `pending`
3. If date changing on an `accepted` booking:
   - Check new date is available
   - Delete old blocked date entry
   - Insert new blocked date entry
4. Update `booking_requests` with new values (only non-null proposed fields)
5. Set modification `status = 'accepted'`, `responded_at = now()`
6. Dispatch `booking_modification_accepted` notification
7. Revalidate paths

**Note:** If only `guest_count` changes without an explicit `base_price` proposal, the price stays the same. Venue pricing is per-day, not per-guest.

### `declineModification(modificationId, reason)`

**Who:** The other party (not the proposer)
**When:** Modification status is `pending`

1. Validate user is the other party
2. Set `status = 'declined'`, `decline_reason`, `responded_at`
3. Dispatch `booking_modification_declined` notification
4. **No changes to the booking**

### `cancelModification(modificationId)`

**Who:** The proposer (withdraw their own proposal)
**When:** Modification status is `pending`

1. Validate user is the proposer
2. Delete the modification record
3. Optionally notify the other party

## Notification Types

- `booking_modification_proposed` — to the other party
- `booking_modification_accepted` — to the proposer
- `booking_modification_declined` — to the proposer

## UI

### Customer side (`/account/bookings/[id]`)

1. **"Foreslå ändring" button** — visible when booking is `pending` or `accepted` and no modification is pending
2. **Modification form** (modal or inline) — pre-filled with current values. Customer can edit date, time, guest count. Price is read-only for customers. Optional reason textarea.
3. **Pending modification banner:**
   - Proposed by customer (awaiting owner): "Du har föreslagit en ändring — väntar på svar" + cancel button
   - Proposed by owner (awaiting customer): Diff display + "Godkänn" / "Neka" buttons + owner's reason

### Venue owner side (`/dashboard/bookings/[id]`)

1. **"Foreslå ändring" button** — same conditions
2. **Modification form** — includes all fields: date, time, guest count, **and price**
3. **Pending modification banner** — mirrored logic from customer side

### Diff display format

Shows only changed fields:

```
Datum:         15 mars 2026 → 22 mars 2026
Antal gäster:  60 → 80
Pris:          15 000 kr → 18 000 kr (totalt: 16 800 kr → 20 160 kr)
```

With proposer's reason below, if provided.

### Email notifications (Supabase Edge Functions)

- **Modification proposed:** "En ändring har föreslagits för din bokning av {venue}" — includes diff and CTA
- **Modification accepted:** "Ändringsförslaget för din bokning av {venue} har godkänts" — includes new values
- **Modification declined:** In-app notification only (booking is unchanged)

## Edge Cases

1. **Date conflict at accept time:** New date became unavailable between proposal and acceptance. Return error: "Det nya datumet är inte längre tillgängligt."
2. **Booking cancelled while modification pending:** Clean up (delete) any pending modification automatically.
3. **Booking declined while modification pending:** Same cleanup.
4. **Proposer = responder prevention:** Accept/decline actions verify the user is the other party.
5. **Race condition on one-pending constraint:** The unique partial index handles this at the database level.
6. **Past event dates:** Propose action validates any proposed date is in the future.

## Bug Fix (Included)

The existing cancel flow (`cancel-booking.ts`) uses `"Bokning: {bookingId}"` to match blocked dates, but accept creates them with `"Bokning: {customer_name}"`. These never match, so cancelling an accepted booking doesn't unblock the date. Fix this as part of this work since modification acceptance also manipulates blocked dates.

## Testing

- Propose/accept/decline/cancel modification actions
- Authorization: can't accept own proposal, non-parties can't access
- Constraint: can't propose when one is pending, can't modify cancelled/declined bookings
- Date conflict: accept fails when new date unavailable
- Cascade: cancelling a booking cleans up pending modifications
