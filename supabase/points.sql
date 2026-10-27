-- Misaeng Points (미생 포인트): rules, append-only ledger, review claims, unlocks, check-ins, holds,
-- coffee chats, housing boosts and identity bindings. Spec: misaeng_points_spec.md (ch. 2-4), adapted:
--   * users are Ellieo backend accounts: every user / actor id is text, no FK to auth.users
--   * post / comment / source ids are text (posts are Storage JSON)
--   * written only by misaeng-web (and ellieo-erp) with the service role key through PostgREST.
--     RLS is enabled with no policies; anon/authenticated get nothing.
--   * spending goes through the functions below (per-user advisory lock + idempotency key)
--
-- HOW TO RUN: run once in the STAGING project's SQL Editor first, check it, then in PRODUCTION.
-- Safe to re-run (create ... if not exists, create or replace, seeds use on conflict do nothing).
-- Nothing changes for users until `points.cutover_at` (point_settings) is set and reached: before that
-- misaeng-web keeps using the legacy credit JSON (src/lib/community/creditLedger.ts).

create extension if not exists pgcrypto;

-- MARK: types

do $$ begin
  create type public.point_entry_type as enum ('earn', 'spend', 'hold', 'release', 'clawback', 'adjust');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.point_claim_status as enum ('pending', 'approved', 'rejected', 'expired');
exception when duplicate_object then null; end $$;

-- MARK: settings (2.1)

