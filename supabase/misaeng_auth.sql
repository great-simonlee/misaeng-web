-- Misaeng's own accounts (Supabase Auth) — replaces the Ellieo login. Run once in the Supabase SQL Editor. Safe to re-run.
-- Written by misaeng-web with the service role key only (RLS on, no policies).
--
-- Every Misaeng record (posts, comments, points, saves, push, coffee chats, verifications, profile.json …) is keyed
-- by a text `uid`. Existing members keep their Ellieo-era uid; a Supabase Auth user is linked to it here, so no data
-- has to move. New members get uid = their Supabase Auth user id.

-- Supabase Auth user → Misaeng uid.
create table if not exists public.auth_accounts (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  uid text not null unique,
  email text,
  -- how the uid was found: new | ellieo_password | ellieo_session | email (verified email matched a legacy member)
  linked_via text not null default 'new',
  created_at timestamptz not null default now()
);
create index if not exists auth_accounts_email_idx on public.auth_accounts (lower(email));

-- Members from the Ellieo era (scripts/auth/backfill-legacy-users.mjs): their uid and the email on their profile.
-- A verified sign-in with that email claims the uid (once; auth_accounts.uid is unique).
create table if not exists public.legacy_users (
  uid text primary key,
  email text,
  nickname text,
  -- where the uid was found: profile | post | points
  source text not null default 'profile',
  imported_at timestamptz not null default now()
);
create index if not exists legacy_users_email_idx on public.legacy_users (lower(email));

-- One-time codes Misaeng emails itself (school / work email verification). Only a hash of the code is stored.
create table if not exists public.email_codes (
  id uuid primary key default gen_random_uuid(),
  purpose text not null,            -- school_email | work_email
  uid text not null,
  email text not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists email_codes_lookup_idx on public.email_codes (purpose, uid, lower(email), created_at desc);

alter table public.auth_accounts enable row level security;
alter table public.legacy_users enable row level security;
alter table public.email_codes enable row level security;

-- Newer Supabase projects don't grant table privileges automatically: the server's service role needs them.
grant select, insert, update, delete on public.auth_accounts, public.legacy_users, public.email_codes to service_role;
