# Workspace Switcher for Business Users

## Problem

Business users have dual roles (`customer` + `venue_owner`) but no clear visual signal about which workspace they're in or how to switch between them. This causes navigation confusion, identity confusion, and context confusion.

## Approach

Add a context-aware switcher button in the header for business users, following the Airbnb "Switch to hosting" pattern.

## Design

### Switcher Button

A new button in the header nav, placed before the notification bell and user menu. Only visible to users with `isVenueOwner`.

- **When browsing / on `/account`:** Shows "Hantera lokal" with a building icon, links to `/dashboard`
- **When on `/dashboard`:** Shows "Boka lokal" with a search icon, links to `/venues`

Styled as an outlined pill (border, not filled) to be visible but secondary to the user menu CTA.

```
Header (browsing):    [Logo] [Eventlokaler] ... [Hantera lokal] [bell] [Konto v]
Header (dashboard):   [Logo] [Eventlokaler] ... [Boka lokal]    [bell] [Konto v]
```

### Context Detection

The button uses `usePathname()` to determine current workspace:
- Pathname starts with `/dashboard` -> show "Boka lokal" (link to `/venues`)
- Otherwise -> show "Hantera lokal" (link to `/dashboard`)

### Scope

- New `WorkspaceSwitcher` client component
- Update public layout to pass `isVenueOwner` to the header area where the switcher renders
- No changes to user menu dropdown, header colors, or non-business user experience

## Files to Change

- `src/components/workspace-switcher.tsx` (new)
- `src/app/(public)/layout.tsx` (add switcher to header)
