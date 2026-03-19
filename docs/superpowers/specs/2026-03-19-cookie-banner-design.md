# Cookie Info Banner

## Problem

Tryffle has no cookie/privacy notice. Swedish/EU sites need to inform users about cookie usage. Since the site only uses necessary cookies (Supabase auth, Google Maps, Stripe payments), a simple informational banner is sufficient -- no consent toggles needed.

## Solution

A fixed bottom banner that informs users cookies are used for site functionality, with a link to the privacy policy and a dismiss button. Dismissal is persisted in localStorage.

## Design

### Visual

- Fixed to bottom of viewport with `16px` padding from edges
- White background, `rounded-xl`, `shadow-lg`, `border border-[#e7e5e4]`
- Content: cookie emoji + text + "Las mer" link + "Jag forstar" dismiss button
- Desktop: single row, text left, button right
- Mobile: stacks vertically (text above, button below full-width)
- Fade-in animation on appear

### Text

- Message: `Vi anvander cookies for att sajten ska fungera.`
- Link text: `Las mer` linking to `/policy`
- Button text: `Jag forstar`

### Behavior

- On mount: check `localStorage.getItem('cookie-banner-dismissed')` in a `useEffect` to avoid SSR/hydration mismatch
- State: `useState<boolean | null>(null)` -- `null` = not yet checked, `false` = show, `true` = hide
- On dismiss: `localStorage.setItem('cookie-banner-dismissed', 'true')`, hide banner
- Don't render anything while state is `null` (prevents flash)

### Placement

- Rendered in `src/app/(public)/layout.tsx` as the last child before the closing `</div>`
- Visible to all users (no auth gating)

## Components

### `src/components/cookie-banner.tsx` (new)

Client component. Handles localStorage check, renders the banner, handles dismiss.

### `src/app/(public)/layout.tsx` (modify)

Import and render `<CookieBanner />` at the bottom of the layout, outside the footer.

## Non-goals

- No cookie categories or toggles (only necessary cookies are used)
- No server-side cookie consent tracking
- No analytics or third-party consent management
