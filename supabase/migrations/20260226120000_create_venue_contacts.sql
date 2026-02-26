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
