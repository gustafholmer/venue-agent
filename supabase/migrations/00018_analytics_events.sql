-- Analytics events table for tracking marketplace activity
create table analytics_events (
  id uuid default gen_random_uuid() primary key,
  event_name text not null,
  user_id uuid references profiles(id) on delete set null,
  properties jsonb default '{}',
  created_at timestamptz default now()
);

-- Primary query pattern: event counts over time
create index idx_analytics_events_name_created
  on analytics_events (event_name, created_at);

-- RLS: deny all public access, service role only for inserts
alter table analytics_events enable row level security;

-- No policies = no public/anon access. Service role bypasses RLS.
