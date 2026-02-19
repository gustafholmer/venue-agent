# Save Venue Button Design

## Problem

The `saveVenue`, `unsaveVenue`, and `isVenueSaved` server actions exist, and the saved venues page works, but there is no save button anywhere users actually browse venues. The feature is invisible.

## Solution

Add a heart toggle button on venue cards and the venue detail page, backed by a client-side context provider for efficient state management.

## Approach: Client-Side Context Provider

A `SavedVenuesProvider` near the root fetches all saved venue IDs on mount and exposes them via React context. Any `SaveButton` reads from context and toggles optimistically.

Why this approach:
- One query regardless of how many buttons are on screen
- No prop threading through parent components
- Optimistic updates propagate everywhere (save on a card, detail page already knows)
- `SaveButton` is self-contained, needs no props beyond `venueId`

## New Files

- `src/contexts/saved-venues-context.tsx` — `SavedVenuesProvider` + `useSavedVenues()` hook
- `src/components/venues/save-button.tsx` — Heart toggle component

## Modified Files

- `src/actions/saved-venues/get-saved-venues.ts` — Add `getSavedVenueIds()` action
- `src/app/(public)/layout.tsx` — Wrap children in `SavedVenuesProvider`
- `src/components/venues/venue-card.tsx` — Add `<SaveButton>` overlay on image
- `src/app/(public)/venues/[slug]/page.tsx` — Add `<SaveButton>` in sidebar

## Data Flow

1. `SavedVenuesProvider` mounts, calls `getSavedVenueIds()`, stores `Set<string>` in state
2. Unauthenticated users: skip fetch, empty set
3. `SaveButton` renders outline heart (not saved) or filled heart (saved) based on context
4. Click (authenticated): optimistically toggle set, call `saveVenue`/`unsaveVenue`, revert on error
5. Click (unauthenticated): redirect to `/auth/sign-in?returnUrl=<current page>`

## Visual Design

- Heart icon, consistent with the existing red filled heart on the saved venues page
- On venue cards: positioned top-right of the image, semi-transparent background for contrast
- On detail page: in the sidebar near the booking CTA
- Outline = not saved, filled = saved