-- Integer rules ('earn.interview.base', 'cap.comment_daily', ...). Missing rows fall back to the defaults
-- in src/lib/points/defaults.ts. enabled=false: earn/spend → feature off, cap → no cap, rule → check skipped.
create table if not exists public.point_rules (
  key text primary key,
  value integer not null,
  enabled boolean not null default true,
  description text,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- JSON settings ('paywall.enabled', 'paywall.start_date', 'points.cutover_at', ...)
create table if not exists public.point_settings (
  key text primary key,
  value jsonb,                             -- SQL null or JSON null = "not set" (e.g. points.cutover_at)
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Every change made through /api/internal/points/rules|settings (ERP)
create table if not exists public.point_rules_history (
  id uuid primary key default gen_random_uuid(),
  target text not null default 'rule' check (target in ('rule', 'setting')),
  key text not null,
  before jsonb,
  after jsonb,
  changed_by text,
  changed_at timestamptz not null default now(),
  note text
);
create index if not exists point_rules_history_key_idx on public.point_rules_history (key, changed_at desc);

-- MARK: ledger (2.2) — append-only. Corrections are new 'adjust' / 'clawback' rows.

create table if not exists public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  entry_type public.point_entry_type not null,
  amount integer not null,                 -- earn +, spend/clawback -, adjust ±
  reason text not null,                    -- 'review.base', 'comment', 'review_unlock', 'coffee_chat', 'legacy_opening', ...
  source_type text,                        -- 'post', 'comment', 'verification', 'coffee_chat', 'unlock', 'checkin', 'referral', 'legacy'
  source_id text,
  idempotency_key text not null unique,    -- 'earn:post:{postId}:base', 'unlock:{uid}:{postId}', 'legacy:opening:{uid}'
  created_at timestamptz not null default now(),
  created_by text,                         -- null = system, otherwise the ERP admin
  note text,
  constraint point_ledger_sign check (
    (entry_type = 'earn' and amount >= 0)
    or (entry_type in ('spend', 'clawback') and amount <= 0)
    or entry_type in ('adjust', 'hold', 'release')
  )
);
create index if not exists point_ledger_user_idx on public.point_ledger (user_id, created_at desc, id desc);
create index if not exists point_ledger_source_idx on public.point_ledger (source_type, source_id);
create index if not exists point_ledger_user_reason_idx on public.point_ledger (user_id, reason, created_at);

create or replace function public.point_ledger_no_update() returns trigger
language plpgsql as $$
begin
  raise exception 'point_ledger is append-only (add an adjust or clawback row instead)';
end $$;

drop trigger if exists point_ledger_no_update on public.point_ledger;
create trigger point_ledger_no_update before update on public.point_ledger
  for each row execute function public.point_ledger_no_update();
-- DELETE stays possible only for permanent account deletion (spec 10.4).

create or replace view public.point_balances as
  select user_id, coalesce(sum(amount), 0)::integer as balance
  from public.point_ledger
  group by user_id;

-- MARK: holds (2.5) — reserved points (coffee chats). Captured → a 'spend' ledger row.

create table if not exists public.point_holds (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  amount integer not null check (amount > 0),
  source_type text not null,
  source_id text not null,
  status text not null default 'held' check (status in ('held', 'captured', 'released')),
  idempotency_key text not null unique,
  ledger_id uuid references public.point_ledger(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text,
  note text
);
create index if not exists point_holds_user_held_idx on public.point_holds (user_id) where status = 'held';
create index if not exists point_holds_source_idx on public.point_holds (source_type, source_id);

-- MARK: review claims (2.3) — posts earn after ERP review. No AI prescreen (out of scope).

create table if not exists public.point_claims (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  post_id text not null unique,            -- one claim per post
  board text not null check (board in ('interview', 'visa', 'food')),
  requested jsonb not null,                -- proposed amounts {"base":20,"detail":15,"first_company":30}
  components jsonb not null default '{}'::jsonb,  -- awarded amounts so far {"base":20,"detail":15,"verified":15,"pick":20}
  checks jsonb not null default '{}'::jsonb,      -- why detail/first_company were (not) proposed, similarity score
  status public.point_claim_status not null default 'pending',
  hold_reason text,                        -- 'similar' = text similar to an existing post (kept for human review)
  dedupe_key text,                         -- interview:{uid}:{company}:{role}:{cycle} / visa:{uid}:{visaType}:{cycle}
  cycle text,                              -- '2026-fall'
  reviewed_by text,
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists point_claims_dedupe_idx on public.point_claims (dedupe_key)
  where dedupe_key is not null and status in ('pending', 'approved');
create index if not exists point_claims_user_idx on public.point_claims (user_id, board, created_at desc);
create index if not exists point_claims_queue_idx on public.point_claims (status, created_at);

-- MARK: unlocks (2.4) — one row per (user, post). Original and translations share the post id.

create table if not exists public.content_unlocks (
  user_id text not null,
  post_id text not null,
  method text not null check (method in ('free_quota', 'points', 'subscription', 'free_period')),
  ledger_id uuid references public.point_ledger(id),
  free_period_at timestamptz,              -- first opened during the free access period
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists content_unlocks_method_idx on public.content_unlocks (user_id, method);

-- MARK: check-ins (2.5) — America/New_York days

create table if not exists public.daily_checkins (
  user_id text not null,
  checkin_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, checkin_date)
);

-- MARK: coffee chats (4.4)

create table if not exists public.coffee_chat_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,                   -- requester
  mentor_id text,                          -- assigned by ERP (or chosen by the requester)
  topic text not null,
  message text,
  preferred_times text,
  status text not null default 'requested'
    check (status in ('requested', 'scheduled', 'completed', 'cancelled', 'no_show')),
  amount integer not null,
  hold_id uuid references public.point_holds(id),
  idempotency_key text not null unique,
  disclaimer_version text not null,
  agreed_at timestamptz not null,
  scheduled_at timestamptz,
  mentor_note text,
  admin_note text,
  cancelled_by text check (cancelled_by in ('user', 'mentor', 'admin')),
  decided_by text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists coffee_chat_requests_user_idx on public.coffee_chat_requests (user_id, created_at desc);
create index if not exists coffee_chat_requests_status_idx on public.coffee_chat_requests (status, created_at);

-- MARK: housing boosts (4.1) — roommate/sublet posts pinned to the top until boosted_until

create table if not exists public.point_post_boosts (
  id uuid primary key default gen_random_uuid(),
  post_id text not null,
  user_id text not null,
  board text not null,
  city text,
  boosted_until timestamptz not null,
  ledger_id uuid references public.point_ledger(id),
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists point_post_boosts_post_idx on public.point_post_boosts (post_id, boosted_until desc);
-- added 2026-10-26 (slots per board + city); harmless when the column already exists
alter table public.point_post_boosts add column if not exists city text;
create index if not exists point_post_boosts_active_idx on public.point_post_boosts (board, boosted_until desc);
create index if not exists point_post_boosts_user_idx on public.point_post_boosts (user_id, created_at desc);

-- MARK: identities — normalized emails / handles bound to one account (welcome & free-quota farming)
-- kind: 'signup_email' | 'school_email' | 'work_email' | 'instagram'. Gmail: dots and +tags removed.

create table if not exists public.point_identities (
  kind text not null,
  identifier_normalized text not null,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (kind, identifier_normalized)
);
create index if not exists point_identities_user_idx on public.point_identities (user_id);

-- MARK: functions. All take a per-user transaction lock so concurrent requests can't overspend.

create or replace function public.point_lock_user(p_user_id text) returns void
language sql as $$
  select pg_advisory_xact_lock(hashtext('points:' || p_user_id));
$$;

create or replace function public.point_balance_of(p_user_id text) returns integer
language sql stable as $$
  select coalesce(sum(amount), 0)::integer from public.point_ledger where user_id = p_user_id;
$$;

create or replace function public.point_held_of(p_user_id text) returns integer
language sql stable as $$
  select coalesce(sum(amount), 0)::integer from public.point_holds where user_id = p_user_id and status = 'held';
$$;

-- Start of the current month / day in America/New_York, as timestamptz
create or replace function public.point_window_start(p_window text) returns timestamptz
language sql stable as $$
  select (date_trunc(case when p_window = 'day' then 'day' else 'month' end,
                     now() at time zone 'America/New_York')) at time zone 'America/New_York';
$$;

create or replace function public.point_state(p_user_id text) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'balance', public.point_balance_of(p_user_id),
    'held', public.point_held_of(p_user_id),
    'available', public.point_balance_of(p_user_id) - public.point_held_of(p_user_id)
  );
$$;

-- Earn with an optional cap over a NY day/month window (p_cap_mode 'sum' of amounts or 'count' of rows,
-- over rows whose reason is in p_cap_reasons). Grants min(amount, remaining) for 'sum'.
-- Returns {ok, duplicate?, ledger_id, amount, balance, available} or {ok:false, error:'cap'}.
create or replace function public.earn_points(
  p_user_id text,
  p_amount integer,
  p_reason text,
  p_source_type text,
  p_source_id text,
  p_idempotency_key text,
  p_cap_reasons text[] default null,
  p_cap_window text default null,
  p_cap_mode text default 'sum',
  p_cap_limit integer default null,
  p_created_by text default null,
  p_note text default null
) returns jsonb
language plpgsql as $$
declare
  v_existing public.point_ledger%rowtype;
  v_used integer;
  v_grant integer := p_amount;
  v_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_amount');
  end if;
  perform public.point_lock_user(p_user_id);

  select * into v_existing from public.point_ledger where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'ledger_id', v_existing.id, 'amount', v_existing.amount)
      || public.point_state(p_user_id);
  end if;

  if p_cap_limit is not null and p_cap_reasons is not null then
    select case when p_cap_mode = 'count' then count(*)::integer else coalesce(sum(amount), 0)::integer end
      into v_used
      from public.point_ledger
      where user_id = p_user_id
        and entry_type = 'earn'
        and reason = any (p_cap_reasons)
        and created_at >= public.point_window_start(coalesce(p_cap_window, 'month'));
    if p_cap_mode = 'count' then
      if v_used >= p_cap_limit then
        return jsonb_build_object('ok', false, 'error', 'cap') || public.point_state(p_user_id);
      end if;
    else
      v_grant := least(p_amount, p_cap_limit - v_used);
      if v_grant <= 0 then
        return jsonb_build_object('ok', false, 'error', 'cap') || public.point_state(p_user_id);
      end if;
    end if;
  end if;

  insert into public.point_ledger (user_id, entry_type, amount, reason, source_type, source_id, idempotency_key, created_by, note)
  values (p_user_id, 'earn', v_grant, p_reason, p_source_type, p_source_id, p_idempotency_key, p_created_by, p_note)
  on conflict (idempotency_key) do nothing
  returning id into v_id;

  if v_id is null then
    select * into v_existing from public.point_ledger where idempotency_key = p_idempotency_key;
    return jsonb_build_object('ok', true, 'duplicate', true, 'ledger_id', v_existing.id, 'amount', v_existing.amount)
      || public.point_state(p_user_id);
  end if;
  return jsonb_build_object('ok', true, 'ledger_id', v_id, 'amount', v_grant) || public.point_state(p_user_id);
end $$;

-- Spend: rejects when available (balance - holds) < amount, or when p_monthly_cap would be exceeded.
-- Returns {ok, duplicate?, ledger_id, balance, available} or {ok:false, error:'insufficient'|'monthly_cap'}.
create or replace function public.spend_points(
  p_user_id text,
  p_amount integer,
  p_reason text,
  p_source_type text,
  p_source_id text,
  p_idempotency_key text,
  p_monthly_cap integer default null,
  p_created_by text default null,
  p_note text default null
) returns jsonb
language plpgsql as $$
declare
  v_existing public.point_ledger%rowtype;
  v_available integer;
  v_spent integer;
  v_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_amount');
  end if;
  perform public.point_lock_user(p_user_id);

  select * into v_existing from public.point_ledger where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'ledger_id', v_existing.id) || public.point_state(p_user_id);
  end if;

  v_available := public.point_balance_of(p_user_id) - public.point_held_of(p_user_id);
  if v_available < p_amount then
    return jsonb_build_object('ok', false, 'error', 'insufficient', 'required', p_amount) || public.point_state(p_user_id);
  end if;

  if p_monthly_cap is not null then
    select coalesce(-sum(amount), 0)::integer into v_spent
      from public.point_ledger
      where user_id = p_user_id and entry_type = 'spend' and created_at >= public.point_window_start('month');
    if v_spent + p_amount > p_monthly_cap then
      return jsonb_build_object('ok', false, 'error', 'monthly_cap', 'spent', v_spent, 'cap', p_monthly_cap)
        || public.point_state(p_user_id);
    end if;
  end if;

  insert into public.point_ledger (user_id, entry_type, amount, reason, source_type, source_id, idempotency_key, created_by, note)
  values (p_user_id, 'spend', -p_amount, p_reason, p_source_type, p_source_id, p_idempotency_key, p_created_by, p_note)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'ledger_id', v_id) || public.point_state(p_user_id);
