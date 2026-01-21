-- Mäklare partners table
create table maklare (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  company text,
  phone text,
  partnership_tier text default 'free' check (partnership_tier in ('free', 'basic', 'premium')),
  created_at timestamptz default now()
);

-- RLS policies
alter table maklare enable row level security;

-- Mäklare can read their own profile
create policy "Mäklare can read own profile"
  on maklare for select
  using (auth.uid() = user_id);

-- Mäklare can update their own profile
create policy "Mäklare can update own profile"
  on maklare for update
  using (auth.uid() = user_id);

-- Anyone can insert (for signup)
create policy "Anyone can create maklare profile"
  on maklare for insert
  with check (auth.uid() = user_id);

-- Index for faster lookups
create index maklare_user_id_idx on maklare(user_id);
