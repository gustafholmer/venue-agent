# Booking Modification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow both customers and venue owners to propose, accept, and decline booking modifications (date, time, guest count, price) with full audit trail.

**Architecture:** New `booking_modifications` table stores proposed changes as separate records linked to bookings. Each modification has its own lifecycle (pending → accepted/declined). Server actions follow the existing pattern (UUID validation, auth check, Supabase query, notification dispatch). UI uses the existing custom modal pattern on both booking detail pages.

**Tech Stack:** Next.js server actions, Supabase PostgreSQL, TypeScript, Tailwind CSS, Supabase Edge Functions (Deno) for email

**Design doc:** `docs/plans/2026-02-25-booking-modification-design.md`

**Note on testing:** This project has no test infrastructure. Tasks are structured for TDD readiness but do not include test steps. Test setup (vitest) can be added separately.

---

### Task 1: Add types and notification types to database.ts

**Files:**
- Modify: `src/types/database.ts`

**Step 1: Add BookingModificationStatus type**

After the `BookingStatus` type, add:

```typescript
export type BookingModificationStatus = 'pending' | 'accepted' | 'declined'
```

**Step 2: Add BookingModification type**

After the `BookingRequest` type alias (find where `export type BookingRequest = ...` is), add:

```typescript
export interface BookingModification {
  id: string
  booking_request_id: string
  proposed_by: string
  status: BookingModificationStatus
  proposed_event_date: string | null
  proposed_start_time: string | null
  proposed_end_time: string | null
  proposed_guest_count: number | null
  proposed_base_price: number | null
  proposed_platform_fee: number | null
  proposed_total_price: number | null
  proposed_venue_payout: number | null
  reason: string | null
  responded_at: string | null
  decline_reason: string | null
  created_at: string
  updated_at: string
}
```

**Step 3: Add new notification types**

Update the `NotificationType` union to include:

```typescript
export type NotificationType =
  | 'booking_request' | 'booking_accepted' | 'booking_declined' | 'booking_cancelled'
  | 'booking_modification_proposed' | 'booking_modification_accepted' | 'booking_modification_declined'
  | 'new_message' | 'new_match' | 'payment_completed' | 'payout_sent'
```

**Step 4: Add booking_modifications to Database interface**

Find the `Tables` section of the Database interface and add a `booking_modifications` entry following the same Row/Insert/Update pattern used by other tables. The Row type matches the `BookingModification` interface above. Insert type has `id`, `status`, `responded_at`, `decline_reason`, `created_at`, `updated_at` as optional. Update type has all fields optional.

**Step 5: Commit**

```
feat: add BookingModification types and notification types
```

---

### Task 2: Fix cancel-booking.ts bugs

**Files:**
- Modify: `src/actions/bookings/cancel-booking.ts`

**Context:** Two bugs exist:
1. Blocked date deletion uses `Bokning: ${bookingId}` but accept-booking creates with `Bokning: ${booking.customer_name}` — they never match
2. Uses raw `supabase.from('notifications').insert()` instead of `dispatchNotification()`

**Step 1: Fix blocked date reason string**

Change line ~77 from:
```typescript
.eq('reason', `Bokning: ${bookingId}`)
```
to:
```typescript
.eq('reason', `Bokning: ${booking.customer_name}`)
```

**Step 2: Replace raw notification insert with dispatchNotification**

Add import:
```typescript
import { dispatchNotification } from '@/lib/notifications/create-notification'
```

Replace the raw `supabase.from('notifications').insert({...})` block with:
```typescript
await dispatchNotification({
  recipient: venueOwnerId,
  category: 'booking_cancelled',
  headline: 'Bokning avbokad',
  body: `${booking.customer_name} har avbokat bokningen för ${venueName} den ${new Date(booking.event_date).toLocaleDateString('sv-SE')}.`,
  reference: { kind: 'booking', id: bookingId },
  author: user.id,
  extra: {
    customer_name: booking.customer_name,
    venue_name: venueName,
    event_date: booking.event_date,
  },
})
```

**Step 3: Add cleanup of pending modifications on cancel**

After the status update succeeds, before unblocking dates, add:
```typescript
// Clean up any pending modification
await supabase
  .from('booking_modifications')
  .delete()
  .eq('booking_request_id', bookingId)
  .eq('status', 'pending')
```

**Step 4: Commit**

```
fix: correct blocked date cleanup in cancel-booking and use dispatchNotification
```

---

### Task 3: Add cleanup of pending modifications to decline-booking.ts

**Files:**
- Modify: `src/actions/bookings/decline-booking.ts`

**Step 1: Add modification cleanup**

After the status update to `declined` succeeds (and before the notification dispatch), add:
```typescript
// Clean up any pending modification
await supabase
  .from('booking_modifications')
  .delete()
  .eq('booking_request_id', bookingId)
  .eq('status', 'pending')
```

**Step 2: Commit**

```
feat: clean up pending modifications when booking is declined
```

---

### Task 4: Create proposeModification server action

**Files:**
- Create: `src/actions/bookings/propose-modification.ts`

**Step 1: Write the action**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { calculatePricing } from '@/lib/pricing'
import { dispatchNotification } from '@/lib/notifications/create-notification'
import { revalidatePath } from 'next/cache'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface ProposeModificationInput {
  bookingId: string
  proposedEventDate?: string
  proposedStartTime?: string
  proposedEndTime?: string
  proposedGuestCount?: number
  proposedBasePrice?: number
  reason?: string
}

export interface ProposeModificationResult {
  success: boolean
  modificationId?: string
  error?: string
}