end $$;

-- Reserve points. Returns {ok, duplicate?, hold_id, balance, available} or {ok:false, error:'insufficient'}.
create or replace function public.hold_points(
  p_user_id text,
  p_amount integer,
  p_source_type text,
  p_source_id text,
  p_idempotency_key text,
  p_created_by text default null,
  p_note text default null
) returns jsonb
language plpgsql as $$
declare
  v_existing public.point_holds%rowtype;
  v_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_amount');
  end if;
  perform public.point_lock_user(p_user_id);

  select * into v_existing from public.point_holds where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'hold_id', v_existing.id, 'status', v_existing.status)
      || public.point_state(p_user_id);
  end if;

  if public.point_balance_of(p_user_id) - public.point_held_of(p_user_id) < p_amount then
    return jsonb_build_object('ok', false, 'error', 'insufficient', 'required', p_amount) || public.point_state(p_user_id);
  end if;

  insert into public.point_holds (user_id, amount, source_type, source_id, idempotency_key, note)
  values (p_user_id, p_amount, p_source_type, p_source_id, p_idempotency_key, p_note)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'hold_id', v_id, 'status', 'held') || public.point_state(p_user_id);
end $$;

-- Held → captured: adds the 'spend' ledger row ('capture:{holdId}'). Idempotent.
create or replace function public.capture_hold(
  p_hold_id uuid,
  p_reason text,
  p_created_by text default null,
  p_note text default null
) returns jsonb
language plpgsql as $$
declare
  v_user text;
  v_hold public.point_holds%rowtype;
  v_id uuid;
