-- Misaeng NYC clickwrap consent audit log.
-- Append-only: do not GRANT UPDATE or DELETE.
-- Run in the Supabase SQL editor if you want a Postgres table in addition to
-- the Storage JSON store used by the live app (`legal/consent-logs/*.json`).

create table if not exists public.consent_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  email text,
  terms_version text not null,
  privacy_version text not null,
  consented_at timestamptz not null default timezone('utc', now()),
  ip_address text,
  user_agent text,
  consent_method text not null,
  -- Language the consent screen was shown in (the English version is always the legal one).
  ui_language text not null check (ui_language in ('en', 'ko', 'vi', 'ja', 'zh-CN', 'zh-TW', 'id')),
  -- Site the user agreed on (one account works on both).
  brand text not null default 'misaeng' check (brand in ('misaeng', 'ellieo')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists consent_logs_user_id_consented_at_idx
  on public.consent_logs (user_id, consented_at desc);

create table if not exists public.legal_policy (
  id text primary key default 'current',
  terms_version text not null,
  privacy_version text not null,
  terms_change_type text not null check (terms_change_type in ('material', 'minor')),
  privacy_change_type text not null check (privacy_change_type in ('material', 'minor')),
  summary_en text not null,
  summary_ko text not null,
  published_at timestamptz not null default timezone('utc', now()),
  published_by text
);

revoke update, delete on public.consent_logs from anon, authenticated;
alter table public.consent_logs enable row level security;
alter table public.legal_policy enable row level security;

-- 2026-10: Ellieo + 7 languages. For a table created before this change:
alter table public.consent_logs drop constraint if exists consent_logs_ui_language_check;
alter table public.consent_logs
  add constraint consent_logs_ui_language_check
  check (ui_language in ('en', 'ko', 'vi', 'ja', 'zh-CN', 'zh-TW', 'id'));
alter table public.consent_logs
  add column if not exists brand text not null default 'misaeng'
  check (brand in ('misaeng', 'ellieo'));
