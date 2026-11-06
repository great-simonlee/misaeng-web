-- 개발자 노트: short public notes from the (solo) developer — feedback we received and what's planned.
-- Written by admins in the Misaeng ERP staff app (ellieo-erp /api/support-inbox/dev-notes),
-- read by everyone through misaeng-web GET /api/dev-notes (published rows only).

create table if not exists public.dev_notes (
  id uuid primary key default gen_random_uuid(),
  -- feedback = 받은 문의/건의 (summarised, never personal details) · roadmap = 작업 예정
  section text not null check (section in ('feedback', 'roadmap')),
  status text not null default 'planned' check (status in ('received', 'planned', 'in_progress', 'done')),
  title text not null check (char_length(title) between 1 and 120),
  title_en text check (title_en is null or char_length(title_en) <= 120),
  detail text check (detail is null or char_length(detail) <= 500),
  detail_en text check (detail_en is null or char_length(detail_en) <= 500),
  published boolean not null default true,
  -- Lower first within a section; ties → newest first
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text
);

create index if not exists dev_notes_public_idx on public.dev_notes (published, section, sort, updated_at desc);

alter table public.dev_notes enable row level security;
-- No policies: only the service role (servers) can read or write.
grant select, insert, update, delete on public.dev_notes to service_role;

notify pgrst, 'reload schema';
