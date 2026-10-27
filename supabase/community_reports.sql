-- Community reports (posts and comments) for Misaeng — App Store guideline 1.2 (UGC moderation).
-- Replaces the Storage JSON `community-reports/index.json` (read-modify-write race between the web and the ERP).
-- Written by misaeng-web (POST /api/community/{id}/report) and ellieo-erp (Misaeng → Reports) with the service role key only.
-- Until this runs, both fall back to the old JSON file. Old JSON reports stay readable in the ERP (it merges both).
-- Run in the Supabase SQL Editor. Safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post', 'comment')),
  target_id text not null,
  post_id text not null,
  board text not null default '',
  reporter_uid text not null,
  reporter_email text,
  author_uid text,
  reason text not null,               -- spam | abuse | inappropriate | misinformation | privacy | other
  detail text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved', 'dismissed')),
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text,
  unique (target_type, target_id, reporter_uid)
);

-- The ERP allows 'reviewed' (between open and resolved); make sure an older version of this table accepts it.
alter table public.community_reports drop constraint if exists community_reports_status_check;
alter table public.community_reports
  add constraint community_reports_status_check check (status in ('open', 'reviewed', 'resolved', 'dismissed'));

create index if not exists community_reports_target_idx on public.community_reports (target_type, target_id);
create index if not exists community_reports_reporter_idx on public.community_reports (reporter_uid);
create index if not exists community_reports_status_idx on public.community_reports (status, created_at desc);
create index if not exists community_reports_author_idx on public.community_reports (author_uid);

alter table public.community_reports enable row level security;
-- No policies: anon/authenticated cannot read or write. Only the service role (server) can.
revoke all on public.community_reports from anon, authenticated;
grant select, insert, update, delete on public.community_reports to service_role;

notify pgrst, 'reload schema';
