-- Coffee chat v2 — peer mentors (misaeng-app only). Builds on supabase/points.sql (run that first).
--   * Mentors: users with an APPROVED 'offer' review verification (verification_submissions) who agreed to the
--     mentor consent. No reward. Mentors pick one of the requester's proposed times and paste their own Zoom link.
--   * Requester pays spend.coffee_chat (120P): held on request, captured on completion, released on
--     cancel / decline / expiry. p_amount = 0 still means "free" (no hold) as a fallback.
--   * Written only by misaeng-web with the service role key (RLS on, no policies).
--
-- HOW TO RUN: staging SQL Editor first, then production. Safe to re-run: create ... if not exists,
-- add column if not exists, create or replace; existing rows are kept. Functions whose signature changed are
-- dropped first (old signature) and recreated; every new parameter has a default, so the old named-argument calls
-- from /api/points/coffee-chats and the ERP keep working.

-- MARK: mentors

create table if not exists public.coffee_chat_mentors (
  user_id text primary key,
  submission_id uuid not null,              -- the approved 'offer' verification (verification_submissions.id)
  company text not null,                    -- verification result_label at the time of sign-up
  role text not null default '',
  intro text not null default '' check (char_length(intro) <= 500),
  topics text[] not null default '{}'::text[] check (coalesce(array_length(topics, 1), 0) <= 5),
  active boolean not null default true,
  consent_version text not null,
  agreed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists coffee_chat_mentors_active_idx on public.coffee_chat_mentors (active, created_at desc);

-- each topic <= 30 characters (array elements cannot be checked in a plain check with a subquery)
create or replace function public.coffee_chat_topics_ok(p_topics text[]) returns boolean
language sql immutable as $$
  select coalesce(bool_and(char_length(t) between 1 and 30), true) from unnest(p_topics) as t;
$$;

do $$ begin
  alter table public.coffee_chat_mentors
    add constraint coffee_chat_mentors_topics_len check (public.coffee_chat_topics_ok(topics));
exception when duplicate_object then null; end $$;

-- MARK: requests (v2 columns)

alter table public.coffee_chat_requests add column if not exists proposed_times timestamptz[];
alter table public.coffee_chat_requests add column if not exists zoom_link text;
alter table public.coffee_chat_requests add column if not exists accepted_at timestamptz;
alter table public.coffee_chat_requests add column if not exists declined_at timestamptz;
alter table public.coffee_chat_requests add column if not exists decline_reason text;
alter table public.coffee_chat_requests add column if not exists reported_at timestamptz;
alter table public.coffee_chat_requests add column if not exists report_reason text;

do $$ begin
  alter table public.coffee_chat_requests add constraint coffee_chat_requests_proposed_times_len
    check (proposed_times is null or coalesce(array_length(proposed_times, 1), 0) between 1 and 3);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.coffee_chat_requests add constraint coffee_chat_requests_decline_reason_len
    check (decline_reason is null or char_length(decline_reason) <= 200);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.coffee_chat_requests add constraint coffee_chat_requests_zoom_link_len
    check (zoom_link is null or char_length(zoom_link) <= 300);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.coffee_chat_requests add constraint coffee_chat_requests_report_reason_len
    check (report_reason is null or char_length(report_reason) <= 1000);
exception when duplicate_object then null; end $$;

create index if not exists coffee_chat_requests_mentor_idx
  on public.coffee_chat_requests (mentor_id, created_at desc) where mentor_id is not null;

-- An open request still counts while at least one proposed time is in the future (v1 rows have no times).
create or replace function public.coffee_chat_is_live(p_status text, p_times timestamptz[]) returns boolean
language sql stable as $$
  select p_status = 'requested'
    and (p_times is null or exists (select 1 from unnest(p_times) as t where t > now()));
$$;

-- MARK: request (replaces the points.sql version)
-- p_amount = 0 → free (no hold). p_amount null / < 0 → 'disabled'.
-- With a mentor: at most 5 live open requests per mentor ('mentor_busy'), one live open request per
-- requester + mentor ('duplicate_open').

drop function if exists public.request_coffee_chat(text, integer, integer, text, text, text, text, text, text);
create or replace function public.request_coffee_chat(
  p_user_id text,
  p_amount integer,
  p_monthly_cap integer,
  p_topic text,
  p_message text,
  p_preferred_times text,
  p_mentor_id text,
  p_disclaimer_version text,
  p_idempotency_key text,
  p_proposed_times timestamptz[] default null
) returns jsonb
language plpgsql as $$
declare
  v_existing public.coffee_chat_requests%rowtype;
  v_count integer;
  v_request uuid := gen_random_uuid();
  v_hold uuid;
begin
  if p_amount is null or p_amount < 0 then
    return jsonb_build_object('ok', false, 'error', 'disabled');
  end if;
  if p_proposed_times is not null and coalesce(array_length(p_proposed_times, 1), 0) not between 1 and 3 then
    return jsonb_build_object('ok', false, 'error', 'invalid_times');
  end if;
  perform public.point_lock_user(p_user_id);
  if p_mentor_id is not null then
    -- serializes requests to the same mentor (mentor_busy count)
    perform pg_advisory_xact_lock(hashtext('coffee_mentor:' || p_mentor_id));
  end if;

  select * into v_existing from public.coffee_chat_requests where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'request_id', v_existing.id, 'hold_id', v_existing.hold_id)
      || public.point_state(p_user_id);
  end if;

  if p_mentor_id is not null then
    if exists (
      select 1 from public.coffee_chat_requests
      where user_id = p_user_id and mentor_id = p_mentor_id and public.coffee_chat_is_live(status, proposed_times)
    ) then
      return jsonb_build_object('ok', false, 'error', 'duplicate_open');
    end if;
    select count(*)::integer into v_count
      from public.coffee_chat_requests
      where mentor_id = p_mentor_id and public.coffee_chat_is_live(status, proposed_times);
    if v_count >= 5 then
      return jsonb_build_object('ok', false, 'error', 'mentor_busy');
    end if;
  end if;

  if p_monthly_cap is not null then
    select count(*)::integer into v_count
      from public.coffee_chat_requests
      where user_id = p_user_id and status <> 'cancelled' and created_at >= public.point_window_start('month');
    if v_count >= p_monthly_cap then
      return jsonb_build_object('ok', false, 'error', 'monthly_cap', 'cap', p_monthly_cap) || public.point_state(p_user_id);
    end if;
  end if;

  if p_amount > 0 then
    if public.point_balance_of(p_user_id) - public.point_held_of(p_user_id) < p_amount then
      return jsonb_build_object('ok', false, 'error', 'insufficient', 'required', p_amount) || public.point_state(p_user_id);
    end if;
    insert into public.point_holds (user_id, amount, source_type, source_id, idempotency_key)
    values (p_user_id, p_amount, 'coffee_chat', v_request::text, 'hold:coffee_chat:' || v_request::text)
    returning id into v_hold;
  end if;

  insert into public.coffee_chat_requests
    (id, user_id, mentor_id, topic, message, preferred_times, proposed_times, amount, hold_id, idempotency_key,
     disclaimer_version, agreed_at)
  values
    (v_request, p_user_id, p_mentor_id, p_topic, p_message, p_preferred_times, p_proposed_times, p_amount, v_hold,
     p_idempotency_key, p_disclaimer_version, now());
  return jsonb_build_object('ok', true, 'request_id', v_request, 'hold_id', v_hold) || public.point_state(p_user_id);
