-- Coffee chat v2 — LinkedIn exchange (misaeng-app only). Builds on supabase/coffee_chat_mentors.sql (run that first).
--   * The requester sends their LinkedIn profile URL with every request (coffee_chat_requests.requester_linkedin).
--   * The mentor gives theirs when accepting (coffee_chat_requests.mentor_linkedin); the mentor card keeps one to
--     prefill the accept sheet (coffee_chat_mentors.linkedin). It is NEVER shown on mentor lists / cards / profiles,
--     so anonymous reviews can't be tied to a person.
--   * The requester's last used URL lives in coffee_chat_profiles (one row per user) to prefill the next request.
--     A separate table rather than the Supabase profile record: the profile is read by many screens (community,
--     author cards), while this table is only ever read by the coffee chat routes, and account deletion simply
--     deletes the row.
--   * Who may see which value is decided by misaeng-web (src/lib/points/coffeeChatMentors.server.ts), never by
--     the client. Written only by misaeng-web with the service role key (RLS on, no policies).
--   * URLs are stored normalized: https://<www.|xx.>linkedin.com/in/<slug>, at most 200 characters.
--
-- HOW TO RUN: staging SQL Editor first, then production. Safe to re-run (add column if not exists,
-- create table if not exists, constraints added once). No function is changed: misaeng-web writes the new columns
-- with a plain PATCH around request_coffee_chat / transition_coffee_chat.

-- MARK: requests

alter table public.coffee_chat_requests add column if not exists requester_linkedin text;
alter table public.coffee_chat_requests add column if not exists mentor_linkedin text;

do $$ begin
  alter table public.coffee_chat_requests add constraint coffee_chat_requests_requester_linkedin_len
    check (requester_linkedin is null or char_length(requester_linkedin) <= 200);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.coffee_chat_requests add constraint coffee_chat_requests_mentor_linkedin_len
    check (mentor_linkedin is null or char_length(mentor_linkedin) <= 200);
exception when duplicate_object then null; end $$;

-- MARK: mentors

alter table public.coffee_chat_mentors add column if not exists linkedin text;

do $$ begin
  alter table public.coffee_chat_mentors add constraint coffee_chat_mentors_linkedin_len
    check (linkedin is null or char_length(linkedin) <= 200);
exception when duplicate_object then null; end $$;

-- MARK: requester's last used LinkedIn

create table if not exists public.coffee_chat_profiles (
  user_id text primary key,
  linkedin text check (linkedin is null or char_length(linkedin) <= 200),
  updated_at timestamptz not null default now()
);

-- MARK: access. Service role only.

alter table public.coffee_chat_profiles enable row level security;
revoke all on public.coffee_chat_profiles from anon, authenticated;
grant select, insert, update, delete on public.coffee_chat_profiles to service_role;

notify pgrst, 'reload schema';
