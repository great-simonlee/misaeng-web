-- 중고거래 문의 스레드 (app). Run once in the Supabase SQL Editor. Safe to re-run.
-- A buyer opens one thread per listing; buyer and seller trade messages in it, each message is a push to the other
-- side (no live chat). A sold listing's threads close (read only). Written by misaeng-web with the service role key.

create table if not exists public.marketplace_inquiries (
  id uuid primary key default gen_random_uuid(),
  post_id text not null,
  city text,
  seller_id text not null,
  buyer_id text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_message text,
  last_sender_id text,
  seller_unread integer not null default 0,
  buyer_unread integer not null default 0,
  reported_at timestamptz,
  report_reason text,
  unique (post_id, buyer_id)
);

create table if not exists public.marketplace_inquiry_messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.marketplace_inquiries (id) on delete cascade,
  sender_id text not null,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists marketplace_inquiries_seller_idx on public.marketplace_inquiries (seller_id, last_message_at desc);
create index if not exists marketplace_inquiries_buyer_idx on public.marketplace_inquiries (buyer_id, last_message_at desc);
create index if not exists marketplace_inquiries_post_idx on public.marketplace_inquiries (post_id);
create index if not exists marketplace_inquiries_buyer_day_idx on public.marketplace_inquiries (buyer_id, created_at desc);
create index if not exists marketplace_inquiry_messages_thread_idx on public.marketplace_inquiry_messages (inquiry_id, created_at);

alter table public.marketplace_inquiries enable row level security;
alter table public.marketplace_inquiry_messages enable row level security;
grant select, insert, update, delete on public.marketplace_inquiries to service_role;
grant select, insert, update, delete on public.marketplace_inquiry_messages to service_role;
