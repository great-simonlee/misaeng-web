-- Visa Bulletin employment-based dates (비자 뉴스 page card, Misaeng 1.0.7).
-- An admin pastes the State Department bulletin tables into ellieo-erp (Misaeng → Visa News → Visa Bulletin), checks
-- the parsed grid and publishes. misaeng-web serves the latest two published months. Run once; safe to re-run.
-- Grid jsonb: { "EB1": { "all": "2023-08-01" | "C" | "U", "china", "india", "mexico", "philippines" }, "EB2", … }

create table if not exists public.visa_bulletin (
  month date primary key,                    -- first day of the bulletin month
  final_action jsonb not null default '{}'::jsonb,
  dates_for_filing jsonb not null default '{}'::jsonb,
  source_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  reviewed_by text,
  updated_at timestamptz not null default now()
);

alter table public.visa_bulletin enable row level security;
-- No policies: only the service role (misaeng-web, ellieo-erp) reads or writes.
grant select, insert, update, delete on public.visa_bulletin to service_role;
