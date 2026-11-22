-- Premium codes (free access, no card) and refunds. Needs supabase/premium.sql first. Run once in the Supabase SQL
-- Editor (Misaeng production; staging for local tests). Safe to re-run.
--
-- premium_code_batches: one row per thing the ERP creates — a group code (student council / partner: one chosen
--   code, a member cap, one use per person) or a set of random single-use codes (e.g. 100 × 1 month).
--   duration: 'months' = N months from the day each person redeems, 'fixed' = everyone ends on ends_at.
-- premium_codes: the codes themselves (stored uppercase, letters and digits only; random ones are MSG + 8 chars).
-- premium_code_redemptions: who used which code; each creates a premium_entitlements row (source 'code',
--   external_id 'code:<redemption id>').
-- premium_refunds: refunds made from the ERP (full amount only; one 7-day policy refund per account).
--
-- redeem_premium_code() does every check and write in one transaction (row lock on the code): code active, batch
-- active and not past redeem_by, uses left, not used before by this member, and the member has no active
-- Premium at all (paid subscribers are blocked; one code at a time).

create table if not exists public.premium_code_batches (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('group', 'single')),
  name text not null,
  organization text,
  duration text not null check (duration in ('months', 'fixed')),
  months int check (months between 1 and 24),
  ends_at timestamptz,
  redeem_by timestamptz,
  max_redemptions int,                       -- group: member cap; single: number of codes
  status text not null default 'active' check (status in ('active', 'paused', 'closed')),
  note text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((duration = 'months' and months is not null) or (duration = 'fixed' and ends_at is not null))
);

create table if not exists public.premium_codes (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.premium_code_batches (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{4,24}$'),
  max_uses int not null default 1 check (max_uses >= 1),
  used_count int not null default 0 check (used_count >= 0),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now()
);
create index if not exists premium_codes_batch_idx on public.premium_codes (batch_id);

create table if not exists public.premium_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.premium_codes (id) on delete cascade,
  batch_id uuid not null references public.premium_code_batches (id) on delete cascade,
  user_uid text not null,
  email text,
  ends_at timestamptz not null,
  redeemed_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by text,
  unique (code_id, user_uid)
);
create index if not exists premium_code_redemptions_batch_idx on public.premium_code_redemptions (batch_id);
create index if not exists premium_code_redemptions_user_idx on public.premium_code_redemptions (user_uid);

create table if not exists public.premium_refunds (
  id uuid primary key default gen_random_uuid(),
  user_uid text not null,
  entitlement_id uuid,
  subscription_id text,
  invoice_id text,
  charge_id text not null unique,
  refund_id text,
  amount int not null,                       -- cents, always the full charge
  currency text,
  reason text not null check (reason in ('policy', 'billing_error', 'service_issue')),
  note text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists premium_refunds_user_idx on public.premium_refunds (user_uid);

alter table public.premium_code_batches enable row level security;
alter table public.premium_codes enable row level security;
alter table public.premium_code_redemptions enable row level security;
alter table public.premium_refunds enable row level security;
revoke all on public.premium_code_batches, public.premium_codes, public.premium_code_redemptions, public.premium_refunds
  from anon, authenticated;
grant select, insert, update, delete on public.premium_code_batches, public.premium_codes,
  public.premium_code_redemptions, public.premium_refunds to service_role;

-- → { ok: true, redemption_id, ends_at } or { ok: false, error: NOT_FOUND | PAUSED | CLOSED | REDEEM_ENDED |
--   USED_UP | ALREADY_USED | ALREADY_PREMIUM | EXPIRED }
create or replace function public.redeem_premium_code(p_code text, p_uid text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.premium_codes%rowtype;
  b public.premium_code_batches%rowtype;
  v_end timestamptz;
  v_id uuid;
begin
  select * into c from public.premium_codes where code = p_code for update;
  if not found or c.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;
  select * into b from public.premium_code_batches where id = c.batch_id;
  if b.status = 'paused' then return jsonb_build_object('ok', false, 'error', 'PAUSED'); end if;
  if b.status = 'closed' then return jsonb_build_object('ok', false, 'error', 'CLOSED'); end if;
  if b.redeem_by is not null and b.redeem_by < now() then
    return jsonb_build_object('ok', false, 'error', 'REDEEM_ENDED');
  end if;
  if exists (select 1 from public.premium_code_redemptions where code_id = c.id and user_uid = p_uid) then
    return jsonb_build_object('ok', false, 'error', 'ALREADY_USED');
  end if;
  if c.used_count >= c.max_uses then return jsonb_build_object('ok', false, 'error', 'USED_UP'); end if;
  -- Same rule as hasPremiumAccess (src/lib/premium/access.server.ts), past_due counted for its 3-day grace
  if exists (
    select 1 from public.premium_entitlements e
    where e.user_uid = p_uid
      and (
        (e.status in ('trialing', 'active') and (e.current_period_end is null or e.current_period_end > now()))
        or (e.status = 'past_due' and (e.current_period_end is null or e.current_period_end + interval '3 days' > now()))
      )
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