end $$;

-- MARK: transitions (replaces the points.sql version)
-- p_action: schedule | complete (capture) | cancel (release) | no_show (capture)
--   schedule by 'mentor' (v2 accept): status must be 'requested', p_scheduled_at one of proposed_times and in the
--     future, p_zoom_link required → accepted_at. ERP ('admin') scheduling is unchanged.
--   cancel by 'mentor' while 'requested' = decline (declined_at, p_decline_reason). Mentor may cancel a scheduled
--     chat any time; the requester may cancel a scheduled chat only more than 6 hours before scheduled_at.

drop function if exists public.transition_coffee_chat(uuid, text, text, text, text, timestamptz, text, text);
create or replace function public.transition_coffee_chat(
  p_request_id uuid,
  p_action text,
  p_actor text,
  p_actor_role text default 'admin',       -- 'user' | 'mentor' | 'admin'
  p_mentor_id text default null,
  p_scheduled_at timestamptz default null,
  p_mentor_note text default null,
  p_admin_note text default null,
  p_zoom_link text default null,
  p_decline_reason text default null
) returns jsonb
language plpgsql as $$
declare
  v_req public.coffee_chat_requests%rowtype;
  v_result jsonb := '{}'::jsonb;
  v_next text;
  v_accept boolean := false;
  v_decline boolean := false;
