-- Misaeng Premium · Google Play account links (2026-11-24)
-- The Android app puts obfuscatedAccountId = sha256(salt:uid) on every Play purchase. This table maps that id back to
-- the Misaeng account (written when /api/premium/me hands the id out), so a real-time notification can turn Premium
-- on and acknowledge the purchase even if the app never got to report it (Google refunds purchases not acknowledged
-- within 3 days). Run on staging and prod (SQL Editor). Safe to re-run.

create table if not exists public.premium_google_accounts (
  account_id text primary key,
  user_uid text not null unique,
  created_at timestamptz not null default now()
);
alter table public.premium_google_accounts enable row level security;
revoke all on public.premium_google_accounts from anon, authenticated;
grant select, insert, update, delete on public.premium_google_accounts to service_role;
