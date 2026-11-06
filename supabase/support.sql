-- Misaeng support: housing chat (realtime, misaeng-app ↔ "Misaeng ERP" staff app), 문의/건의 threads (web + app, not realtime),
-- staff rotation for housing leads, staff push devices (staff app), settings.
-- Written by misaeng-web (users, /api/support/*, tick) and ellieo-erp (staff, /api/support-inbox/*) with the service role key only.
-- Design: ~/Desktop/messaging_design.md §13. Run in the Supabase SQL Editor (staging first). Safe to re-run.

create extension if not exists pgcrypto;

-- Staff who can receive support work. email = lowercase Firebase/ERP login email.
create table if not exists public.support_staff (
  email text primary key,
  agent_id text,
  display_name text not null default '',
  active boolean not null default true,
  in_rotation boolean not null default false,   -- Misaeng housing lead rotation (Super Admin picks)
  in_rotation_ellieo boolean not null default false,  -- Ellieo housing lead rotation (support_brand_rotation.sql)
  rotation_order integer not null default 0,
  accepting boolean not null default true,      -- 받기 on/off (vacation, off hours)
  last_assigned_at timestamptz,
  inbox_key text not null default encode(gen_random_bytes(16), 'hex'),  -- realtime channel name part
  updated_at timestamptz not null default now()
);

-- One row per housing chat or 문의/건의 thread.
create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  brand text not null default 'misaeng',
  city text not null default 'nyc',
  kind text not null check (kind in ('housing', 'question', 'suggestion')),
  status text not null default 'open' check (status in ('open', 'waiting_user', 'closed')),
  user_uid text not null,
  user_email text,
  user_name text,
  title text,                                   -- 문의/건의 subject
  listing_id text,
  listing_snapshot jsonb,                       -- { title, address, area, price, photo, propertyId, unitId } at start
  housing_snapshot jsonb,                       -- housing profile at start (spec §4.3)
  lead_source text not null default 'misaeng',
  assignee_email text,
  assigned_at timestamptz,
  sla_started_at timestamptz,                   -- housing: user message waiting for a staff reply
  escalation_level integer not null default 0,  -- 0 none, 1 next staff (1h), 2 final (2h)
  first_response_at timestamptz,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  last_sender text,                             -- user | staff | system
  user_unread integer not null default 0,
  staff_unread integer not null default 0,
  user_last_read_at timestamptz,
  staff_last_read_at timestamptz,
  user_email_due_at timestamptz,                -- unread staff reply → email after a delay (tick)
  user_emailed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by text
);
create index if not exists support_conversations_user_idx on public.support_conversations (user_uid, last_message_at desc);
create index if not exists support_conversations_assignee_idx on public.support_conversations (assignee_email, status, last_message_at desc);
create index if not exists support_conversations_kind_idx on public.support_conversations (kind, status, last_message_at desc);
create index if not exists support_conversations_sla_idx on public.support_conversations (status, sla_started_at) where kind = 'housing';

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations (id) on delete cascade,
  sender_type text not null check (sender_type in ('user', 'staff', 'system')),
  sender_uid text,
  sender_email text,
  sender_display text,
  body text not null,
  redactions integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists support_messages_conversation_idx on public.support_messages (conversation_id, created_at);

-- Audit: assign / transfer / escalate / status / staff view / settings.
create table if not exists public.support_events (
  id bigserial primary key,
  conversation_id uuid references public.support_conversations (id) on delete cascade,
  type text not null,
  actor text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists support_events_conversation_idx on public.support_events (conversation_id, created_at);

create table if not exists public.support_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Housing first-inquiry form (spec §4), one per user.
create table if not exists public.support_housing_profiles (
  uid text primary key,
  profile jsonb not null default '{}'::jsonb,
  skip_confirm_until timestamptz,
  updated_at timestamptz not null default now()
);

-- Per-user realtime channel key.
create table if not exists public.support_user_state (
  uid text primary key,
  inbox_key text not null default encode(gen_random_bytes(16), 'hex'),
  updated_at timestamptz not null default now()
);

-- "Misaeng ERP" staff app devices (APNs). Separate from push_devices (user app).
create table if not exists public.staff_push_devices (
  token text primary key,
  email text not null,
  platform text not null default 'ios',
  environment text not null default 'production',
  app text not null default 'misaeng-erp',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists staff_push_devices_email_idx on public.staff_push_devices (email);

insert into public.support_settings (key, value) values
  ('support.enabled', 'false'::jsonb),                          -- housing chat in the apps
  ('inquiry.enabled', 'false'::jsonb),                          -- 문의/건의 on web + apps
  ('admins', '["simon@misaeng.com"]'::jsonb),
  ('inquiry.assignee', '"simon@misaeng.com"'::jsonb),
  ('reports.assignee', '"simon@misaeng.com"'::jsonb),
  ('escalation.final', '"simon@misaeng.com"'::jsonb),
  ('housing.hours', '{"start": 9, "end": 21, "days": [0,1,2,3,4,5,6]}'::jsonb),   -- New York time
  ('housing.escalate_minutes', '[60, 120]'::jsonb),
  ('email.delay_minutes', '5'::jsonb),
  ('rotation.cursor', '{"email": null}'::jsonb),                 -- Misaeng
  ('rotation.cursor.ellieo', '{"email": null}'::jsonb),
  ('testers', '[]'::jsonb)                                      -- account emails that see both features while they're off
on conflict (key) do nothing;

-- Databases created before in_rotation_ellieo existed.
alter table public.support_staff add column if not exists in_rotation_ellieo boolean not null default false;

-- Next housing lead for a brand: the first eligible staff after the last one who got that brand's lead, in rotation
-- order (wraps around). Misaeng keeps the old cursor key ('rotation.cursor'); Ellieo has its own.
-- Only new leads call this. Returning users, transfers, escalations and admin assignment never move the cursor.
-- Called without arguments (older servers) = Misaeng, same as before.
drop function if exists public.support_take_next_assignee();

create or replace function public.support_take_next_assignee(p_brand text default 'misaeng')
returns text
language plpgsql
as $$
declare
  ellieo boolean := lower(coalesce(p_brand, 'misaeng')) = 'ellieo';
  cursor_key text := case when ellieo then 'rotation.cursor.ellieo' else 'rotation.cursor' end;
  cur text;
  cur_order integer;
  nxt text;
begin
  perform pg_advisory_xact_lock(hashtext('support_rotation'));
  select value->>'email' into cur from public.support_settings where key = cursor_key;
  select rotation_order into cur_order from public.support_staff where email = cur;
  select s.email into nxt
    from public.support_staff s
   where s.active and s.accepting
     and (case when ellieo then s.in_rotation_ellieo else s.in_rotation end)
   order by
     case when cur_order is null
            or s.rotation_order > cur_order
            or (s.rotation_order = cur_order and s.email > cur) then 0 else 1 end,
     s.rotation_order, s.email
   limit 1;
  if nxt is not null then
    insert into public.support_settings (key, value, updated_at)
    values (cursor_key, jsonb_build_object('email', nxt), now())
    on conflict (key) do update set value = excluded.value, updated_at = now();
    update public.support_staff set last_assigned_at = now() where email = nxt;
  end if;
  return nxt;
end;
$$;

-- Adds a message and updates the conversation's counters in one statement.
create or replace function public.support_add_message(
  p_conversation uuid,
  p_sender_type text,
  p_sender_uid text,
  p_sender_email text,
  p_sender_display text,
  p_body text,
  p_redactions integer default 0
)
returns setof public.support_messages
language plpgsql
as $$
declare
  m public.support_messages;
begin
  insert into public.support_messages (conversation_id, sender_type, sender_uid, sender_email, sender_display, body, redactions)
  values (p_conversation, p_sender_type, p_sender_uid, p_sender_email, p_sender_display, p_body, coalesce(p_redactions, 0))
  returning * into m;

  update public.support_conversations c set
    last_message_at = m.created_at,
    last_message_preview = left(regexp_replace(p_body, '\s+', ' ', 'g'), 140),
    last_sender = p_sender_type,
    user_unread = case when p_sender_type = 'user' then 0 else c.user_unread + 1 end,
    staff_unread = case when p_sender_type = 'staff' then 0 else c.staff_unread + 1 end,
    user_last_read_at = case when p_sender_type = 'user' then m.created_at else c.user_last_read_at end,
    staff_last_read_at = case when p_sender_type = 'staff' then m.created_at else c.staff_last_read_at end,
    first_response_at = case when p_sender_type = 'staff' and c.first_response_at is null then m.created_at else c.first_response_at end,
    status = case
      when p_sender_type = 'user' then 'open'
      when p_sender_type = 'staff' then 'waiting_user'
      else c.status end,
    sla_started_at = case
      when p_sender_type = 'user' and (c.sla_started_at is null or c.last_sender is distinct from 'user') then m.created_at
      when p_sender_type = 'staff' then null
      else c.sla_started_at end,
    escalation_level = case when p_sender_type = 'staff' then 0 else c.escalation_level end,
    closed_at = case when p_sender_type = 'system' then c.closed_at else null end,
    closed_by = case when p_sender_type = 'system' then c.closed_by else null end,
    updated_at = now()
  where c.id = p_conversation;

  return next m;
end;
$$;

alter table public.support_staff enable row level security;
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_events enable row level security;
alter table public.support_settings enable row level security;
alter table public.support_housing_profiles enable row level security;
alter table public.support_user_state enable row level security;
alter table public.staff_push_devices enable row level security;
-- No policies: anon/authenticated cannot read or write. Only the service role (servers) can.

grant select, insert, update, delete on
  public.support_staff, public.support_conversations, public.support_messages, public.support_events,
  public.support_settings, public.support_housing_profiles, public.support_user_state, public.staff_push_devices
  to service_role;
grant usage, select on sequence public.support_events_id_seq to service_role;
grant execute on function public.support_take_next_assignee(text) to service_role;
grant execute on function public.support_add_message(uuid, text, text, text, text, text, integer) to service_role;
revoke execute on function public.support_take_next_assignee(text) from anon, authenticated, public;
revoke execute on function public.support_add_message(uuid, text, text, text, text, text, integer) from anon, authenticated, public;

notify pgrst, 'reload schema';

-- Every minute: escalations (1h → next staff, 2h → final) and delayed emails for unread staff replies.
-- Needs pg_cron + pg_net. Run once per project with that project's site URL and the same value as INTERNAL_PUSH_SECRET.
-- select vault.create_secret('<SAME VALUE AS INTERNAL_PUSH_SECRET>', 'support_tick_secret');
-- select cron.schedule('support-tick', '* * * * *', $job$
--   select net.http_post(
--     url := 'https://misaeng.com/api/internal/support/tick',
--     headers := jsonb_build_object('Content-Type', 'application/json',
--       'x-internal-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'support_tick_secret')),
--     body := '{"source":"pg_cron"}'::jsonb, timeout_milliseconds := 55000);
-- $job$);
-- Stop: select cron.unschedule('support-tick');