begin
  select * into v_req from public.coffee_chat_requests where id = p_request_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  perform public.point_lock_user(v_req.user_id);
  select * into v_req from public.coffee_chat_requests where id = p_request_id for update;

  if p_action = 'schedule' then
    if p_actor_role = 'mentor' and v_req.proposed_times is not null then
      if v_req.status <> 'requested' then
        return jsonb_build_object('ok', false, 'error', 'invalid_transition', 'status', v_req.status);
      end if;
      if p_scheduled_at is null or not (p_scheduled_at = any (v_req.proposed_times)) or p_scheduled_at <= now() then
        return jsonb_build_object('ok', false, 'error', 'invalid_time', 'status', v_req.status);
      end if;
      if p_zoom_link is null or btrim(p_zoom_link) = '' then
        return jsonb_build_object('ok', false, 'error', 'zoom_link_required', 'status', v_req.status);
      end if;
      v_accept := true;
    elsif v_req.status not in ('requested', 'scheduled') then
      return jsonb_build_object('ok', false, 'error', 'invalid_transition', 'status', v_req.status);
    end if;
    v_next := 'scheduled';
  elsif p_action = 'complete' then
    if v_req.status = 'completed' then
      return jsonb_build_object('ok', true, 'duplicate', true, 'status', v_req.status, 'user_id', v_req.user_id);
    end if;
    if v_req.status not in ('requested', 'scheduled') then
      return jsonb_build_object('ok', false, 'error', 'invalid_transition', 'status', v_req.status);
    end if;
    v_next := 'completed';
    if v_req.hold_id is not null then
      v_result := public.capture_hold(v_req.hold_id, 'coffee_chat', p_actor, 'completed');
    end if;
  elsif p_action = 'no_show' then
    if v_req.status = 'no_show' then
      return jsonb_build_object('ok', true, 'duplicate', true, 'status', v_req.status, 'user_id', v_req.user_id);
    end if;
    if v_req.status not in ('requested', 'scheduled') then
      return jsonb_build_object('ok', false, 'error', 'invalid_transition', 'status', v_req.status);
    end if;
    v_next := 'no_show';
    if v_req.hold_id is not null then
      v_result := public.capture_hold(v_req.hold_id, 'coffee_chat_no_show', p_actor, 'no_show');
    end if;
  elsif p_action = 'cancel' then
    if v_req.status = 'cancelled' then
      return jsonb_build_object('ok', true, 'duplicate', true, 'status', v_req.status, 'user_id', v_req.user_id);
    end if;
    if v_req.status not in ('requested', 'scheduled') then
      return jsonb_build_object('ok', false, 'error', 'invalid_transition', 'status', v_req.status);
    end if;
    -- the requester: v1 (ERP-scheduled) chats only before scheduling; v2 chats up to 6 hours before the start
    if p_actor_role = 'user' and v_req.status = 'scheduled' then
      if v_req.accepted_at is null then
        return jsonb_build_object('ok', false, 'error', 'invalid_transition', 'status', v_req.status);
      end if;
      if v_req.scheduled_at is not null and v_req.scheduled_at <= now() + interval '6 hours' then
        return jsonb_build_object('ok', false, 'error', 'too_late', 'status', v_req.status);
      end if;
    end if;
    v_decline := p_actor_role = 'mentor' and v_req.status = 'requested';
    v_next := 'cancelled';
    if v_req.hold_id is not null then
      v_result := public.release_hold(
        v_req.hold_id, p_actor,
        case when v_decline then 'declined by mentor' else 'cancelled by ' || coalesce(p_actor_role, 'admin') end
      );
    end if;
  else
    return jsonb_build_object('ok', false, 'error', 'invalid_action');
  end if;

  if v_result ? 'ok' and not (v_result->>'ok')::boolean then
    return v_result;
  end if;

  update public.coffee_chat_requests set
    status = v_next,
    mentor_id = coalesce(p_mentor_id, mentor_id),
    scheduled_at = case when p_action = 'schedule' then coalesce(p_scheduled_at, scheduled_at) else scheduled_at end,
    zoom_link = case when v_accept then btrim(p_zoom_link) else zoom_link end,
    accepted_at = case when v_accept then now() else accepted_at end,
    declined_at = case when v_decline then now() else declined_at end,
    decline_reason = case when v_decline then nullif(btrim(coalesce(p_decline_reason, '')), '') else decline_reason end,
    mentor_note = coalesce(p_mentor_note, mentor_note),
    admin_note = coalesce(p_admin_note, admin_note),
    cancelled_by = case when v_next = 'cancelled' then coalesce(p_actor_role, 'admin') else cancelled_by end,
    decided_by = coalesce(p_actor, decided_by),
    completed_at = case when v_next in ('completed', 'no_show') then now() else completed_at end,
    updated_at = now()
  where id = p_request_id;

  return jsonb_build_object('ok', true, 'status', v_next, 'user_id', v_req.user_id, 'mentor_id', v_req.mentor_id)
    || (v_result - 'ok');
end $$;

-- MARK: access. Service role only.

alter table public.coffee_chat_mentors enable row level security;
revoke all on public.coffee_chat_mentors from anon, authenticated;
grant select, insert, update, delete on public.coffee_chat_mentors to service_role;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.coffee_chat_topics_ok(text[])',
    'public.coffee_chat_is_live(text, timestamptz[])',
    'public.request_coffee_chat(text, integer, integer, text, text, text, text, text, text, timestamptz[])',
    'public.transition_coffee_chat(uuid, text, text, text, text, timestamptz, text, text, text, text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;

-- MARK: seeds

-- Requesters pay 120P per coffee chat (product decision 2026-10-27): this one rule is set even if it exists.
insert into public.point_rules (key, value, enabled, description) values
  ('spend.coffee_chat', 120, true, 'Held on request, captured on completion / no-show, released on cancel / decline / expiry')
on conflict (key) do update set value = 120, enabled = true, updated_at = now();

-- The whole feature stays off until the team turns it on (existing value is never overwritten).
insert into public.point_settings (key, value) values
  ('coffee_chat.enabled', 'false'::jsonb)
on conflict (key) do nothing;

notify pgrst, 'reload schema';
