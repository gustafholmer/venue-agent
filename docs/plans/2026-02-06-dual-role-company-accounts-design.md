# Dual-Role Company Accounts

## Overview

Replace the single `user_type` enum with a `roles` array column so company accounts can both book and list venues. Remove the separate venue owner registration flow.

## Account Types

- **Private individual** — signs up at `/auth/sign-up/private`, gets `roles: ['customer']`. Can only book.
- **Company** — signs up at `/auth/sign-up/company`, gets `roles: ['customer', 'venue_owner']`. Can book AND list.

## Data Model

Replace `user_type` column on `profiles` with `roles text[] NOT NULL DEFAULT '{customer}'`.

Remove the `user_role` enum type. Update the auto-profile trigger to set default roles.

TypeScript type changes from `user_type: UserRole` to `roles: string[]`. Add a `hasRole(profile, role)` helper for clean checks.

## Auth & Registration

Remove `/auth/register/venue` entirely (page + server action). Update "Vill du lista din lokal?" links to point to `/auth/sign-up/company`.

Sign-up server action changes:
- `accountType === 'private'`: upsert with `roles: ['customer']`
- `accountType === 'company'`: upsert with `roles: ['customer', 'venue_owner']`

## Route Guards & Navigation

- `dashboard/layout.tsx` — Change guard to `!profile.roles.includes('venue_owner')`
- `account/layout.tsx` — Remove the redirect that sends venue owners to `/dashboard`
- `create-venue.ts` — Check `roles.includes('venue_owner')`

Navigation:
- Public header: show "Hantera lokaler" link to `/dashboard` when user has `venue_owner` role
- Dashboard header: existing "Till sidan" link already returns to public site

## Files to Create/Modify/Delete

### Database
- New migration: drop `user_type` + `user_role` enum, add `roles text[]`, update auto-profile trigger

### Delete
- `src/app/auth/register/venue/page.tsx`
- `src/actions/auth/register-venue-owner.ts`

### Modify
- `src/types/database.ts` — Replace `UserRole` and `user_type` with `roles: string[]`
- `src/actions/auth/sign-up.ts` — Set roles based on account type
- `src/app/dashboard/layout.tsx` — Check `roles.includes('venue_owner')`
- `src/app/(public)/account/layout.tsx` — Remove venue_owner redirect
- `src/actions/venues/create-venue.ts` — Check `roles.includes('venue_owner')`
- `src/app/auth/sign-up/page.tsx` — Point "Vill du lista din lokal?" to `/auth/sign-up/company`
- Public header component — Show "Hantera lokaler" link for venue owners
- `supabase/seed.sql` — Update to use roles
