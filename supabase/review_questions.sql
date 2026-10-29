-- Private career questions to interview/job review authors (app only). Run once in the Supabase SQL Editor. Safe to re-run.
-- A reader asks the review's author a question (20P held). The author answers (hold captured, author earns 10P)
-- or declines; unanswered questions expire after 7 days (hold released). Only the asker and the author see the text;
-- everyone sees how many questions a review has received. Written by misaeng-web with the service role key only.

create table if not exists public.review_questions (
  id uuid primary key default gen_random_uuid(),
  post_id text not null,
  asker_id text not null,
  author_id text not null,
  question text not null,
  answer text,
  status text not null default 'pending' check (status in ('pending', 'answered', 'declined', 'expired', 'cancelled')),
  hold_id uuid,
  amount integer not null default 0,
  reward integer not null default 0,
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  expires_at timestamptz not null default now() + interval '7 days',
  resolved_at timestamptz
);
-- Career question topic (interview | process | role | career | visa) and the asker's own situation (optional).
alter table public.review_questions add column if not exists topic text;
alter table public.review_questions add column if not exists context text;
-- Either side may report the question or answer (App Store 1.2); the team is alerted and reviews it by hand.
alter table public.review_questions add column if not exists reported_at timestamptz;
alter table public.review_questions add column if not exists report_reason text;

create index if not exists review_questions_post_idx on public.review_questions (post_id);
create index if not exists review_questions_asker_idx on public.review_questions (asker_id, created_at desc);
create index if not exists review_questions_author_idx on public.review_questions (author_id, status, created_at desc);
create index if not exists review_questions_pending_idx on public.review_questions (expires_at) where status = 'pending';

-- Push preference for "someone asked about my review" / "my question was answered" (push.sql). Missing row = on.
alter table if exists public.push_preferences add column if not exists review_qna boolean not null default true;

alter table public.review_questions enable row level security;
grant select, insert, update, delete on public.review_questions to service_role;
