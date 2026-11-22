-- Premium fixes after the 11-22 payment review. Run AFTER premium.sql and premium_codes.sql, in the Supabase SQL
-- Editor (staging and production). Safe to re-run.
--
-- 1. redeem_premium_code(): per-member lock (one member redeeming two different codes at the same moment can no longer
--    get both), and past_due counts only until current_period_end (the server now stores the grace end there).
-- 2. revoke_premium_redemption(): ends a member's code Premium in one transaction (was two separate writes).
-- 3. premium_code_batch_stats: per-batch counts for the ERP list (no row limits).
-- 4. premium_apple_accounts: one App Store appAccountToken per Misaeng account (links purchases to the right account,
--    recovers purchases the app could not report).
-- 5. premium_refunds.reason also allows 'stripe_dashboard' (full refunds made in the Stripe Dashboard are recorded).

create or replace function public.redeem_premium_code(p_code text, p_uid text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c public.premium_codes%rowtype;
  b public.premium_code_batches%rowtype;
  v_end timestamptz;
  v_id uuid;
begin
  -- Always take the member lock first, then the code lock (same order everywhere → no deadlocks).
  perform pg_advisory_xact_lock(hashtextextended('premium_redeem:' || coalesce(p_uid, ''), 0));
  select * into c from public.premium_codes where code = p_code for update;
  if not found or c.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;
  select * into b from public.premium_code_batches where id = c.batch_id for share;
  if b.status = 'paused' then return jsonb_build_object('ok', false, 'error', 'PAUSED'); end if;
  if b.status = 'closed' then return jsonb_build_object('ok', false, 'error', 'CLOSED'); end if;
  if b.redeem_by is not null and b.redeem_by < now() then
    return jsonb_build_object('ok', false, 'error', 'REDEEM_ENDED');
  end if;
  if exists (select 1 from public.premium_code_redemptions where code_id = c.id and user_uid = p_uid) then
    return jsonb_build_object('ok', false, 'error', 'ALREADY_USED');
  end if;
  if c.used_count >= c.max_uses then return jsonb_build_object('ok', false, 'error', 'USED_UP'); end if;
  -- Same rule as isActiveEntitlement (src/lib/premium/access.server.ts)
  if exists (
    select 1 from public.premium_entitlements e
    where e.user_uid = p_uid
      and e.status in ('trialing', 'active', 'past_due')
      and (e.current_period_end is null or e.current_period_end > now())
  ) then
    return jsonb_build_object('ok', false, 'error', 'ALREADY_PREMIUM');
  end if;

  v_end := case when b.duration = 'months' then now() + make_interval(months => b.months) else b.ends_at end;
  if v_end <= now() then return jsonb_build_object('ok', false, 'error', 'EXPIRED'); end if;

  insert into public.premium_code_redemptions (code_id, batch_id, user_uid, email, ends_at)
    values (c.id, b.id, p_uid, p_email, v_end)
    returning id into v_id;
  update public.premium_codes set used_count = used_count + 1 where id = c.id;
  insert into public.premium_entitlements
    (user_uid, email, source, plan, status, current_period_end, cancel_at_period_end, external_id, product_id, raw)
    values (p_uid, p_email, 'code', 'code', 'active', v_end, true, 'code:' || v_id, b.id::text,
            jsonb_build_object('batch', b.name, 'organization', b.organization, 'code', c.code));
  return jsonb_build_object('ok', true, 'redemption_id', v_id, 'ends_at', v_end);
end;
$$;
revoke all on function public.redeem_premium_code(text, text, text) from public, anon, authenticated;
grant execute on function public.redeem_premium_code(text, text, text) to service_role;

-- → { ok: true, user_uid } · { ok: false, error: 'NOT_FOUND' }. Safe to call again (repairs a half-done revoke).
create or replace function public.revoke_premium_redemption(p_id uuid, p_actor text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r public.premium_code_redemptions%rowtype;
begin
  select * into r from public.premium_code_redemptions where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  if r.revoked_at is null then
    update public.premium_code_redemptions set revoked_at = now(), revoked_by = p_actor where id = p_id;
  end if;
  update public.premium_entitlements
    set status = 'canceled',
        current_period_end = least(coalesce(current_period_end, now()), now()),
        updated_at = now()
    where external_id = 'code:' || p_id::text and status <> 'canceled';
  return jsonb_build_object('ok', true, 'user_uid', r.user_uid);
end;
$$;
revoke all on function public.revoke_premium_redemption(uuid, text) from public, anon, authenticated;
grant execute on function public.revoke_premium_redemption(uuid, text) to service_role;

create or replace view public.premium_code_batch_stats as
  select
    b.id as batch_id,
    (select count(*) from public.premium_codes c where c.batch_id = b.id)::int as code_count,
    (select coalesce(sum(c.used_count), 0) from public.premium_codes c where c.batch_id = b.id)::int as used,
    (select count(*) from public.premium_code_redemptions r
       where r.batch_id = b.id and r.revoked_at is null and r.ends_at > now())::int as active_members
  from public.premium_code_batches b;
revoke all on public.premium_code_batch_stats from anon, authenticated;
grant select on public.premium_code_batch_stats to service_role;

create table if not exists public.premium_apple_accounts (
  user_uid text primary key,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.premium_apple_accounts enable row level security;
revoke all on public.premium_apple_accounts from anon, authenticated;
grant select, insert, update, delete on public.premium_apple_accounts to service_role;

alter table public.premium_refunds drop constraint if exists premium_refunds_reason_check;
alter table public.premium_refunds add constraint premium_refunds_reason_check
  check (reason in ('policy', 'billing_error', 'service_issue', 'stripe_dashboard'));
