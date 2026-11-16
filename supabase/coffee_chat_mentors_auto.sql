-- Automatic mentors (misaeng-app 1.0.7). Builds on supabase/coffee_chat_mentors.sql.
--   * Writing a job review with career questions or coffee chats on (both on by default; the write screen's last
--     step says it registers you as a mentor) makes the author a mentor once they have an approved offer
--     verification — right away, or when it is approved (misaeng-web syncAutoMentor).
--   * takes_coffee / takes_questions: what the mentor takes. The mentor list shows "커피챗 가능" / "커리어 질문 가능";
--     a mentor with takes_coffee = false gets no coffee chat requests (career questions stay per review).
--   * verified_kind: 'offer' (합격 인증) | 'workplace' (직장 인증, current or former — people who didn't get the offer
--     can mentor too). A workplace mentor verified by work email has no documents submission, so submission_id
--     becomes nullable.
--   * source: 'settings' (registered in 멘토 설정) | 'review' (registered automatically). Saving 멘토 설정 makes it
--     'settings' with coffee chats on.
--
-- HOW TO RUN: staging SQL Editor first, then production — BEFORE deploying the misaeng-web build that reads it (the
-- mentor list selects these columns). Safe to re-run.

alter table public.coffee_chat_mentors add column if not exists takes_coffee boolean not null default true;
alter table public.coffee_chat_mentors add column if not exists takes_questions boolean not null default true;
alter table public.coffee_chat_mentors add column if not exists source text not null default 'settings';

do $$ begin
  alter table public.coffee_chat_mentors add constraint coffee_chat_mentors_source_check
    check (source in ('settings', 'review'));
exception when duplicate_object then null; end $$;

alter table public.coffee_chat_mentors alter column submission_id drop not null;
alter table public.coffee_chat_mentors add column if not exists verified_kind text not null default 'offer';

do $$ begin
  alter table public.coffee_chat_mentors add constraint coffee_chat_mentors_verified_kind_check
    check (verified_kind in ('offer', 'workplace'));
exception when duplicate_object then null; end $$;
