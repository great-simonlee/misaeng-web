-- Push notifications for the Misaeng app (misaeng-app) + company follows.
-- Written by misaeng-web with the service role key only. Run once in the Supabase SQL Editor. Safe to re-run.

-- One row per installed app (APNs device token). Removed on logout or when Apple reports the token invalid.
create table if not exists public.push_devices (
  token text primary key,
  user_id text not null,
  platform text not null default 'ios',            -- ios | android
  environment text not null default 'production',  -- APNs: sandbox (Xcode builds) | production (TestFlight / App Store)
  app text not null default 'misaeng',
  locale text not null default 'ko',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_devices_user_idx on public.push_devices (user_id);

-- Which notifications a user wants. A missing row means all on.
create table if not exists public.push_preferences (
  user_id text primary key,
  comment boolean not null default true,   -- a comment on my post
  reply boolean not null default true,     -- a reply to my comment
  posting boolean not null default true,   -- a new posting from a company I follow
  credit boolean not null default true,    -- credits earned
  -- post_recommend / post_save (someone recommended / saved my post) are added by post_saves.sql
  updated_at timestamptz not null default now()
);

-- Companies a user follows (Jobs → company → Follow). company_id = companies.id
create table if not exists public.company_follows (
  user_id text not null,
  company_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);
create index if not exists company_follows_company_idx on public.company_follows (company_id);

alter table public.push_devices enable row level security;
alter table public.push_preferences enable row level security;
alter table public.company_follows enable row level security;

grant select, insert, update, delete on public.push_devices, public.push_preferences, public.company_follows to service_role;

notify pgrst, 'reload schema';
