-- Coffee chat v3 — the mentor proposes the times (misaeng-app only). Builds on supabase/coffee_chat_mentors.sql and
-- supabase/coffee_chat_linkedin.sql (run those first).
--   1. The requester sends topic + message + LinkedIn (no times). spend.coffee_chat (120P) is held.
--   2. The mentor sends 1–3 times that work for them (proposed_times, times_proposed_at) — or declines.
--   3. The requester picks one and pastes a Zoom / Google Meet link → scheduled, and the hold is CAPTURED right then
--      (Misaeng can't tell whether a call happened, so confirming is final). Once, the requester may ask for other
--      times instead (retime_count 0 → 1; the mentor's times are cleared).
--   4. After confirming, refunds only come from cancellations inside the app: the mentor cancels → refund; the
--      requester cancels 24 hours or more before the start → refund (misaeng-web writes the 'earn' row and
--      refunded_at; this function never releases a captured hold).
-- Deadlines (enforced lazily by misaeng-web): the mentor answers within 5 days of the request (or of the retime
-- request); the requester picks a time at least 3 hours ahead; when none is left the request is cancelled and
-- the hold released.
-- Rows of this flow have flow = 'mentor_times'; older rows (requester-proposed times, ERP v1) keep working as before.
--
-- HOW TO RUN: staging SQL Editor first, then production. Safe to re-run (add column if not exists,
-- create or replace with the same signature).

-- MARK: columns

alter table public.coffee_chat_requests add column if not exists flow text;
alter table public.coffee_chat_requests add column if not exists times_proposed_at timestamptz;
alter table public.coffee_chat_requests add column if not exists retime_count integer not null default 0;
alter table public.coffee_chat_requests add column if not exists retime_requested_at timestamptz;
alter table public.coffee_chat_requests add column if not exists refunded_at timestamptz;

do $$ begin
  alter table public.coffee_chat_requests add constraint coffee_chat_requests_flow_ok
    check (flow is null or flow = 'mentor_times');
exception when duplicate_object then null; end $$;

-- MARK: transitions (replaces the coffee_chat_mentors.sql version; same signature)
-- p_action: schedule | complete (capture) | cancel (release) | no_show (capture)
--   schedule, flow 'mentor_times': by the requester ('user') or 'admin'. Status 'requested', p_scheduled_at one of the
--     mentor's proposed_times and in the future, p_zoom_link required → accepted_at, and the hold is captured.
--   schedule by 'mentor' on older rows (requester-proposed times): unchanged.
--   cancel, flow 'mentor_times' + scheduled: either side, any time; the hold is already captured, so nothing is
--     released here (misaeng-web refunds when the rules say so).
--   cancel on older rows: unchanged (the requester only more than 6 hours before the start).

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
  v_v3 boolean;
begin
  select * into v_req from public.coffee_chat_requests where id = p_request_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  perform public.point_lock_user(v_req.user_id);
  select * into v_req from public.coffee_chat_requests where id = p_request_id for update;
  v_v3 := v_req.flow = 'mentor_times';

  if p_action = 'schedule' then
    if v_v3 then
      if p_actor_role not in ('user', 'admin') then
        return jsonb_build_object('ok', false, 'error', 'invalid_transition', 'status', v_req.status);
      end if;
      if v_req.status <> 'requested' or v_req.proposed_times is null then
        return jsonb_build_object('ok', false, 'error', 'invalid_transition', 'status', v_req.status);
      end if;
      if p_scheduled_at is null or not (p_scheduled_at = any (v_req.proposed_times)) or p_scheduled_at <= now() then
        return jsonb_build_object('ok', false, 'error', 'invalid_time', 'status', v_req.status);
      end if;
      if p_zoom_link is null or btrim(p_zoom_link) = '' then
        return jsonb_build_object('ok', false, 'error', 'zoom_link_required', 'status', v_req.status);
      end if;
      v_accept := true;
      -- confirming is final: the points are spent now
      if v_req.hold_id is not null then
        v_result := public.capture_hold(v_req.hold_id, 'coffee_chat', p_actor, 'confirmed');
      end if;
    elsif p_actor_role = 'mentor' and v_req.proposed_times is not null then
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
    -- v3 holds were captured on confirm (capture_hold answers 'duplicate' then)
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
    -- older rows: the requester may cancel a scheduled v2 chat only up to 6 hours before the start
    if not v_v3 and p_actor_role = 'user' and v_req.status = 'scheduled' then
      if v_req.accepted_at is null then
        return jsonb_build_object('ok', false, 'error', 'invalid_transition', 'status', v_req.status);
      end if;
      if v_req.scheduled_at is not null and v_req.scheduled_at <= now() + interval '6 hours' then
        return jsonb_build_object('ok', false, 'error', 'too_late', 'status', v_req.status);
      end if;
    end if;
    v_decline := p_actor_role = 'mentor' and v_req.status = 'requested';
    v_next := 'cancelled';
    -- a v3 chat that is scheduled has its hold captured already: nothing to release
    if v_req.hold_id is not null and not (v_v3 and v_req.status = 'scheduled') then
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

revoke all on function public.transition_coffee_chat(uuid, text, text, text, text, timestamptz, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.transition_coffee_chat(uuid, text, text, text, text, timestamptz, text, text, text, text)
  to service_role;

-- the rule text in ERP / history: captured on confirm now
update public.point_rules
  set description = 'Held on request, captured when the requester confirms a time (mentor-proposed), refunded on cancellation by the mentor or by the requester 24h+ before'
  where key = 'spend.coffee_chat';

notify pgrst, 'reload schema';
