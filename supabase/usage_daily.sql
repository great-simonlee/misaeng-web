-- Daily usage counters for cost tracking (ellieo-erp → Misaeng → Costs).
-- Written by misaeng-web (Google Places calls, map views) with the service role key.
-- Run once in the Supabase SQL Editor. Safe to re-run.

create table if not exists public.usage_daily (
  day date not null,
  metric text not null,
  count bigint not null default 0,
  primary key (day, metric)
);

-- Atomic +n for today (New York date). Called through PostgREST: POST /rest/v1/rpc/increment_usage
create or replace function public.increment_usage(p_metric text, p_amount integer default 1)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.usage_daily (day, metric, count)
  values ((now() at time zone 'America/New_York')::date, p_metric, greatest(p_amount, 0))
  on conflict (day, metric) do update set count = public.usage_daily.count + excluded.count;
$$;

alter table public.usage_daily enable row level security;
revoke all on function public.increment_usage(text, integer) from public, anon, authenticated;

-- Places lookups cache (Google Places Details / Text Search results), so the same place is not paid for twice.
create table if not exists public.place_cache (
  cache_key text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table public.place_cache enable row level security;

-- Database + Storage size for the Costs tab (free plan limits: 500 MB database, 1 GB storage).
create or replace function public.usage_storage_stats()
returns json
language sql
security definer
set search_path = public, storage
as $$
  select json_build_object(
    'db_bytes', pg_database_size(current_database()),
    'storage_bytes', coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0),
    'storage_objects', (select count(*) from storage.objects)
  );
$$;
revoke all on function public.usage_storage_stats() from public, anon, authenticated;

-- ERP Costs tab settings (fixed monthly costs, plans). One row per key, edited in the ERP.
create table if not exists public.cost_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.cost_settings enable row level security;

-- Server-only access (misaeng-web and ellieo-erp use the service role key).
grant select, insert, update, delete on public.usage_daily, public.place_cache, public.cost_settings to service_role;
grant execute on function public.increment_usage(text, integer) to service_role;
grant execute on function public.usage_storage_stats() to service_role;

notify pgrst, 'reload schema';
