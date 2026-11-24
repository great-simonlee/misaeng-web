-- Misaeng 1.0.9 — parent ↔ child links + parent-paid Premium (owner decisions 2026-11-24).
-- Run in the Supabase SQL Editor on staging and production, AFTER premium.sql, premium_fix_1122.sql,
-- premium_google_accounts.sql and release_1_0_7.sql. Idempotent: safe to re-run.
-- Code: src/lib/family/* (links, email requests, parent-paid Premium, digests), src/lib/premium/*.
-- Until it runs, /api/family answers 503 SETUP_REQUIRED and Premium keeps working exactly as before.

-- MARK: 1. parent_links — one row per parent ↔ child link (both link ways: invite link and email request)

create table if not exists public.parent_links (
  id uuid primary key default gen_random_uuid(),
  parent_uid text not null,
  child_uid text not null,
  source text not null check (source in ('invite', 'email')),
  status text not null default 'active' check (status in ('active', 'ended')),
  invite_code text,                              -- source 'invite': parent_invites.code
  request_id uuid,                               -- source 'email': parent_link_requests.id
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_by text,                                 -- uid of the side that unlinked, or 'account_deleted:<uid>' / 'converted' / 'staff:<id>'
  check (parent_uid <> child_uid)
);
create unique index if not exists parent_links_active_pair_idx
  on public.parent_links (parent_uid, child_uid) where status = 'active';
create index if not exists parent_links_parent_idx on public.parent_links (parent_uid, created_at);
create index if not exists parent_links_child_idx on public.parent_links (child_uid, created_at);

alter table public.parent_links enable row level security;
revoke all on public.parent_links from anon, authenticated;
grant select, insert, update, delete on public.parent_links to service_role;

-- MARK: 2. parent_link_requests — parent-first link by email; the child must accept

create table if not exists public.parent_link_requests (
  id uuid primary key default gen_random_uuid(),
  parent_uid text not null,
  email text,                                    -- as entered (shown to the parent); cleared 14 days after creation unless accepted
  email_norm text,                               -- lower-case, Gmail dots/+tags removed; cleared with email
  child_uid text,                                -- filled when a member with this email is found (or on accept)
  token text not null unique,                    -- mail link /{locale}/{city}/family/accept?token=…
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired', 'canceled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,               -- created_at + 14 days
  decided_at timestamptz
);
-- one pending request per parent + email
create unique index if not exists parent_link_requests_pending_idx
  on public.parent_link_requests (parent_uid, email_norm) where status = 'pending';
create index if not exists parent_link_requests_parent_idx on public.parent_link_requests (parent_uid, created_at);
create index if not exists parent_link_requests_email_idx on public.parent_link_requests (email_norm) where status = 'pending';
create index if not exists parent_link_requests_child_idx on public.parent_link_requests (child_uid) where status = 'pending';

alter table public.parent_link_requests enable row level security;
revoke all on public.parent_link_requests from anon, authenticated;
grant select, insert, update, delete on public.parent_link_requests to service_role;

-- MARK: 3. parent_invites: a parent account may accept invites from several children

alter table public.parent_invites drop constraint if exists parent_invites_parent_uid_key;
create index if not exists parent_invites_parent_idx on public.parent_invites (parent_uid) where parent_uid is not null;

-- Backfill: every joined invite is an active link (the code also adds a missing link from profile.invitedByUid
-- the first time that parent's family is read — profiles live in Storage, not in SQL).
insert into public.parent_links (parent_uid, child_uid, source, status, invite_code, created_at)
select i.parent_uid, i.student_uid, 'invite', 'active', i.code, coalesce(i.joined_at, i.created_at)
from public.parent_invites i
where i.status = 'joined'
  and i.parent_uid is not null
  and i.parent_uid <> i.student_uid
  and not exists (
    select 1 from public.parent_links l where l.parent_uid = i.parent_uid and l.child_uid = i.student_uid
  );

-- MARK: 4. premium_entitlements.payer_uid — who paid (null = the member paid themselves)

alter table public.premium_entitlements add column if not exists payer_uid text;
create index if not exists premium_entitlements_payer_idx on public.premium_entitlements (payer_uid) where payer_uid is not null;

-- MARK: 5. beneficiary purchase ids for in-app purchases a parent makes for a child
-- One row per (child, parent). The iOS app puts `apple_token` (appAccountToken) and the Android app puts
-- `google_account_id` (obfuscatedAccountId) on the purchase; the server then saves the purchase with
-- user_uid = child, payer_uid = parent — also when the parent restores purchases on their own phone.
-- (A separate table rather than extra rows in premium_apple_accounts / premium_google_accounts: those are keyed by
-- user_uid alone, and the live code upserts on that key.)

create table if not exists public.premium_beneficiary_accounts (
  apple_token uuid primary key default gen_random_uuid(),
  google_account_id text not null unique,        -- sha256(salt:family:child:parent), 64 hex
  user_uid text not null,                        -- the child (gets Premium)
  payer_uid text not null,                       -- the parent (pays)
  created_at timestamptz not null default now(),
  unique (user_uid, payer_uid)
);
alter table public.premium_beneficiary_accounts enable row level security;
revoke all on public.premium_beneficiary_accounts from anon, authenticated;
grant select, insert, update, delete on public.premium_beneficiary_accounts to service_role;

-- The contract also names payer_uid on these two tables; the columns stay null (kept for the ERP / future use).
alter table public.premium_apple_accounts add column if not exists payer_uid text;
do $$ begin
  if to_regclass('public.premium_google_accounts') is not null then
    alter table public.premium_google_accounts add column if not exists payer_uid text;
  end if;
end $$;

-- MARK: 6. parent digests (14 mornings after a parent-paid subscription starts) and reminders sent

create table if not exists public.parent_digest (
  entitlement_id uuid primary key,               -- premium_entitlements.id of the parent-paid subscription
  parent_uid text not null,
  child_uid text not null,
  started_at timestamptz not null,               -- subscription start (incl. trial start)
  days_sent integer not null default 0,
  last_sent_on date,                             -- Korea date of the last digest (one per parent per day)
  created_at timestamptz not null default now()
);
create index if not exists parent_digest_parent_idx on public.parent_digest (parent_uid, started_at);

create table if not exists public.parent_digest_settings (
  parent_uid text primary key,
  opted_out boolean not null default false,
  last_sent_on date,                             -- one digest per parent per Korea day, whatever the number of children
  updated_at timestamptz not null default now()
);

-- Idempotency markers for the daily job (renewal / trial reminders, Apple manual-cancel notices)
create table if not exists public.family_notices (
  key text primary key,                          -- e.g. renewal:<entitlement id>:<period end date>
  uid text,
  created_at timestamptz not null default now()
);

alter table public.parent_digest enable row level security;
alter table public.parent_digest_settings enable row level security;
alter table public.family_notices enable row level security;
revoke all on public.parent_digest from anon, authenticated;
revoke all on public.parent_digest_settings from anon, authenticated;
revoke all on public.family_notices from anon, authenticated;
grant select, insert, update, delete on public.parent_digest to service_role;
grant select, insert, update, delete on public.parent_digest_settings to service_role;
grant select, insert, update, delete on public.family_notices to service_role;