begin
  select user_id into v_user from public.point_holds where id = p_hold_id;
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  perform public.point_lock_user(v_user);

  select * into v_hold from public.point_holds where id = p_hold_id for update;
  if v_hold.status = 'captured' then
    return jsonb_build_object('ok', true, 'duplicate', true, 'ledger_id', v_hold.ledger_id, 'amount', v_hold.amount)
      || public.point_state(v_user);
  end if;
  if v_hold.status <> 'held' then
    return jsonb_build_object('ok', false, 'error', 'not_held', 'status', v_hold.status);
  end if;

  insert into public.point_ledger (user_id, entry_type, amount, reason, source_type, source_id, idempotency_key, created_by, note)
  values (v_user, 'spend', -v_hold.amount, p_reason, v_hold.source_type, v_hold.source_id, 'capture:' || p_hold_id::text, p_created_by, p_note)
  on conflict (idempotency_key) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.point_ledger where idempotency_key = 'capture:' || p_hold_id::text;
  end if;

  update public.point_holds
    set status = 'captured', ledger_id = v_id, resolved_at = now(), resolved_by = p_created_by
    where id = p_hold_id;
  return jsonb_build_object('ok', true, 'ledger_id', v_id, 'amount', v_hold.amount) || public.point_state(v_user);
end $$;

-- Held → released (nothing charged). Idempotent.
create or replace function public.release_hold(
  p_hold_id uuid,
  p_created_by text default null,
  p_note text default null
) returns jsonb
language plpgsql as $$
declare
  v_user text;
  v_hold public.point_holds%rowtype;
begin
  select user_id into v_user from public.point_holds where id = p_hold_id;
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  perform public.point_lock_user(v_user);

  select * into v_hold from public.point_holds where id = p_hold_id for update;
  if v_hold.status = 'released' then
    return jsonb_build_object('ok', true, 'duplicate', true) || public.point_state(v_user);
  end if;
  if v_hold.status <> 'held' then
    return jsonb_build_object('ok', false, 'error', 'not_held', 'status', v_hold.status);
  end if;

  update public.point_holds
    set status = 'released', resolved_at = now(), resolved_by = p_created_by, note = coalesce(p_note, note)
    where id = p_hold_id;
  return jsonb_build_object('ok', true) || public.point_state(v_user);
end $$;

-- Open a locked review (spec 2.4 / 4.1 / 4.3). Order: already unlocked → free period → lifetime free quota → points.
-- Decision 2026-10-26: an existing unlock of ANY method (incl. 'free_period') keeps the post open for good, also
-- after the paywall starts — no charge, no quota use.
-- Returns {ok, unlocked, method, charged, already?} + state, or {ok:false, error:'insufficient', required}.
create or replace function public.unlock_post(
  p_user_id text,
  p_post_id text,
  p_paywall_enabled boolean,
  p_cost integer,
  p_free_quota integer,
  p_free_quota_allowed boolean default true
) returns jsonb
language plpgsql as $$
declare
  v_existing public.content_unlocks%rowtype;
  v_free_used integer;
  v_id uuid;
  v_key text := 'unlock:' || p_user_id || ':' || p_post_id;
