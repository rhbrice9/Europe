-- Run this in your Supabase project's SQL Editor
-- Dashboard → SQL Editor → New Query → paste this → Run
--
-- ⚠️  If you already have the old table, run the MIGRATION section at the bottom instead.

-- ══════════════════════════════════════════════════════════════════════════════
-- FRESH INSTALL (new project)
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Create the trip_data table with a 500 KB size guard
create table if not exists public.trip_data (
  key         text primary key,
  value       text not null  check (length(value) < 500000),
  updated_at  timestamptz not null default now()
);

-- 2. Enable Row Level Security
alter table public.trip_data enable row level security;

-- 3. RLS policies
--    • SELECT — open to anyone with the anon key (viewers)
--    • INSERT / UPDATE — require the request header x-write-password to match
--      the group passphrase.  The front-end sends this header on every write.
--      This keeps reads open while gating all mutations.

create policy "Allow all reads"
  on public.trip_data for select
  using (true);

create policy "Password-gated inserts"
  on public.trip_data for insert
  with check (
    current_setting('request.headers', true)::json ->> 'x-write-password'
      = 'The Mutch-Too-Many Travelers'
  );

create policy "Password-gated updates"
  on public.trip_data for update
  using (
    current_setting('request.headers', true)::json ->> 'x-write-password'
      = 'The Mutch-Too-Many Travelers'
  );

create policy "Password-gated deletes"
  on public.trip_data for delete
  using (
    current_setting('request.headers', true)::json ->> 'x-write-password'
      = 'The Mutch-Too-Many Travelers'
  );

-- 4. Enable Realtime for this table
--    (also toggle Realtime ON for trip_data in
--     Supabase Dashboard → Database → Replication)
alter publication supabase_realtime add table public.trip_data;


-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION (if you already have the old table with open policies)
-- ══════════════════════════════════════════════════════════════════════════════
-- Uncomment and run ONLY the lines below if you are upgrading an existing table.

-- -- Add the value length constraint
-- alter table public.trip_data
--   add constraint trip_data_value_max_length check (length(value) < 500000);

-- -- Drop the old wide-open write policies
-- drop policy if exists "Allow all writes"   on public.trip_data;
-- drop policy if exists "Allow all updates"  on public.trip_data;

-- -- Create password-gated policies
-- create policy "Password-gated inserts"
--   on public.trip_data for insert
--   with check (
--     current_setting('request.headers', true)::json ->> 'x-write-password'
--       = 'The Mutch-Too-Many Travelers'
--   );

-- create policy "Password-gated updates"
--   on public.trip_data for update
--   using (
--     current_setting('request.headers', true)::json ->> 'x-write-password'
--       = 'The Mutch-Too-Many Travelers'
--   );

-- create policy "Password-gated deletes"
--   on public.trip_data for delete
--   using (
--     current_setting('request.headers', true)::json ->> 'x-write-password'
--       = 'The Mutch-Too-Many Travelers'
--   );
