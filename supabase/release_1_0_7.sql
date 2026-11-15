-- Misaeng 1.0.7 — verification overhaul, parent accounts, career questions, onboarding quiz.
-- Run once in the Supabase SQL Editor (after points.sql, review_questions.sql and verification.sql). Safe to re-run.
-- Until it runs, the web degrades: parent invites answer 503 SETUP_REQUIRED (the My page card is hidden),
-- workplace document uploads fail on the kind check, and point rules keep their old database values.

-- MARK: 1. workplace documents (same pipeline as review documents, not tied to a post)

alter table public.verification_submissions drop constraint if exists verification_submissions_kind_check;
alter table public.verification_submissions add constraint verification_submissions_kind_check
  check (kind in ('interview', 'offer', 'opt', 'visa_approval', 'cpt', 'workplace_current', 'workplace_former'));
-- board = 'workplace', post_id = null for these (the one-pending-per-post index ignores null post ids).
create index if not exists verification_submissions_workplace_idx
  on public.verification_submissions (user_id, uploaded_at desc) where board = 'workplace';

-- MARK: 2. parent invites (src/lib/parents/parentInvites.server.ts)

create table if not exists public.parent_invites (
  code text primary key,                         -- 8 chars, link /{city}/invite/parent/{code}
  student_uid text not null,                     -- the inviting (verified) student
  student_nickname text,                         -- shown on the landing page if the profile has none
  city text,
  status text not null default 'open' check (status in ('open', 'joined', 'revoked', 'converted')),
  parent_uid text unique,                        -- the parent account linked through this invite
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,               -- open links expire after 14 days
  joined_at timestamptz,
  reward_status text not null default 'none' check (reward_status in ('none', 'scheduled', 'paid', 'forfeited')),
  reward_due_at timestamptz,                     -- joined_at + rule.parent_invite_delay_days (3)
  reward_paid_at timestamptz,
  reward_amount integer,                         -- earn.parent_invite at join time (30)
  forfeit_reason text                            -- parent_unavailable | student_unavailable | converted
);

create index if not exists parent_invites_student_idx on public.parent_invites (student_uid, created_at);
create index if not exists parent_invites_due_idx on public.parent_invites (reward_due_at) where reward_status = 'scheduled';

alter table public.parent_invites enable row level security;
revoke all on public.parent_invites from anon, authenticated;
grant select, insert, update, delete on public.parent_invites to service_role;

-- MARK: 3. point rules (database rows override src/lib/points/defaults.ts)

insert into public.point_rules (key, value, enabled, description) values
  ('earn.verify_school', 5, true, 'School email verified, once per account'),
  ('earn.verify_workplace', 5, true, 'Current workplace approved (work email or documents), once per account'),
  ('earn.verify_former_workplace', 5, true, 'Former workplace approved (documents), once per account'),
  ('earn.parent_invite', 30, true, 'Student, per parent who joined through their invite link, paid rule.parent_invite_delay_days later if the parent account is still in good standing'),
  ('rule.parent_invite_delay_days', 3, true, 'Days after the parent joins before the invite reward is paid'),
  ('cap.parent_invites', 2, true, 'Parents one student can invite (lifetime, joined parents count)'),
  ('cap.review_questions_per_send', 3, true, 'Questions one send can carry (each is its own hold)')
on conflict (key) do nothing;

-- Onboarding quiz is live (20 questions, src/lib/quiz/onboardingQuiz.ts).
update public.point_rules
  set enabled = true, description = 'All 20 onboarding quiz questions answered correctly (retries allowed), once per account'
  where key = 'earn.onboarding_quiz';

-- Career questions: 20P → 30P per question.
update public.point_rules
  set value = 30, description = 'Per private question to an interview/job review author. Held on send, captured on answer, released when declined or unanswered in 7 days'
  where key = 'spend.review_question';

-- Verification points are the fixed 5P bonuses above from 1.0.7 (school 5 · workplace 5 · former workplace 5, max 15).
-- The 30P welcome for the first school/work verification is switched off so a school verification is not 35P.
-- Skip this statement if the owner wants to keep the welcome bonus as well.
update public.point_rules
  set enabled = false, description = 'Off from 1.0.7: replaced by earn.verify_school / earn.verify_workplace / earn.verify_former_workplace'
  where key = 'earn.verify_first_email';

-- History rows so the ERP rule history shows the release changes.
insert into public.point_rules_history (target, key, before, after, changed_by, note)
select 'rule', key, null, jsonb_build_object('value', value, 'enabled', enabled), 'release_1_0_7.sql', 'Misaeng 1.0.7'
from public.point_rules
where key in ('earn.onboarding_quiz', 'spend.review_question', 'earn.verify_first_email', 'earn.verify_school',
              'earn.verify_workplace', 'earn.verify_former_workplace', 'earn.parent_invite');