begin
  perform public.point_lock_user(p_user_id);

  select * into v_existing from public.content_unlocks where user_id = p_user_id and post_id = p_post_id;
  if found then
    return jsonb_build_object('ok', true, 'unlocked', true, 'already', true, 'method', v_existing.method, 'charged', 0)
      || public.point_state(p_user_id);
  end if;

  if not p_paywall_enabled then
    insert into public.content_unlocks (user_id, post_id, method, free_period_at)
    values (p_user_id, p_post_id, 'free_period', now())
    on conflict (user_id, post_id) do nothing;
    return jsonb_build_object('ok', true, 'unlocked', true, 'method', 'free_period', 'charged', 0)
      || public.point_state(p_user_id);
  end if;

  if p_free_quota_allowed and coalesce(p_free_quota, 0) > 0 then
    select count(*)::integer into v_free_used
      from public.content_unlocks where user_id = p_user_id and method = 'free_quota';
    if v_free_used < p_free_quota then
      insert into public.content_unlocks (user_id, post_id, method)
      values (p_user_id, p_post_id, 'free_quota')
      on conflict (user_id, post_id) do update set method = 'free_quota', created_at = now();
      return jsonb_build_object('ok', true, 'unlocked', true, 'method', 'free_quota', 'charged', 0,
                                'free_remaining', p_free_quota - v_free_used - 1)
        || public.point_state(p_user_id);
    end if;
  end if;

  if p_cost is null or p_cost <= 0 then
    return jsonb_build_object('ok', false, 'error', 'disabled');
  end if;

  select id into v_id from public.point_ledger where idempotency_key = v_key;
  if v_id is null then
    if public.point_balance_of(p_user_id) - public.point_held_of(p_user_id) < p_cost then
      return jsonb_build_object('ok', false, 'error', 'insufficient', 'required', p_cost) || public.point_state(p_user_id);
    end if;
    insert into public.point_ledger (user_id, entry_type, amount, reason, source_type, source_id, idempotency_key)
    values (p_user_id, 'spend', -p_cost, 'review_unlock', 'post', p_post_id, v_key)
    returning id into v_id;
  end if;

  insert into public.content_unlocks (user_id, post_id, method, ledger_id)
  values (p_user_id, p_post_id, 'points', v_id)
  on conflict (user_id, post_id) do update set method = 'points', ledger_id = excluded.ledger_id, created_at = now();
  return jsonb_build_object('ok', true, 'unlocked', true, 'method', 'points', 'charged', p_cost)
    || public.point_state(p_user_id);
end $$;

-- Take back what a source earned: net = earned rows for (user, source) + p_extra_earned (legacy JSON earnings)
-- + earlier clawbacks (negative). Inserts min(net, p_amount) as a 'clawback' row. Balance may go negative.
create or replace function public.clawback_source(
  p_user_id text,
  p_source_type text,
  p_source_id text,
  p_idempotency_key text,
  p_reason text default 'clawback',
  p_amount integer default null,
  p_extra_earned integer default 0,
  p_created_by text default null,
  p_note text default null
) returns jsonb
language plpgsql as $$
declare
  v_existing public.point_ledger%rowtype;
  v_net integer;
  v_take integer;
  v_id uuid;
begin
  perform public.point_lock_user(p_user_id);

  select * into v_existing from public.point_ledger where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'ledger_id', v_existing.id, 'amount', v_existing.amount)
      || public.point_state(p_user_id);
  end if;

  select coalesce(sum(amount), 0)::integer into v_net
    from public.point_ledger
    where user_id = p_user_id and source_type = p_source_type and source_id = p_source_id
      and entry_type in ('earn', 'clawback');
  v_net := v_net + coalesce(p_extra_earned, 0);
  v_take := case when p_amount is null then v_net else least(v_net, p_amount) end;
  if v_take <= 0 then
    return jsonb_build_object('ok', false, 'error', 'nothing_to_clawback') || public.point_state(p_user_id);
  end if;

  insert into public.point_ledger (user_id, entry_type, amount, reason, source_type, source_id, idempotency_key, created_by, note)
  values (p_user_id, 'clawback', -v_take, p_reason, p_source_type, p_source_id, p_idempotency_key, p_created_by, p_note)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'ledger_id', v_id, 'amount', -v_take) || public.point_state(p_user_id);
end $$;

