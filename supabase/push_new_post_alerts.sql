-- 새 글 알림 (opt-in per board, owner 2026-11-23): 맛집 · 룸메이트·서블렛 · CPT·OPT·비자·영주권 · 면접·취업 후기 · 질문·자유.
-- One row = that user turned that board's new-post alert ON. No row = off, so everyone (new and existing users)
-- starts with every board off. The old push_preferences.job_review column is no longer used for broadcasts.
-- misaeng-web src/lib/push/boardAlerts.server.ts. Builds on push.sql. Safe to re-run.

create table if not exists public.push_board_alerts (
  user_id text not null,
  board text not null check (board in ('food', 'roommate', 'status', 'job-review', 'anonymous')),
  created_at timestamptz not null default now(),
  primary key (user_id, board)
);

-- "who wants board X" is the broadcast query
create index if not exists push_board_alerts_board_idx on public.push_board_alerts (board, user_id);

alter table public.push_board_alerts enable row level security;
-- Server (service role) only, like push_preferences: no policies for anon / authenticated.

-- New tables aren't exposed to the Data API by default on newer projects (staging answered 403 on 11-23):
-- the server reads/writes with the service role, so grant it explicitly.
grant select, insert, update, delete on public.push_board_alerts to service_role;
