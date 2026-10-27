-- Review verification documents (spec ch. 5): email screenshots / photos that prove an interview, offer, OPT/EAD,
-- visa/petition approval or CPT, uploaded by the author of a job-review or visa post.
--
-- Written and read by misaeng-web only, with the service role key (PostgREST + Storage REST). Users are Ellieo
-- backend accounts, so user ids and post ids are text (not Supabase auth uuids).
-- Run once in the Supabase SQL Editor. Safe to re-run.
--
-- What is kept forever: the result only (kind, company name or visa type, approved/rejected, reviewer, dates).
-- The files themselves live in the private bucket `verification-private` and are deleted within 72 hours after the
-- decision and in every case no later than 7 days after upload (`delete_due_at`). Deletion runs in misaeng-web
-- `POST /api/internal/verification-cleanup`, called every hour by pg_cron (bottom of this file).

-- MARK: types

do $$
begin
  create type public.verification_status as enum ('pending', 'approved', 'rejected', 'expired', 'withdrawn');
exception when duplicate_object then null;
end $$;
-- 'withdrawn' = the user deleted the files before a decision (spec 5.4 "사용자 철회 요청").
alter type public.verification_status add value if not exists 'withdrawn';

-- MARK: submissions (one per upload, 1-3 files)

create table if not exists public.verification_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,                       -- Ellieo uid of the post author
  post_id text,                                -- community post id (job-review / status board)
  board text,                                  -- 'job-review' | 'status'
  kind text not null check (kind in ('interview', 'offer', 'opt', 'visa_approval', 'cpt')),
  status public.verification_status not null default 'pending',
  uploaded_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text,                             -- reviewer email (ellieo-erp)
  reject_reason text,                          -- reason code only (never document contents)
  result_label text,                           -- company name or visa type. The only thing copied from a review.
  delete_due_at timestamptz not null,          -- uploaded_at + 7d; on decision min(decided_at + 72h, uploaded_at + 7d)
  deleted_at timestamptz,                      -- all files deleted (and confirmed gone)
  deletion_notified_at timestamptz,            -- the "your files were deleted" push went out
  consent_log_id text not null,                -- consent record id in the consent log store (legal/verification-consent-logs/{id}.json)
  consent_version text not null,               -- version of the spec 5.6 notice the user agreed to
  constraint verification_submissions_max_retention check (delete_due_at <= uploaded_at + interval '7 days')
);

create index if not exists verification_submissions_user_idx on public.verification_submissions (user_id, uploaded_at desc);
create index if not exists verification_submissions_post_idx on public.verification_submissions (post_id);
create index if not exists verification_submissions_status_idx on public.verification_submissions (status, uploaded_at);
create index if not exists verification_submissions_due_idx on public.verification_submissions (delete_due_at) where deleted_at is null;
-- At most one submission waiting for review per post.
create unique index if not exists verification_submissions_one_pending_per_post
  on public.verification_submissions (post_id) where status = 'pending' and post_id is not null;

-- MARK: files (metadata only; contents are never stored in the database)

create table if not exists public.verification_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.verification_submissions (id) on delete cascade,
  storage_path text not null unique,           -- '{submission_id}/{file_id}.jpg' in bucket verification-private
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'application/pdf')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  sha256 text not null,                        -- of the stored (metadata-stripped) bytes; for deletion checks
  uploaded_at timestamptz not null default now(),
  deleted_at timestamptz,
  delete_attempts integer not null default 0,  -- failed cleanup runs (each run retries 3 times)
  last_delete_error text,
  last_delete_attempt_at timestamptz
);

create index if not exists verification_files_submission_idx on public.verification_files (submission_id);
create index if not exists verification_files_live_idx on public.verification_files (submission_id) where deleted_at is null;

-- MARK: logs (append-only)

create table if not exists public.verification_deletion_log (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  file_id uuid not null,
  deleted_at timestamptz not null default now(),
  method text not null check (method in (
    'auto_after_decision', 'auto_expired', 'user_request', 'admin', 'account_deletion', 'upload_failed'
  )),
  storage_confirmed boolean not null           -- a GET of the same path returned 404 after the delete
);
create index if not exists verification_deletion_log_deleted_idx on public.verification_deletion_log (deleted_at desc);
create index if not exists verification_deletion_log_submission_idx on public.verification_deletion_log (submission_id);

create table if not exists public.verification_access_log (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  file_id uuid not null,
  reviewer_email text not null,
  action text not null default 'view_signed_url',  -- a 60-second signed URL was issued to this reviewer
  accessed_at timestamptz not null default now()
);
create index if not exists verification_access_log_submission_idx on public.verification_access_log (submission_id, accessed_at desc);
create index if not exists verification_access_log_accessed_idx on public.verification_access_log (accessed_at desc);

-- MARK: access. Server (service role) only; no client role can read or write anything here.

alter table public.verification_submissions enable row level security;
alter table public.verification_files enable row level security;
alter table public.verification_deletion_log enable row level security;
alter table public.verification_access_log enable row level security;

revoke all on public.verification_submissions, public.verification_files,
  public.verification_deletion_log, public.verification_access_log from anon, authenticated;

grant select, insert, update on public.verification_submissions, public.verification_files to service_role;
-- delete only for account deletion (spec 10.4); normal flows never delete rows.
grant delete on public.verification_submissions, public.verification_files to service_role;
-- Logs: insert + read only (append-only, even for the server).
grant select, insert on public.verification_deletion_log, public.verification_access_log to service_role;

-- MARK: private Storage bucket (never public; reviewers only see 60-second signed URLs)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-private', 'verification-private', false, 10485760,
        array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
-- No storage.objects policies are added on purpose: anon/authenticated get no access; the service role bypasses RLS.
-- (Dashboard alternative: Storage → New bucket → name `verification-private`, Public OFF, 10 MB limit,
--  MIME types image/jpeg, image/png, application/pdf.)

notify pgrst, 'reload schema';

-- MARK: hourly cleanup (pg_cron + pg_net → misaeng-web)
-- The deletion itself runs in misaeng-web (`POST /api/internal/verification-cleanup`, header
-- `x-internal-secret: $INTERNAL_VERIFICATION_SECRET`): expire unreviewed submissions, delete due files, confirm 404,
-- log, mark deleted, push the user, report failures and overdue files to ellieo-erp.
-- Fill in the placeholders, then run this block once. The secret is kept in Supabase Vault, not in the job text.
--
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
--
-- select vault.create_secret('<SAME VALUE AS INTERNAL_VERIFICATION_SECRET>', 'verification_cleanup_secret');
--
-- select cron.schedule(
--   'verification-cleanup-hourly',
--   '7 * * * *',
--   $job$
--   select net.http_post(
--     url := '<https://misaeng.com>/api/internal/verification-cleanup',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-internal-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'verification_cleanup_secret')
--     ),
--     body := '{"source":"pg_cron"}'::jsonb,
--     timeout_milliseconds := 55000
--   );
--   $job$
-- );
--
-- Check runs:   select * from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'verification-cleanup-hourly') order by start_time desc limit 20;
-- HTTP results: select id, status_code, content::text, created from net._http_response order by created desc limit 20;
-- Remove:       select cron.unschedule('verification-cleanup-hourly');