-- Coffee chat request + 120 hold in one transaction (monthly cap counted on non-cancelled requests).
create or replace function public.request_coffee_chat(
  p_user_id text,
  p_amount integer,
  p_monthly_cap integer,
  p_topic text,
  p_message text,
  p_preferred_times text,
  p_mentor_id text,
  p_disclaimer_version text,
  p_idempotency_key text
) returns jsonb
language plpgsql as $$
declare
  v_existing public.coffee_chat_requests%rowtype;
  v_count integer;
  v_request uuid := gen_random_uuid();
  v_hold uuid;
begin
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'disabled');
  end if;
  perform public.point_lock_user(p_user_id);

  select * into v_existing from public.coffee_chat_requests where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'request_id', v_existing.id, 'hold_id', v_existing.hold_id)
      || public.point_state(p_user_id);
  end if;

  if p_monthly_cap is not null then
    select count(*)::integer into v_count
      from public.coffee_chat_requests
      where user_id = p_user_id and status <> 'cancelled' and created_at >= public.point_window_start('month');
    if v_count >= p_monthly_cap then
      return jsonb_build_object('ok', false, 'error', 'monthly_cap', 'cap', p_monthly_cap) || public.point_state(p_user_id);
    end if;
  end if;

  if public.point_balance_of(p_user_id) - public.point_held_of(p_user_id) < p_amount then
    return jsonb_build_object('ok', false, 'error', 'insufficient', 'required', p_amount) || public.point_state(p_user_id);
  end if;

  insert into public.point_holds (user_id, amount, source_type, source_id, idempotency_key)
  values (p_user_id, p_amount, 'coffee_chat', v_request::text, 'hold:coffee_chat:' || v_request::text)
  returning id into v_hold;

  insert into public.coffee_chat_requests
    (id, user_id, mentor_id, topic, message, preferred_times, amount, hold_id, idempotency_key, disclaimer_version, agreed_at)
  values
    (v_request, p_user_id, p_mentor_id, p_topic, p_message, p_preferred_times, p_amount, v_hold, p_idempotency_key,
     p_disclaimer_version, now());
  return jsonb_build_object('ok', true, 'request_id', v_request, 'hold_id', v_hold) || public.point_state(p_user_id);
end $$;

-- ERP / user transitions. p_action: schedule | complete (capture) | cancel (release) | no_show (capture)
create or replace function public.transition_coffee_chat(
  p_request_id uuid,
  p_action text,
  p_actor text,
  p_actor_role text default 'admin',       -- 'user' | 'mentor' | 'admin'
  p_mentor_id text default null,
  p_scheduled_at timestamptz default null,
  p_mentor_note text default null,
  p_admin_note text default null
) returns jsonb
language plpgsql as $$
declare
  v_req public.coffee_chat_requests%rowtype;
  v_result jsonb := '{}'::jsonb;
  v_next text;
begin
  select * into v_req from public.coffee_chat_requests where id = p_request_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  perform public.point_lock_user(v_req.user_id);
  select * into v_req from public.coffee_chat_requests where id = p_request_id for update;

  if p_action = 'schedule' then
    if v_req.status not in ('requested', 'scheduled') then
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
    -- the requester may cancel only before it is scheduled
    if v_req.status not in ('requested', 'scheduled') or (p_actor_role = 'user' and v_req.status <> 'requested') then
      return jsonb_build_object('ok', false, 'error', 'invalid_transition', 'status', v_req.status);
    end if;
    v_next := 'cancelled';
    if v_req.hold_id is not null then
      v_result := public.release_hold(v_req.hold_id, p_actor, 'cancelled by ' || coalesce(p_actor_role, 'admin'));
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
    mentor_note = coalesce(p_mentor_note, mentor_note),
    admin_note = coalesce(p_admin_note, admin_note),
    cancelled_by = case when v_next = 'cancelled' then coalesce(p_actor_role, 'admin') else cancelled_by end,
    decided_by = coalesce(p_actor, decided_by),
    completed_at = case when v_next in ('completed', 'no_show') then now() else completed_at end,
    updated_at = now()
  where id = p_request_id;

  return jsonb_build_object('ok', true, 'status', v_next, 'user_id', v_req.user_id) || (v_result - 'ok');
end $$;

-- Boost a roommate/sublet post: charges p_cost and pins it for p_days from now. Limits (null/<=0 = off):
--   one boost at a time per post (no extending), p_cooldown_days after a boost ends before the same post again,
--   p_monthly_cap boosts per user per New York month, p_max_active running boosts per board + city.
-- Errors: active / cooldown (available_at) / monthly_cap (max) / slots_full (next_free_at) / insufficient.
drop function if exists public.boost_post(text, text, text, integer, integer, text);
create or replace function public.boost_post(
  p_user_id text,
  p_post_id text,
  p_board text,
  p_city text,
  p_cost integer,
  p_days integer,
  p_cooldown_days integer,
  p_monthly_cap integer,
  p_max_active integer,
  p_idempotency_key text
) returns jsonb
language plpgsql as $$
declare
  v_existing public.point_post_boosts%rowtype;
  v_current timestamptz;
  v_count integer;
  v_next timestamptz;
  v_until timestamptz;
  v_ledger uuid;
