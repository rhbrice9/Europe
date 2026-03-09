-- Run this in your Supabase project's SQL Editor
-- Dashboard → SQL Editor → New Query → paste this → Run

-- 1. Create the trip_data table
create table if not exists public.trip_data (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now()
);

-- 2. Enable Row Level Security
alter table public.trip_data enable row level security;

-- 3. Allow anyone with the anon key to read and write
--    (the app URL is your "password" — share it only with your travel group)
create policy "Allow all reads"
  on public.trip_data for select
  using (true);

create policy "Allow all writes"
  on public.trip_data for insert
  with check (true);

create policy "Allow all updates"
  on public.trip_data for update
  using (true);

-- 4. Enable Realtime for this table
--    (also make sure to enable Realtime for the table in
--     Supabase Dashboard → Database → Replication → trip_data)
alter publication supabase_realtime add table public.trip_data;
