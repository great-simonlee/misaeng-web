-- Feedback → change tracking for "미생 멤버들과의 대화" (dev_notes).
-- conversation_ids: the 문의/건의 threads (support_conversations) this change answers.
-- shipped_at: when it was marked done. notified_at: when the members behind it got the "반영됐어요" push (once).
alter table public.dev_notes add column if not exists conversation_ids uuid[] not null default '{}';
alter table public.dev_notes add column if not exists shipped_at timestamptz;
alter table public.dev_notes add column if not exists notified_at timestamptz;

create index if not exists dev_notes_conversation_ids_idx on public.dev_notes using gin (conversation_ids);

notify pgrst, 'reload schema';