begin
  if p_cost is null or p_cost <= 0 or p_days is null or p_days <= 0 then
    return jsonb_build_object('ok', false, 'error', 'disabled');
  end if;
  perform public.point_lock_user(p_user_id);
  -- slots are shared by everyone on the board: serialize boosts per board + city
  perform pg_advisory_xact_lock(hashtext('boost:' || p_board || ':' || coalesce(p_city, '')));

  select * into v_existing from public.point_post_boosts where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'boosted_until', v_existing.boosted_until)
      || public.point_state(p_user_id);
  end if;

  select max(boosted_until) into v_current from public.point_post_boosts where post_id = p_post_id;
  if v_current is not null and v_current > now() then
    return jsonb_build_object('ok', false, 'error', 'active', 'boosted_until', v_current);
  end if;
  if v_current is not null and coalesce(p_cooldown_days, 0) > 0
     and v_current + make_interval(days => p_cooldown_days) > now() then
    return jsonb_build_object('ok', false, 'error', 'cooldown',
      'available_at', v_current + make_interval(days => p_cooldown_days));
  end if;

  if coalesce(p_monthly_cap, 0) > 0 then
    select count(*) into v_count from public.point_post_boosts
      where user_id = p_user_id and created_at >= public.point_window_start('month');
    if v_count >= p_monthly_cap then
      return jsonb_build_object('ok', false, 'error', 'monthly_cap', 'max', p_monthly_cap);
    end if;
  end if;

  if coalesce(p_max_active, 0) > 0 then
    select count(*), min(boosted_until) into v_count, v_next from public.point_post_boosts
      where board = p_board and city is not distinct from p_city and boosted_until > now();
    if v_count >= p_max_active then
      return jsonb_build_object('ok', false, 'error', 'slots_full', 'next_free_at', v_next);
    end if;
  end if;

  if public.point_balance_of(p_user_id) - public.point_held_of(p_user_id) < p_cost then
    return jsonb_build_object('ok', false, 'error', 'insufficient', 'required', p_cost) || public.point_state(p_user_id);
  end if;

  v_until := now() + make_interval(days => p_days);

  insert into public.point_ledger (user_id, entry_type, amount, reason, source_type, source_id, idempotency_key)
  values (p_user_id, 'spend', -p_cost, 'housing_post_boost', 'post', p_post_id, 'spend:' || p_idempotency_key)
  returning id into v_ledger;

  insert into public.point_post_boosts (post_id, user_id, board, city, boosted_until, ledger_id, idempotency_key)
  values (p_post_id, p_user_id, p_board, p_city, v_until, v_ledger, p_idempotency_key);
  return jsonb_build_object('ok', true, 'boosted_until', v_until) || public.point_state(p_user_id);
end $$;

-- MARK: access. Service role only; anon/authenticated (PostgREST public roles) get nothing.

alter table public.point_rules enable row level security;
alter table public.point_settings enable row level security;
alter table public.point_rules_history enable row level security;
alter table public.point_ledger enable row level security;
alter table public.point_holds enable row level security;
alter table public.point_claims enable row level security;
alter table public.content_unlocks enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.coffee_chat_requests enable row level security;
alter table public.point_post_boosts enable row level security;
alter table public.point_identities enable row level security;

revoke all on public.point_rules, public.point_settings, public.point_rules_history, public.point_ledger,
  public.point_holds, public.point_claims, public.content_unlocks, public.daily_checkins,
  public.coffee_chat_requests, public.point_post_boosts, public.point_identities, public.point_balances
  from anon, authenticated;

grant select, insert, update, delete on public.point_rules, public.point_settings, public.point_rules_history,
  public.point_holds, public.point_claims, public.content_unlocks, public.daily_checkins,
  public.coffee_chat_requests, public.point_post_boosts, public.point_identities
  to service_role;
grant select, insert, delete on public.point_ledger to service_role;
grant select on public.point_balances to service_role;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.point_lock_user(text)',
    'public.point_balance_of(text)',
    'public.point_held_of(text)',
    'public.point_window_start(text)',
    'public.point_state(text)',
    'public.point_ledger_no_update()',
    'public.earn_points(text, integer, text, text, text, text, text[], text, text, integer, text, text)',
    'public.spend_points(text, integer, text, text, text, text, integer, text, text)',
    'public.hold_points(text, integer, text, text, text, text, text)',
    'public.capture_hold(uuid, text, text, text)',
    'public.release_hold(uuid, text, text)',
    'public.unlock_post(text, text, boolean, integer, integer, boolean)',
    'public.clawback_source(text, text, text, text, text, integer, integer, text, text)',
    'public.request_coffee_chat(text, integer, integer, text, text, text, text, text, text)',
    'public.transition_coffee_chat(uuid, text, text, text, text, timestamptz, text, text)',
    'public.boost_post(text, text, text, text, integer, integer, integer, integer, integer, text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;

