-- Site a community report was made on (src/lib/community/contentBrand.ts).
-- Missing / old rows = 'misaeng'. Ellieo (ellieo.com) writes 'ellieo'. Safe to run more than once.
-- NOT applied yet: run in the Supabase SQL editor (same project as community_reports.sql).
alter table public.community_reports
  add column if not exists brand text not null default 'misaeng';

alter table public.community_reports drop constraint if exists community_reports_brand_check;
alter table public.community_reports
  add constraint community_reports_brand_check check (brand in ('misaeng', 'ellieo'));

create index if not exists community_reports_brand_idx on public.community_reports (brand, created_at desc);

-- PostgREST picks up the new column after a schema reload
notify pgrst, 'reload schema';
