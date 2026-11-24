-- New push type: "a new interview / job review was posted" (misaeng-web src/lib/push/newJobReviewNotify.server.ts),
-- sent once per review to every Misaeng app user. Builds on push.sql (+ post_saves.sql for notification_dedupe,
-- which keeps it to one broadcast per review — without that table the broadcast is off).
-- A missing row in push_preferences means all on. Safe to re-run.

alter table if exists public.push_preferences add column if not exists job_review boolean not null default true;
