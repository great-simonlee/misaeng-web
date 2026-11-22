-- Premium entitlements: one row per subscription / grant, from Stripe (web), Apple (App Store), Google (Play),
-- codes, parent gifts or staff. misaeng-web decides Premium from these rows (src/lib/premium/access.server.ts):
-- trialing / active with current_period_end in the future, or past_due for up to 3 days.
-- Written only by the server (Stripe webhook, App Store verification + notifications). Run once in the Supabase
-- SQL Editor (Misaeng production; staging for local tests). Safe to re-run.

create table if not exists public.premium_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_uid text not null,
  email text,
  source text not null check (source in ('stripe', 'apple', 'google', 'code', 'gift', 'staff')),
  plan text not null check (plan in ('monthly', 'season', 'annual', 'code', 'gift')),
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  external_id text not null unique,          -- Stripe subscription id / Apple originalTransactionId / Play purchase token
  customer_id text,                          -- Stripe customer (billing portal)
  product_id text,
  environment text,                          -- 'live' / 'test' / 'Production' / 'Sandbox'
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists premium_entitlements_user_idx on public.premium_entitlements (user_uid);

alter table public.premium_entitlements enable row level security;
revoke all on public.premium_entitlements from anon, authenticated;
-- New tables here don't get the default service_role grant; misaeng-web uses service_role.
grant select, insert, update, delete on public.premium_entitlements to service_role;
