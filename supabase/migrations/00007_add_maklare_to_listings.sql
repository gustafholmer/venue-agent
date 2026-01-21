-- Add mäklare relationship and early access fields to listings
alter table listings
  add column maklare_id uuid references maklare(id) on delete set null,
  add column status text default 'early_access' check (status in ('early_access', 'public', 'sold', 'withdrawn')),
  add column public_date timestamptz,
  add column ai_summary text;

-- Index for filtering by status and mäklare
create index listings_maklare_id_idx on listings(maklare_id);
create index listings_status_idx on listings(status);

-- Update RLS: mäklare can manage their own listings
create policy "Mäklare can insert their own listings"
  on listings for insert
  with check (
    maklare_id is null
    or maklare_id in (select id from maklare where user_id = auth.uid())
  );

create policy "Mäklare can update their own listings"
  on listings for update
  using (
    maklare_id in (select id from maklare where user_id = auth.uid())
  );

create policy "Mäklare can delete their own listings"
  on listings for delete
  using (
    maklare_id in (select id from maklare where user_id = auth.uid())
  );