export async function proposeModification(
  input: ProposeModificationInput
): Promise<ProposeModificationResult> {
  try {
    const supabase = await createClient()

    if (!UUID_REGEX.test(input.bookingId)) {
      return { success: false, error: 'Ogiltigt boknings-ID' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Fetch booking with venue
    const { data: booking, error: bookingError } = await supabase
      .from('booking_requests')
      .select(`
        *,
        venue:venues!inner(
          id,
          name,
          owner_id,
          max_guests
        )
      `)
      .eq('id', input.bookingId)
      .single()

    if (bookingError || !booking) {
      return { success: false, error: 'Bokningen hittades inte' }
    }

    const venue = booking.venue as unknown as {
      id: string; name: string; owner_id: string; max_guests: number | null
    }

    // Check authorization — must be customer or venue owner
    const isCustomer = booking.customer_id === user.id
    const isOwner = venue.owner_id === user.id
    if (!isCustomer && !isOwner) {
      return { success: false, error: 'Du har inte behörighet att ändra denna bokning' }
    }

    // Check booking status
    if (!['pending', 'accepted'].includes(booking.status)) {
      return { success: false, error: 'Denna bokning kan inte ändras' }
    }

    // Check no pending modification exists
    const { data: pendingMod } = await supabase
      .from('booking_modifications')
      .select('id')
      .eq('booking_request_id', input.bookingId)
      .eq('status', 'pending')
      .single()

    if (pendingMod) {
      return { success: false, error: 'Det finns redan ett pågående ändringsförslag' }
    }

    // Validate at least one change is proposed
    const hasChange = input.proposedEventDate || input.proposedStartTime ||
      input.proposedEndTime || input.proposedGuestCount !== undefined ||
      input.proposedBasePrice !== undefined
    if (!hasChange) {
      return { success: false, error: 'Inga ändringar föreslagna' }
    }

    // Validate proposed date is in the future
    if (input.proposedEventDate) {
      const proposedDate = new Date(input.proposedEventDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (proposedDate <= today) {
        return { success: false, error: 'Datumet måste vara i framtiden' }
      }
    }

    // Validate guest count within venue capacity
    if (input.proposedGuestCount !== undefined) {
      if (input.proposedGuestCount < 1) {
        return { success: false, error: 'Antal gäster måste vara minst 1' }
      }
      if (venue.max_guests && input.proposedGuestCount > venue.max_guests) {
        return {
          success: false,
          error: `Lokalen har max ${venue.max_guests} gäster`,
        }
      }
    }

    // Validate price
    if (input.proposedBasePrice !== undefined && input.proposedBasePrice <= 0) {
      return { success: false, error: 'Priset måste vara större än 0' }
    }

    // Calculate pricing if base price is proposed
    let pricingFields: {
      proposed_platform_fee: number | null
      proposed_total_price: number | null
      proposed_venue_payout: number | null
    } = {
      proposed_platform_fee: null,
      proposed_total_price: null,
      proposed_venue_payout: null,
    }

    if (input.proposedBasePrice !== undefined) {
      const pricing = calculatePricing(input.proposedBasePrice)
      pricingFields = {
        proposed_platform_fee: pricing.platformFee,
        proposed_total_price: pricing.totalPrice,
        proposed_venue_payout: pricing.venuePayout,
      }
    }

    // Validate reason length
    if (input.reason && input.reason.length > 500) {
      return { success: false, error: 'Anledningen får vara max 500 tecken' }
    }

    // Insert modification
    const { data: modification, error: insertError } = await supabase
      .from('booking_modifications')
      .insert({
        booking_request_id: input.bookingId,
        proposed_by: user.id,
        status: 'pending',
        proposed_event_date: input.proposedEventDate || null,
        proposed_start_time: input.proposedStartTime || null,
        proposed_end_time: input.proposedEndTime || null,
        proposed_guest_count: input.proposedGuestCount ?? null,
        proposed_base_price: input.proposedBasePrice ?? null,
        ...pricingFields,
        reason: input.reason || null,
      })
      .select('id')
      .single()

    if (insertError) {
      // Unique constraint violation = another pending modification was created concurrently
      if (insertError.code === '23505') {
        return { success: false, error: 'Det finns redan ett pågående ändringsförslag' }
      }
      console.error('Error creating modification:', insertError)
      return { success: false, error: 'Kunde inte skapa ändringsförslaget' }
    }

    // Notify the other party
    const recipientId = isCustomer ? venue.owner_id : booking.customer_id
    if (recipientId) {
      await dispatchNotification({
        recipient: recipientId,
        category: 'booking_modification_proposed',
        headline: 'Ändringsförslag',
        body: `Ett ändringsförslag har skapats för bokningen av ${venue.name} den ${formatDate(booking.event_date)}.`,
        reference: { kind: 'booking', id: input.bookingId },
        author: user.id,
        extra: {
          venue_name: venue.name,
          event_date: booking.event_date,
          proposed_event_date: input.proposedEventDate || null,
          proposed_guest_count: input.proposedGuestCount ?? null,
        },
      })
    }

    revalidatePath('/account/bookings')
    revalidatePath(`/account/bookings/${input.bookingId}`)
    revalidatePath('/dashboard/bookings')
    revalidatePath(`/dashboard/bookings/${input.bookingId}`)

    return { success: true, modificationId: modification.id }
  } catch (error) {
    console.error('Unexpected error proposing modification:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
```

**Step 2: Commit**

```
feat: add proposeModification server action
```

---

### Task 5: Create acceptModification server action

**Files:**
- Create: `src/actions/bookings/accept-modification.ts`

**Step 1: Write the action**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { dispatchNotification } from '@/lib/notifications/create-notification'
import { revalidatePath } from 'next/cache'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface AcceptModificationResult {
  success: boolean
  error?: string
}

export async function acceptModification(
  modificationId: string
): Promise<AcceptModificationResult> {
  try {
    const supabase = await createClient()

    if (!UUID_REGEX.test(modificationId)) {
      return { success: false, error: 'Ogiltigt ändrings-ID' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Fetch modification with booking and venue
    const { data: modification, error: modError } = await supabase
      .from('booking_modifications')
      .select(`
        *,
        booking:booking_requests!inner(
          *,
          venue:venues!inner(
            id,
            name,
            owner_id
          )
        )
      `)
      .eq('id', modificationId)
      .single()

    if (modError || !modification) {
      return { success: false, error: 'Ändringsförslaget hittades inte' }
    }

    if (modification.status !== 'pending') {
      return { success: false, error: 'Ändringsförslaget är inte längre aktivt' }
    }

    const booking = modification.booking as unknown as {
      id: string
      venue_id: string
      event_date: string
      customer_id: string | null
      customer_name: string
      status: string
      venue: { id: string; name: string; owner_id: string }
    }

    // The acceptor must be the OTHER party (not the proposer)
    const isCustomer = booking.customer_id === user.id
    const isOwner = booking.venue.owner_id === user.id
    if (!isCustomer && !isOwner) {
      return { success: false, error: 'Du har inte behörighet' }
    }
    if (modification.proposed_by === user.id) {
      return { success: false, error: 'Du kan inte godkänna ditt eget förslag' }
    }

    // If date is changing on an accepted booking, handle calendar
    if (modification.proposed_event_date && booking.status === 'accepted') {
      const newDate = modification.proposed_event_date

      // Check new date is not blocked
      const { data: blockedDate } = await supabase
        .from('venue_blocked_dates')
        .select('id')
        .eq('venue_id', booking.venue_id)
        .eq('blocked_date', newDate)
        .single()

      if (blockedDate) {
        return { success: false, error: 'Det nya datumet är inte längre tillgängligt' }
      }

      // Check no other accepted booking on new date
      const { data: existingBooking } = await supabase
        .from('booking_requests')
        .select('id')
        .eq('venue_id', booking.venue_id)
        .eq('event_date', newDate)
        .eq('status', 'accepted')
        .neq('id', booking.id)
        .single()

      if (existingBooking) {
        return { success: false, error: 'Det nya datumet är inte längre tillgängligt' }
      }

      // Remove old blocked date
      await supabase
        .from('venue_blocked_dates')
        .delete()
        .eq('venue_id', booking.venue_id)
        .eq('blocked_date', booking.event_date)
        .eq('reason', `Bokning: ${booking.customer_name}`)

      // Insert new blocked date
      await supabase
        .from('venue_blocked_dates')
        .insert({
          venue_id: booking.venue_id,
          blocked_date: newDate,
          reason: `Bokning: ${booking.customer_name}`,
        })
    }

    // Build update object with only non-null proposed fields
    const bookingUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (modification.proposed_event_date) {
      bookingUpdate.event_date = modification.proposed_event_date
    }
    if (modification.proposed_start_time) {
      bookingUpdate.start_time = modification.proposed_start_time
    }
    if (modification.proposed_end_time) {
      bookingUpdate.end_time = modification.proposed_end_time
    }
    if (modification.proposed_guest_count !== null) {
      bookingUpdate.guest_count = modification.proposed_guest_count
    }
    if (modification.proposed_base_price !== null) {
      bookingUpdate.base_price = modification.proposed_base_price
      bookingUpdate.platform_fee = modification.proposed_platform_fee
      bookingUpdate.total_price = modification.proposed_total_price
      bookingUpdate.venue_payout = modification.proposed_venue_payout
    }

    // Update the booking
    const { error: updateError } = await supabase
      .from('booking_requests')
      .update(bookingUpdate)
      .eq('id', booking.id)

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return { success: false, error: 'Kunde inte uppdatera bokningen' }
    }

    // Mark modification as accepted
    const { error: modUpdateError } = await supabase
      .from('booking_modifications')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', modificationId)

    if (modUpdateError) {
      console.error('Error updating modification status:', modUpdateError)
    }

    // Notify the proposer
    await dispatchNotification({
      recipient: modification.proposed_by,
      category: 'booking_modification_accepted',
      headline: 'Ändringsförslag godkänt',
      body: `Ditt ändringsförslag för bokningen av ${booking.venue.name} har godkänts.`,
      reference: { kind: 'booking', id: booking.id },
      author: user.id,
      extra: {
        venue_name: booking.venue.name,
        event_date: modification.proposed_event_date || booking.event_date,
      },
    })

    revalidatePath('/account/bookings')
    revalidatePath(`/account/bookings/${booking.id}`)
    revalidatePath('/dashboard/bookings')
    revalidatePath(`/dashboard/bookings/${booking.id}`)

    return { success: true }
  } catch (error) {
    console.error('Unexpected error accepting modification:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
```

**Step 2: Commit**

```
feat: add acceptModification server action with calendar management
```

---

### Task 6: Create declineModification and cancelModification server actions

**Files:**
- Create: `src/actions/bookings/decline-modification.ts`
- Create: `src/actions/bookings/cancel-modification.ts`

**Step 1: Write declineModification**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { dispatchNotification } from '@/lib/notifications/create-notification'
import { revalidatePath } from 'next/cache'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface DeclineModificationResult {
  success: boolean
  error?: string
}

export async function declineModification(
  modificationId: string,
  declineReason: string
): Promise<DeclineModificationResult> {
  try {
    const supabase = await createClient()

    if (!UUID_REGEX.test(modificationId)) {
      return { success: false, error: 'Ogiltigt ändrings-ID' }
    }

    if (!declineReason || declineReason.trim().length === 0) {
      return { success: false, error: 'Ange en anledning' }
    }

    if (declineReason.length > 500) {
      return { success: false, error: 'Anledningen får vara max 500 tecken' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Fetch modification with booking and venue
    const { data: modification, error: modError } = await supabase
      .from('booking_modifications')
      .select(`
        *,
        booking:booking_requests!inner(
          id,
          customer_id,
          venue:venues!inner(
            name,
            owner_id
          )
        )
      `)
      .eq('id', modificationId)
      .single()

    if (modError || !modification) {
      return { success: false, error: 'Ändringsförslaget hittades inte' }
    }

    if (modification.status !== 'pending') {
      return { success: false, error: 'Ändringsförslaget är inte längre aktivt' }
    }

    const booking = modification.booking as unknown as {
      id: string
      customer_id: string | null
      venue: { name: string; owner_id: string }
    }

    // Must be the other party
    const isCustomer = booking.customer_id === user.id
    const isOwner = booking.venue.owner_id === user.id
    if (!isCustomer && !isOwner) {
      return { success: false, error: 'Du har inte behörighet' }
    }
    if (modification.proposed_by === user.id) {
      return { success: false, error: 'Du kan inte neka ditt eget förslag' }
    }

    // Update modification status
    const { error: updateError } = await supabase
      .from('booking_modifications')
      .update({
        status: 'declined',
        decline_reason: declineReason.trim(),
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', modificationId)

    if (updateError) {
      console.error('Error declining modification:', updateError)
      return { success: false, error: 'Kunde inte neka ändringsförslaget' }
    }

    // Notify the proposer
    await dispatchNotification({
      recipient: modification.proposed_by,
      category: 'booking_modification_declined',
      headline: 'Ändringsförslag nekat',
      body: `Ditt ändringsförslag för bokningen av ${booking.venue.name} har nekats.`,
      reference: { kind: 'booking', id: booking.id },
      author: user.id,
      extra: {
        venue_name: booking.venue.name,
        decline_reason: declineReason.trim(),
      },
    })

    revalidatePath('/account/bookings')
    revalidatePath(`/account/bookings/${booking.id}`)
    revalidatePath('/dashboard/bookings')
    revalidatePath(`/dashboard/bookings/${booking.id}`)

    return { success: true }
  } catch (error) {
    console.error('Unexpected error declining modification:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
```

**Step 2: Write cancelModification**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface CancelModificationResult {
  success: boolean
  error?: string
}

export async function cancelModification(
  modificationId: string
): Promise<CancelModificationResult> {
  try {
    const supabase = await createClient()

    if (!UUID_REGEX.test(modificationId)) {
      return { success: false, error: 'Ogiltigt ändrings-ID' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Fetch modification
    const { data: modification, error: modError } = await supabase
      .from('booking_modifications')
      .select(`
        *,
        booking:booking_requests!inner(
          id
        )
      `)
      .eq('id', modificationId)
      .single()

    if (modError || !modification) {
      return { success: false, error: 'Ändringsförslaget hittades inte' }
    }

    if (modification.status !== 'pending') {
      return { success: false, error: 'Ändringsförslaget är inte längre aktivt' }
    }

    // Only the proposer can cancel
    if (modification.proposed_by !== user.id) {
      return { success: false, error: 'Bara den som föreslog ändringen kan dra tillbaka den' }
    }

    const bookingId = (modification.booking as unknown as { id: string }).id

    // Delete the modification
    const { error: deleteError } = await supabase
      .from('booking_modifications')
      .delete()
      .eq('id', modificationId)

    if (deleteError) {
      console.error('Error cancelling modification:', deleteError)
      return { success: false, error: 'Kunde inte dra tillbaka ändringsförslaget' }
    }

    revalidatePath('/account/bookings')
    revalidatePath(`/account/bookings/${bookingId}`)
    revalidatePath('/dashboard/bookings')
    revalidatePath(`/dashboard/bookings/${bookingId}`)

    return { success: true }
  } catch (error) {
    console.error('Unexpected error cancelling modification:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
```

**Step 3: Commit**

```
feat: add declineModification and cancelModification server actions
```

---

### Task 7: Create getBookingModification server action

**Files:**
- Create: `src/actions/bookings/get-booking-modification.ts`

**Step 1: Write the action**

This fetches the pending modification (if any) for a given booking. Used by the booking detail pages to show the modification banner.

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { BookingModification } from '@/types/database'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getBookingModification(bookingId: string): Promise<{
  success: boolean
  modification?: BookingModification
  error?: string
}> {
  try {
    const supabase = await createClient()

    if (!UUID_REGEX.test(bookingId)) {
      return { success: false, error: 'Ogiltigt boknings-ID' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Ej inloggad' }
    }

    // Check user is a party to this booking
    const { data: booking } = await supabase
      .from('booking_requests')
      .select(`
        customer_id,
        venue:venues!inner(owner_id)
      `)
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return { success: false, error: 'Bokningen hittades inte' }
    }

    const venue = booking.venue as unknown as { owner_id: string }
    if (booking.customer_id !== user.id && venue.owner_id !== user.id) {
      return { success: false, error: 'Du har inte behörighet' }
    }

    // Fetch pending modification
    const { data: modification } = await supabase
      .from('booking_modifications')
      .select('*')
      .eq('booking_request_id', bookingId)
      .eq('status', 'pending')
      .single()

    return {
      success: true,
      modification: modification || undefined,
    }
  } catch (error) {
    console.error('Error fetching modification:', error)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}
```

**Step 2: Commit**

```
feat: add getBookingModification server action
```

---

### Task 8: Create ModificationDiff component

**Files:**
- Create: `src/components/booking/modification-diff.tsx`

**Context:** Displays old vs new values for a modification proposal. Used in the pending modification banner on both booking detail pages.

**Step 1: Write the component**

```tsx
import { formatPrice } from '@/lib/pricing'
import type { BookingModification, BookingRequest } from '@/types/database'

interface ModificationDiffProps {
  booking: BookingRequest
  modification: BookingModification
}

const EVENT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}

function formatDateSv(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('sv-SE', EVENT_DATE_FORMAT)
}

function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5) // "HH:MM:SS" → "HH:MM"
}

export function ModificationDiff({ booking, modification }: ModificationDiffProps) {
  const changes: { label: string; from: string; to: string }[] = []

  if (modification.proposed_event_date) {
    changes.push({
      label: 'Datum',
      from: formatDateSv(booking.event_date),
      to: formatDateSv(modification.proposed_event_date),
    })
  }

  if (modification.proposed_start_time) {
    changes.push({
      label: 'Starttid',
      from: booking.start_time ? formatTime(booking.start_time) : '–',
      to: formatTime(modification.proposed_start_time),
    })
  }

  if (modification.proposed_end_time) {
    changes.push({
      label: 'Sluttid',
      from: booking.end_time ? formatTime(booking.end_time) : '–',
      to: formatTime(modification.proposed_end_time),
    })
  }

  if (modification.proposed_guest_count !== null) {
    changes.push({
      label: 'Antal gäster',
      from: booking.guest_count?.toString() || '–',
      to: modification.proposed_guest_count.toString(),
    })
  }

  if (modification.proposed_base_price !== null && modification.proposed_total_price !== null) {
    changes.push({
      label: 'Pris',
      from: `${formatPrice(booking.base_price)} (totalt: ${formatPrice(booking.total_price)})`,
      to: `${formatPrice(modification.proposed_base_price)} (totalt: ${formatPrice(modification.proposed_total_price)})`,
    })
  }

  if (changes.length === 0) return null

  return (
    <div className="space-y-2">
      {changes.map((change) => (
        <div key={change.label} className="flex flex-col sm:flex-row sm:items-center gap-1">
          <span className="text-sm font-medium text-gray-600 sm:w-32">{change.label}:</span>
          <span className="text-sm">
            <span className="text-gray-500 line-through">{change.from}</span>
            <span className="mx-2 text-gray-400">→</span>
            <span className="font-medium text-gray-900">{change.to}</span>
          </span>
        </div>
      ))}
      {modification.reason && (
        <div className="mt-3 text-sm text-gray-600 italic border-l-2 border-gray-300 pl-3">
          &ldquo;{modification.reason}&rdquo;
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```
feat: add ModificationDiff component
```

---

### Task 9: Create ModificationBanner component

**Files:**
- Create: `src/components/booking/modification-banner.tsx`

**Context:** Shows a banner on the booking detail page when a pending modification exists. Shows diff + action buttons (accept/decline or cancel depending on who proposed it).

**Step 1: Write the component**

```tsx
'use client'

import { useState } from 'react'
import type { BookingModification, BookingRequest } from '@/types/database'
import { ModificationDiff } from './modification-diff'
import { acceptModification } from '@/actions/bookings/accept-modification'
import { declineModification } from '@/actions/bookings/decline-modification'
import { cancelModification } from '@/actions/bookings/cancel-modification'

interface ModificationBannerProps {
  booking: BookingRequest
  modification: BookingModification
  currentUserId: string
  onResolved: () => void
}

export function ModificationBanner({
  booking,
  modification,
  currentUserId,
  onResolved,
}: ModificationBannerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  const isProposer = modification.proposed_by === currentUserId

  const handleAccept = async () => {
    setIsSubmitting(true)
    setError(null)
    const result = await acceptModification(modification.id)
    if (result.success) {
      onResolved()
    } else {
      setError(result.error || 'Kunde inte godkänna ändringen')
    }
    setIsSubmitting(false)
  }

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      setError('Ange en anledning')
      return
    }
    setIsSubmitting(true)
    setError(null)
    const result = await declineModification(modification.id, declineReason.trim())
    if (result.success) {
      setShowDeclineModal(false)
      onResolved()
    } else {
      setError(result.error || 'Kunde inte neka ändringen')
    }
    setIsSubmitting(false)
  }

  const handleCancel = async () => {
    setIsSubmitting(true)
    setError(null)
    const result = await cancelModification(modification.id)
    if (result.success) {
      onResolved()
    } else {
      setError(result.error || 'Kunde inte dra tillbaka förslaget')
    }
    setIsSubmitting(false)
  }

  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-amber-900 mb-3">
          {isProposer
            ? 'Du har föreslagit en ändring'
            : 'Ändringsförslag att granska'}
        </h3>

        <ModificationDiff booking={booking} modification={modification} />

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          {isProposer ? (
            <>
              <p className="text-sm text-amber-700 self-center">Väntar på svar...</p>
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Dra tillbaka
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleAccept}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Godkänner...' : 'Godkänn'}
              </button>
              <button
                onClick={() => setShowDeclineModal(true)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                Neka
              </button>
            </>
          )}
        </div>
      </div>

      {/* Decline modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Neka ändringsförslag</h3>
              <button
                onClick={() => setShowDeclineModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Ange en anledning till varför du nekar ändringen.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Anledning..."
              rows={3}
              maxLength={500}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent"
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={handleDecline}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Nekar...' : 'Neka förslag'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

**Step 2: Commit**

```
feat: add ModificationBanner component with accept/decline/cancel actions
```

---

### Task 10: Create ModificationForm component

**Files:**
- Create: `src/components/booking/modification-form.tsx`

**Context:** Modal form for proposing a modification. Pre-filled with current booking values. Customer version hides the price field; owner version shows it.

**Step 1: Write the component**

```tsx
'use client'

import { useState } from 'react'
import { proposeModification } from '@/actions/bookings/propose-modification'
import { formatPrice } from '@/lib/pricing'
import type { BookingRequest } from '@/types/database'

interface ModificationFormProps {
  booking: BookingRequest
  canEditPrice: boolean
  onClose: () => void
  onSuccess: () => void
}

const TIME_OPTIONS = Array.from({ length: 16 }, (_, i) => {
  const hour = i + 8 // 08:00 to 23:00
  return `${hour.toString().padStart(2, '0')}:00:00`
})

export function ModificationForm({
  booking,
  canEditPrice,
  onClose,
  onSuccess,
}: ModificationFormProps) {
  const [eventDate, setEventDate] = useState(booking.event_date)
  const [startTime, setStartTime] = useState(booking.start_time || '')
  const [endTime, setEndTime] = useState(booking.end_time || '')
  const [guestCount, setGuestCount] = useState(booking.guest_count?.toString() || '')
  const [basePrice, setBasePrice] = useState(booking.base_price.toString())
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine which fields actually changed
  const getChanges = () => {
    const changes: Record<string, unknown> = {}

    if (eventDate !== booking.event_date) {
      changes.proposedEventDate = eventDate
    }
    if (startTime !== (booking.start_time || '')) {
      changes.proposedStartTime = startTime
    }
    if (endTime !== (booking.end_time || '')) {
      changes.proposedEndTime = endTime
    }
    if (guestCount && parseInt(guestCount) !== booking.guest_count) {
      changes.proposedGuestCount = parseInt(guestCount)
    }
    if (canEditPrice && parseInt(basePrice) !== booking.base_price) {
      changes.proposedBasePrice = parseInt(basePrice)
    }

    return changes
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const changes = getChanges()
    if (Object.keys(changes).length === 0) {
      setError('Inga ändringar gjorda')
      return
    }

    setIsSubmitting(true)
    const result = await proposeModification({
      bookingId: booking.id,
      ...changes,
      reason: reason.trim() || undefined,
    } as Parameters<typeof proposeModification>[0])

    if (result.success) {
      onSuccess()
    } else {
      setError(result.error || 'Kunde inte skicka ändringsförslaget')
    }
    setIsSubmitting(false)
  }

  const hasChanges = Object.keys(getChanges()).length > 0

  // Tomorrow as minimum date
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Föreslå ändring</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Ändra de fält du vill uppdatera. Förslaget skickas till motparten för godkännande.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
            <input
              type="date"
              value={eventDate}
              min={minDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent"
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starttid</label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent"
              >
                <option value="">Välj tid</option>
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t.slice(0, 5)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sluttid</label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent"
              >
                <option value="">Välj tid</option>
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t.slice(0, 5)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Guest count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Antal gäster</label>
            <input
              type="number"
              value={guestCount}
              min={1}
              onChange={(e) => setGuestCount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent"
            />
          </div>

          {/* Price (owner only) */}
          {canEditPrice ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pris (kr)</label>
              <input
                type="number"
                value={basePrice}
                min={1}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">Grundpris exkl. plattformsavgift</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pris</label>
              <p className="text-sm text-gray-600">{formatPrice(booking.base_price)} (totalt: {formatPrice(booking.total_price)})</p>
              <p className="mt-1 text-xs text-gray-500">Kontakta lokalägaren för prisändringar</p>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anledning (valfritt)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Beskriv varför du vill ändra bokningen..."
              rows={2}
              maxLength={500}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#c45a3b] focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !hasChanges}
              className="px-4 py-2 text-sm font-medium text-white bg-[#c45a3b] rounded-lg hover:bg-[#b04e33] disabled:opacity-50"
            >
              {isSubmitting ? 'Skickar...' : 'Skicka förslag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```
feat: add ModificationForm component for proposing booking changes
```

---

### Task 11: Integrate modification UI into customer booking detail page

**Files:**
- Modify: `src/app/(public)/account/bookings/[id]/page.tsx`

**Context:** The page is a `'use client'` component. We need to:
1. Fetch pending modification alongside the booking
2. Show the ModificationBanner when a pending modification exists
3. Add a "Föreslå ändring" button that opens ModificationForm
4. Customer cannot edit price (`canEditPrice={false}`)

**Step 1: Add imports**

Add at the top of the file:
```typescript
import { getBookingModification } from '@/actions/bookings/get-booking-modification'
import { ModificationBanner } from '@/components/booking/modification-banner'
import { ModificationForm } from '@/components/booking/modification-form'
import type { BookingModification } from '@/types/database'
```

**Step 2: Add state**

Add alongside existing state:
```typescript
const [modification, setModification] = useState<BookingModification | undefined>()
const [showModificationForm, setShowModificationForm] = useState(false)
```

**Step 3: Fetch modification alongside booking**

In the `fetchBooking` callback, after successfully setting the booking, add:
```typescript
// Fetch pending modification
const modResult = await getBookingModification(bookingId)
if (modResult.success) {
  setModification(modResult.modification)
}
```

**Step 4: Add ModificationBanner above the content grid**

After the status description info box and before the `lg:grid-cols-3` grid, add:
```tsx
{modification && currentUserId && (
  <ModificationBanner
    booking={booking}
    modification={modification}
    currentUserId={currentUserId}
    onResolved={fetchBooking}
  />
)}
```

**Step 5: Add "Föreslå ändring" button**

Next to the existing "Avboka" button (inside the `canCancel` conditional), add:
```tsx
{['pending', 'accepted'].includes(booking.status) && !modification && (
  <button
    onClick={() => setShowModificationForm(true)}
    className="px-4 py-2 text-sm font-medium text-[#c45a3b] border border-[#c45a3b] rounded-lg hover:bg-[#c45a3b]/5"
  >
    Föreslå ändring
  </button>
)}
```

**Step 6: Add ModificationForm modal**

At the end of the component, before the closing fragment/div:
```tsx
{showModificationForm && (
  <ModificationForm
    booking={booking}
    canEditPrice={false}
    onClose={() => setShowModificationForm(false)}
    onSuccess={() => {
      setShowModificationForm(false)
      fetchBooking()
    }}
  />
)}
```

**Step 7: Commit**

```
feat: integrate booking modification UI into customer booking page
```

---

### Task 12: Integrate modification UI into owner booking detail page

**Files:**
- Modify: `src/app/(public)/dashboard/bookings/[id]/page.tsx`

**Context:** Same pattern as customer page, but owner can edit price (`canEditPrice={true}`).

**Step 1: Add imports**

Same imports as Task 11:
```typescript
import { getBookingModification } from '@/actions/bookings/get-booking-modification'
import { ModificationBanner } from '@/components/booking/modification-banner'
import { ModificationForm } from '@/components/booking/modification-form'
import type { BookingModification } from '@/types/database'
```

**Step 2: Add state**

```typescript
const [modification, setModification] = useState<BookingModification | undefined>()
const [showModificationForm, setShowModificationForm] = useState(false)
```

**Step 3: Fetch modification alongside booking**

In the `fetchBooking` callback, after setting booking:
```typescript
const modResult = await getBookingModification(bookingId)
if (modResult.success) {
  setModification(modResult.modification)
}
```

**Step 4: Add ModificationBanner**

After the success/error flash messages and before the content grid, add:
```tsx
{modification && currentUserId && booking && (
  <ModificationBanner
    booking={booking}
    modification={modification}
    currentUserId={currentUserId}
    onResolved={fetchBooking}
  />
)}
```

**Step 5: Add "Föreslå ändring" button**

In the action buttons area (where Accept/Decline buttons are for pending bookings), also show:
```tsx
{['pending', 'accepted'].includes(booking.status) && !modification && (
  <button
    onClick={() => setShowModificationForm(true)}
    className="px-4 py-2 text-sm font-medium text-[#c45a3b] border border-[#c45a3b] rounded-lg hover:bg-[#c45a3b]/5"
  >
    Föreslå ändring
  </button>
)}
```

**Step 6: Add ModificationForm modal**

```tsx
{showModificationForm && booking && (
  <ModificationForm
    booking={booking}
    canEditPrice={true}
    onClose={() => setShowModificationForm(false)}
    onSuccess={() => {
      setShowModificationForm(false)
      fetchBooking()
    }}
  />
)}
```

**Step 7: Commit**

```
feat: integrate booking modification UI into owner booking page
```

---

### Task 13: Add email templates for modification notifications

**Files:**
- Modify: `supabase/functions/_shared/email-templates.ts`

**Step 1: Add modificationProposedEmail template**

Add after the existing `bookingDeclinedEmail` function:

```typescript
export function modificationProposedEmail(
  venueName: string,
  eventDate: string,
  changes: string
): string {
  return baseTemplate(`
    <h1>Ändringsförslag</h1>
    <p>Ett ändringsförslag har skapats för din bokning av <strong>${escapeHtml(venueName)}</strong>.</p>
    <div class="info-box">
      <p><strong>Nuvarande datum:</strong> ${escapeHtml(eventDate)}</p>
      <p><strong>Föreslagna ändringar:</strong></p>
      ${changes}
    </div>
    <p>Logga in på Tryffle för att granska och godkänna eller neka förslaget.</p>
    <a href="${SITE_URL}/account/bookings" class="button">Granska ändringsförslag</a>
  `)
}
```

**Step 2: Add modificationAcceptedEmail template**

```typescript
export function modificationAcceptedEmail(
  venueName: string,
  eventDate: string
): string {
  return baseTemplate(`
    <h1>Ändringsförslag godkänt</h1>
    <p>Ditt ändringsförslag för bokningen av <strong>${escapeHtml(venueName)}</strong> har godkänts.</p>
    <div class="info-box">
      <p><strong>Uppdaterat datum:</strong> ${escapeHtml(eventDate)}</p>
    </div>
    <p>Logga in på Tryffle för att se den uppdaterade bokningen.</p>
    <a href="${SITE_URL}/account/bookings" class="button">Se bokning</a>
  `)
}
```

**Step 3: Commit**

```
feat: add email templates for booking modification notifications
```

---

### Task 14: Create Edge Function for modification email notifications

**Files:**
- Create: `supabase/functions/notify-booking-modification/index.ts`

**Context:** Triggered by INSERT on `booking_modifications` table (for proposed) and UPDATE where status changes to `accepted` (for accepted). Follow the pattern from `notify-booking-status/index.ts`.

**Step 1: Write the Edge Function**

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from '../_shared/resend.ts'
import {
  modificationProposedEmail,
  modificationAcceptedEmail,
} from '../_shared/email-templates.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const { type, record, old_record } = payload

    // Handle new modification proposed (INSERT)
    if (type === 'INSERT' && record.status === 'pending') {
      // Fetch booking and venue info
      const { data: booking } = await supabase
        .from('booking_requests')
        .select(`
          *,
          venue:venues!inner(name, owner_id)
        `)
        .eq('id', record.booking_request_id)
        .single()

      if (!booking) {
        return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404 })
      }

      const venue = booking.venue as { name: string; owner_id: string }

      // Determine recipient (the other party)
      const isProposedByCustomer = record.proposed_by === booking.customer_id
      const recipientEmail = isProposedByCustomer ? null : booking.customer_email
      // If proposed by owner, send to customer email
      // If proposed by customer, we'd need owner's email — fetch from profiles
      let toEmail = recipientEmail

      if (!toEmail) {
        const recipientId = isProposedByCustomer ? venue.owner_id : booking.customer_id
        if (!recipientId) {
          return new Response(JSON.stringify({ skipped: 'No recipient' }), { status: 200 })
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', recipientId)
          .single()
        toEmail = profile?.email
      }

      if (!toEmail) {
        return new Response(JSON.stringify({ skipped: 'No email' }), { status: 200 })
      }

      const eventDate = new Date(booking.event_date).toLocaleDateString('sv-SE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      // Build changes summary
      const changes: string[] = []
      if (record.proposed_event_date) {
        const newDate = new Date(record.proposed_event_date).toLocaleDateString('sv-SE', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })
        changes.push(`<p>Nytt datum: ${newDate}</p>`)
      }
      if (record.proposed_guest_count !== null) {
        changes.push(`<p>Antal gäster: ${record.proposed_guest_count}</p>`)
      }
      if (record.proposed_total_price !== null) {
        changes.push(`<p>Nytt totalpris: ${record.proposed_total_price} kr</p>`)
      }
      if (record.proposed_start_time) {
        changes.push(`<p>Ny starttid: ${record.proposed_start_time.slice(0, 5)}</p>`)
      }
      if (record.proposed_end_time) {
        changes.push(`<p>Ny sluttid: ${record.proposed_end_time.slice(0, 5)}</p>`)
      }

      const html = modificationProposedEmail(
        venue.name,
        eventDate,
        changes.join('')
      )

      await sendEmail({
        to: toEmail,
        subject: `Ändringsförslag för din bokning av ${venue.name}`,
        html,
      })

      return new Response(JSON.stringify({ success: true, status: 'proposed' }), { status: 200 })
    }

    // Handle modification accepted (UPDATE)
    if (type === 'UPDATE' && record.status === 'accepted' && old_record?.status === 'pending') {
      const { data: booking } = await supabase
        .from('booking_requests')
        .select(`
          *,
          venue:venues!inner(name)
        `)
        .eq('id', record.booking_request_id)
        .single()

      if (!booking) {
        return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404 })
      }

      const venue = booking.venue as { name: string }

      // Notify the proposer
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', record.proposed_by)
        .single()

      if (!profile?.email) {
        return new Response(JSON.stringify({ skipped: 'No proposer email' }), { status: 200 })
      }

      const eventDate = new Date(booking.event_date).toLocaleDateString('sv-SE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      const html = modificationAcceptedEmail(venue.name, eventDate)

      await sendEmail({
        to: profile.email,
        subject: `Ändringsförslaget för din bokning av ${venue.name} har godkänts`,
        html,
      })

      return new Response(JSON.stringify({ success: true, status: 'accepted' }), { status: 200 })
    }

    return new Response(JSON.stringify({ skipped: 'No action needed' }), { status: 200 })
  } catch (error) {
    console.error('Error in notify-booking-modification:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 })
  }
})
```

**Step 2: Commit**

```
feat: add Edge Function for booking modification email notifications
```

---

### Task 15: Create Supabase migration for booking_modifications table

**Files:**
- Create: `supabase/migrations/<timestamp>_create_booking_modifications.sql`

**Context:** This SQL migration creates the table, indexes, RLS policies, and the database webhook trigger for the Edge Function. The exact migration filename timestamp should be generated at creation time.

**Step 1: Write the migration**

```sql
-- Create booking_modifications table
CREATE TABLE IF NOT EXISTS booking_modifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_request_id UUID NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  proposed_event_date DATE,
  proposed_start_time TIME,
  proposed_end_time TIME,
  proposed_guest_count INTEGER,
  proposed_base_price NUMERIC,
  proposed_platform_fee NUMERIC,
  proposed_total_price NUMERIC,
  proposed_venue_payout NUMERIC,
  reason TEXT,
  responded_at TIMESTAMPTZ,
  decline_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- One pending modification per booking
CREATE UNIQUE INDEX idx_one_pending_modification_per_booking
  ON booking_modifications (booking_request_id)
  WHERE status = 'pending';

-- Index for querying modifications by booking
CREATE INDEX idx_booking_modifications_booking_id
  ON booking_modifications (booking_request_id);

-- Enable RLS
ALTER TABLE booking_modifications ENABLE ROW LEVEL SECURITY;

-- RLS: Users can read modifications for bookings they're a party to
CREATE POLICY "Users can view modifications for their bookings"
  ON booking_modifications FOR SELECT
  USING (
    proposed_by = auth.uid()
    OR booking_request_id IN (
      SELECT br.id FROM booking_requests br
      JOIN venues v ON br.venue_id = v.id
      WHERE br.customer_id = auth.uid() OR v.owner_id = auth.uid()
    )
  );

-- RLS: Users can insert modifications for bookings they're a party to
CREATE POLICY "Users can propose modifications for their bookings"
  ON booking_modifications FOR INSERT
  WITH CHECK (
    proposed_by = auth.uid()
    AND booking_request_id IN (
      SELECT br.id FROM booking_requests br
      JOIN venues v ON br.venue_id = v.id
      WHERE br.customer_id = auth.uid() OR v.owner_id = auth.uid()
    )
  );

-- RLS: Users can update modifications they're authorized to respond to
CREATE POLICY "Users can respond to modifications"
  ON booking_modifications FOR UPDATE
  USING (
    proposed_by != auth.uid()
    AND booking_request_id IN (
      SELECT br.id FROM booking_requests br
      JOIN venues v ON br.venue_id = v.id
      WHERE br.customer_id = auth.uid() OR v.owner_id = auth.uid()
    )
  );

-- RLS: Proposers can delete their own pending modifications
CREATE POLICY "Proposers can cancel their modifications"
  ON booking_modifications FOR DELETE
  USING (
    proposed_by = auth.uid()
    AND status = 'pending'
  );

-- Updated_at trigger (reuse existing function if available)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_booking_modifications_updated_at
  BEFORE UPDATE ON booking_modifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Note about webhook**

The database webhook for the `notify-booking-modification` Edge Function needs to be configured in the Supabase dashboard (or via `supabase/config.toml`):
- Table: `booking_modifications`
- Events: `INSERT`, `UPDATE`
- URL: the Edge Function URL

**Step 3: Commit**

```
feat: add Supabase migration for booking_modifications table
```

---

### Task 16: Regenerate Supabase types

**Step 1: Run type generation**

```bash
npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
```

Or if using local development:
```bash
npx supabase gen types typescript --local > src/types/database.ts
```

**Step 2: Verify the BookingModification type in database.ts**

Ensure the generated types include the `booking_modifications` table with correct Row/Insert/Update types. If the manual type from Task 1 conflicts with the generated type, remove the manual one and use the generated one. Update imports in server actions if the type name differs.

**Step 3: Add the new notification types if not auto-generated**

The `NotificationType` union and `BookingModificationStatus` type may need to be manually maintained if they're custom types not in the database schema. Verify and adjust.

**Step 4: Commit**

```
chore: regenerate Supabase types with booking_modifications table
```

---

### Task 17: Manual testing and verification

**Step 1: Run the dev server**

```bash
npm run dev
```

**Step 2: Test customer flow**

1. Log in as a customer with an existing `pending` or `accepted` booking
2. Navigate to `/account/bookings/[id]`
3. Verify the "Föreslå ändring" button appears
4. Click it, change the date, submit
5. Verify the modification banner appears showing "Väntar på svar..."
6. Verify the "Dra tillbaka" button works

**Step 3: Test owner flow**

1. Log in as the venue owner
2. Navigate to `/dashboard/bookings/[id]`
3. Verify the modification banner appears with the diff and accept/decline buttons
4. Test accepting — verify the booking values update
5. Test declining (create a new modification first) — verify the booking stays unchanged

**Step 4: Test edge cases**

1. Try proposing when a modification is already pending — should show error
2. Try accepting your own proposal — should show error
3. Cancel a booking with a pending modification — verify modification is cleaned up
4. Try changing to a date that's already booked — accept should fail with clear error

**Step 5: Commit any fixes**

```
fix: address issues found during manual testing
```
