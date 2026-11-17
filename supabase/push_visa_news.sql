-- Misaeng 1.0.8 (2026-11-17): "비자 뉴스 알림" switch (My → Notifications) for the visa news digest
-- (Mon / Wed / Fri 13:00) and the Visa Bulletin push. Missing row / column = on.
-- The "posting" switch now covers the Mon / Wed / Fri new job postings digest (to every app user).
alter table if exists public.push_preferences add column if not exists visa_news boolean not null default true;