-- MARK: seeds (defaults = src/lib/points/defaults.ts; existing rows are never overwritten)

insert into public.point_rules (key, value, enabled, description) values
  ('earn.verify_first_email', 30, true, 'Welcome: first school OR work verification, once per account'),
  ('earn.verify_second_email', 10, false, 'Off by decision: additional verifications earn nothing'),
  ('earn.verify_instagram', 5, true, 'Instagram DM verification approved, once per account'),
  ('earn.welcome_instagram_only', 10, false, 'Off by decision'),
  ('earn.onboarding_quiz', 10, false, 'Quiz content does not exist yet'),
  ('earn.profile_complete', 5, true, 'Required profile fields completed, once'),
  ('earn.checkin', 1, true, 'Daily check-in (America/New_York day), verified accounts'),
  ('earn.checkin_streak7', 3, true, 'Every 7th consecutive check-in day'),
  ('cap.checkin_monthly', 30, true, 'Max check-in points per month (check-in + streak)'),
  ('earn.referral', 20, true, 'To the referrer when the referred user completes school/work verification'),
  ('cap.referral_monthly', 5, true, 'Max referral rewards (people) per month'),
  ('earn.interview.base', 20, true, null),
  ('earn.interview.detail', 15, true, null),
  ('earn.interview.verified', 15, true, null),
  ('earn.interview.pick', 20, true, null),
  ('earn.visa.base', 20, true, null),
  ('earn.visa.detail', 15, true, null),
  ('earn.visa.verified', 15, true, null),
  ('earn.visa.pick', 20, true, null),
  ('earn.food.base', 5, true, null),
  ('earn.food.detail', 0, true, null),
  ('earn.food.verified', 0, true, null),
  ('earn.food.pick', 5, true, null),
  ('earn.first_company_review', 30, true, 'First interview/job review for a company with no reviews'),
  ('earn.comment', 1, true, null),
  ('cap.comment_daily', 5, true, 'Max comment points per day'),
  ('rule.comment_min_chars', 20, true, null),
  ('earn.accepted_answer', 5, false, 'No accepted-answer feature yet'),
  ('cap.interview_monthly', 3, true, 'Interview/job reviews that can earn per month'),
  ('cap.visa_monthly', 3, true, 'Visa reviews that can earn per month'),
  ('cap.food_daily', 2, true, 'Food reviews that can earn per day'),
  ('rule.food_min_chars', 50, true, 'Min plain-text characters for a food review claim'),
  ('rule.food_min_photos', 1, true, null),
  ('rule.similarity_threshold', 60, true, 'Word-shingle Jaccard % at/above which a claim is held (hold_reason=similar)'),
  ('spend.review_unlock', 10, true, 'Interview/job and visa reviews. Food is always free'),
  ('quota.free_unlocks_lifetime', 5, true, 'Lifetime free unlocks per account (Misaeng + Ellieo)'),
  ('spend.coffee_chat', 120, true, 'Held on request, captured on completion / no-show'),
  ('cap.coffee_chat_monthly', 1, true, 'Coffee chat requests per month (legacy limit)'),
  ('spend.housing_post_boost', 50, true, 'Roommate/sublet post pinned for rule.housing_boost_days'),
  ('rule.housing_boost_days', 7, true, null),
  ('rule.housing_boost_cooldown_days', 7, true, 'Days after a boost ends before the same post can be boosted again'),
  ('cap.housing_boost_monthly', 2, true, 'Boosts per user per month'),
  ('cap.housing_boost_active', 3, true, 'Boosted posts at the same time per board and city'),
  ('cap.spend_monthly', 0, false, 'No legacy monthly spend limit existed; enable with a value to cap'),
  ('spend.consult_prep_kit', 30, false, null),
  ('spend.mentor_qna_3', 30, false, null),
  ('spend.resume_review', 60, false, null),
  ('spend.mock_interview', 150, false, null),
  ('spend.group_session_deposit', 20, false, 'Released on attendance'),
  ('spend.event_priority', 10, false, null),
  ('spend.ai_interview_prep', 5, false, null)
on conflict (key) do nothing;

insert into public.point_settings (key, value) values
  ('paywall.enabled', 'false'::jsonb),
  ('paywall.start_date', '"2027-03-01"'::jsonb),
  ('paywall.notice_days', '21'::jsonb),
  ('points.cutover_at', 'null'::jsonb)
on conflict (key) do nothing;

notify pgrst, 'reload schema';
