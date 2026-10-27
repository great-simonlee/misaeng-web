-- Saved posts on the account (web heart "찜" / app heart & bookmark) + like/save notifications.
-- Written by misaeng-web with the service role key only. Run once in the Supabase SQL Editor. Safe to re-run.
-- Until it runs, saves stay on the device (the API answers "nothing stored") and recommend/save notifications are off.

-- One row per saved post. kind = housing (housing listing id) | community (community post id, board = its board)
create table if not exists public.post_saves (
  user_id text not null,
  kind text not null check (kind in ('housing', 'community')),
  target_id text not null,
  board text,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, target_id)
);
create index if not exists post_saves_target_idx on public.post_saves (kind, target_id);

-- Notification anti-spam keys (hashed, no personal data):
--   first-time keys  sha256(type|user|post) → a user's recommend/save of a post notifies its author only once
--   push throttle    "push:<type>:<postId>"  → created_at = last push for that post and type (max 1 per 6 hours)
create table if not exists public.notification_dedupe (
  key text primary key,
  created_at timestamptz not null default now()
);

-- New push types (push.sql): someone recommended / saved my post. A missing row in push_preferences means all on.
alter table if exists public.push_preferences add column if not exists post_recommend boolean not null default true;
alter table if exists public.push_preferences add column if not exists post_save boolean not null default true;

alter table public.post_saves enable row level security;
alter table public.notification_dedupe enable row level security;

grant select, insert, update, delete on public.post_saves, public.notification_dedupe to service_role;

-- Keep the dedupe table small: push throttle keys older than a day are useless
-- (run by pg_cron if enabled; harmless otherwise).
-- select cron.schedule('notification_dedupe_cleanup', '27 4 * * *',
--   $$delete from public.notification_dedupe where key like 'push:%' and created_at < now() - interval '1 day'$$);

notify pgrst, 'reload schema';
