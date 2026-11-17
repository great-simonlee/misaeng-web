-- Visa news (취업/비자 › 비자 ticker + news pages, Misaeng 1.0.7).
-- Official announcements only: USCIS newsroom (RSS) and Federal Register rules for USCIS. US federal works are
-- public domain (17 U.S.C. §105). ellieo-erp fetches + translates (Claude) and saves drafts; an admin publishes.
-- misaeng-web reads published rows with the service role key. Run once in the Supabase SQL Editor. Safe to re-run.

create table if not exists public.visa_news (
  id text primary key,                       -- 'uscis-<guid>' / 'fr-<document number>'
  source text not null check (source in ('uscis', 'federal_register')),
  url text not null unique,
  published_at timestamptz not null,         -- the agency's date
  fetched_at timestamptz not null default now(),
  title_en text not null,
  summary_en text,
  body_en text,                              -- English original, format-only cleanup
  title_ko text,
  summary_ko text,
  body_ko text,                              -- AI translation (reference only)
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  reviewed_by text,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists visa_news_published_idx on public.visa_news (status, published_at desc);

alter table public.visa_news enable row level security;
-- No policies: only the service role (misaeng-web, ellieo-erp) reads or writes.
grant select, insert, update, delete on public.visa_news to service_role;
