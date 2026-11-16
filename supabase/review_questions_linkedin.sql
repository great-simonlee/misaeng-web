-- Career questions — the asker's LinkedIn (misaeng-app 1.0.7). Builds on supabase/review_questions.sql and
-- supabase/coffee_chat_linkedin.sql (coffee_chat_profiles keeps the last used URL for both features).
--   * 1.0.7 sends a LinkedIn profile URL with every career question (review_questions.asker_linkedin), like a coffee
--     chat request. Only the review's author sees it (src/lib/points/reviewQuestions.server.ts), to decide whether to
--     answer or decline. Questions sent from 1.0.6 have none.
--   * URLs are stored normalized: https://<www.|xx.>linkedin.com/in/<slug>, at most 200 characters.
--
-- HOW TO RUN: staging SQL Editor first, then production — BEFORE deploying the misaeng-web build that reads it
-- (its select lists asker_linkedin). Safe to re-run.

alter table public.review_questions add column if not exists asker_linkedin text;

do $$ begin
  alter table public.review_questions add constraint review_questions_asker_linkedin_len
    check (asker_linkedin is null or char_length(asker_linkedin) <= 200);
exception when duplicate_object then null; end $$;
