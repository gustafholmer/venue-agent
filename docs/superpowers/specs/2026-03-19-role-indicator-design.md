# Role Indicator Redesign

## Problem

Business users (with both `customer` and `venue_owner` roles) accidentally perform actions in the wrong context because the header looks identical regardless of whether they are browsing as a booker or managing venues as a renter. The current `WorkspaceSwitcher` shows where you *can go*, not where you *are*.

## Solution

Replace the current navigation-link pill with a **segmented control** and add a **colored accent bar** under the header. Together these provide an always-visible, at-a-glance signal of the active role.

## Design

### Segmented Control

A two-segment toggle replaces the existing `WorkspaceSwitcher` component:

- **Left segment:** "Bokare" (booker) with calendar icon
- **Right segment:** "Uthyrare" (renter) with building icon
- Active segment is filled with the role color; inactive segment is transparent with muted text
- Clicking the inactive segment navigates to the other context (same as current link behavior)
- Container has `border-radius: 9999px` (full pill) with a `1px solid #d4bfb6` border

**Desktop:** icon + label in each segment.
**Mobile:** icon-only in each segment (no labels), keeping the compact footprint.

### Accent Bar

A 3px tall `div` rendered immediately below the header's bottom border:

- Booker active: `background: #c45a3b` (brand orange)
- Renter active: `background: #7b4a6b` (brand purple)
- Full width, no rounded corners

### Colors

| Role    | Segment fill | Accent bar | Text (active) |
|---------|-------------|------------|---------------|
| Bokare  | `#c45a3b`   | `#c45a3b`  | `white`       |
| Uthyrare| `#7b4a6b`   | `#7b4a6b`  | `white`       |
| Inactive| transparent | n/a        | `#5a4a42`     |

### What stays the same

- Header gradient, logo, search link, notification bell, user menu
- URL-based role detection via `usePathname()` (no new state management)
- Overall page structure and layouts

## Components Touched

### `src/components/workspace-switcher.tsx`

Rewrite from a link pill to a segmented control. Still a client component using `usePathname()`. Renders two segments, each an `<a>` (or `<Link>`) -- active segment is non-interactive (or links to current page), inactive segment links to the other context.

### `src/app/(public)/layout.tsx`

Add an accent bar `div` below the `<header>` element. The bar needs to know whether the user is on `/dashboard` to pick the color. Since this is a server component, the accent bar should be a thin client component (or part of the `WorkspaceSwitcher` export) that reads the pathname.

**Option:** Export an `AccentBar` client component from `workspace-switcher.tsx` that reads the pathname and renders the colored bar. This keeps the pathname logic co-located.

## Mobile Considerations

- Segmented control uses icon-only segments on small screens (`sm:` breakpoint for labels)
- Accent bar is full-width on all screen sizes
- Touch target for each segment should be at least 44px tall

## Non-goals

- No changes to the header gradient color
- No changes to UserMenu labels or behavior
- No changes to dashboard/account navigation or sidebar
- No new state management or context providers
