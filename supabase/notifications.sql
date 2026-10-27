-- In-app notification inbox for the Misaeng app (bell on Home). Every notification that misaeng-web sends as a push
-- (comment, reply, posting, credit, account) is also stored here, whether or not the user has a device or push on,
-- so it can be read later in the app. Written by misaeng-web with the service role key only.
-- Run once in the Supabase SQL Editor. Safe to re-run. Until it runs, the inbox is simply empty.

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  type text not null,                         -- comment | reply | posting | credit | account
  content jsonb not null,                     -- { "<locale>": { "title": "...", "body": "..." } } for every locale
  data jsonb not null default '{}'::jsonb,    -- what the app opens on tap (same payload as the push: type, postId, boardId, ...)
  thread_id text,                             -- same thread = same post / subject
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists app_notifications_user_idx on public.app_notifications (user_id, created_at desc);
create index if not exists app_notifications_unread_idx on public.app_notifications (user_id) where read_at is null;

alter table public.app_notifications enable row level security;
grant select, insert, update, delete on public.app_notifications to service_role;

-- Keep the inbox small: anything older than 90 days goes (run by pg_cron if enabled; harmless otherwise).
-- select cron.schedule('app_notifications_cleanup', '17 4 * * *',
--   $$delete from public.app_notifications where created_at < now() - interval '90 days'$$);
