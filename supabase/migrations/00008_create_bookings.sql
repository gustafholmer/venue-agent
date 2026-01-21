-- Viewing bookings table
create table bookings (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references users(id) on delete cascade not null,
  listing_id uuid references listings(id) on delete cascade not null,
  maklare_id uuid references maklare(id) on delete set null,

  status text default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),

  requested_at timestamptz default now(),
  confirmed_at timestamptz,
  viewing_time timestamptz,

  buyer_message text,
  maklare_notes text,

  unique(buyer_id, listing_id)
);

-- RLS policies
alter table bookings enable row level security;

-- Buyers can see their own bookings
create policy "Buyers can view own bookings"
  on bookings for select
  using (auth.uid() = buyer_id);

-- Buyers can create bookings
create policy "Buyers can create bookings"
  on bookings for insert
  with check (auth.uid() = buyer_id);

-- Buyers can cancel their own bookings
create policy "Buyers can update own bookings"
  on bookings for update
  using (auth.uid() = buyer_id);

-- Mäklare can see bookings for their listings
create policy "Mäklare can view bookings for their listings"
  on bookings for select
  using (
    maklare_id in (select id from maklare where user_id = auth.uid())
  );

-- Mäklare can update bookings for their listings
create policy "Mäklare can update bookings for their listings"
  on bookings for update
  using (
    maklare_id in (select id from maklare where user_id = auth.uid())
  );

-- Indexes
create index bookings_buyer_id_idx on bookings(buyer_id);
create index bookings_listing_id_idx on bookings(listing_id);
create index bookings_maklare_id_idx on bookings(maklare_id);
create index bookings_status_idx on bookings(status);
