-- ── Boost on a listing that is already up (owner 2026-11-26) ───────────────────────────────────────────────────
-- Boost on a live regular listing charges ONLY the Boost price (boostPrice) and keeps the listing's own end date; the
-- regular days it already paid for are not charged again or restarted. If fewer days are left than the Boost window
-- (7 days), the end date moves to the Boost's end at no extra charge, so a Boost is never cut short. A reservation made on
-- a live listing holds only the Boost price too (boost_only) and keeps the end date when it starts. A new Premium listing
-- (new post, or a listing that is not up) stays regular[totalDays] + boostPrice for totalDays.
-- Safe to re-run. The API (listingPlans.server.ts) passes p_upgrade_price; until this runs it falls back to the old
-- 11-argument function (old rule: full Premium price, restarts the days), so the order of SQL / deploy doesn't break anything.
alter table misaeng_premium_reservations add column if not exists boost_only boolean not null default false;

-- Starts waiting reservations in order while spots are free; an in-house one waits while in-house listings already hold
-- their share (the next outside one goes first).
drop function if exists misaeng_premium_promote(int, int, int);
create or replace function misaeng_premium_promote(p_slots int, p_premium_days int, p_total_days int)
returns int language plpgsql as $$
declare r record; v_started int := 0;
begin
  perform pg_advisory_xact_lock(hashtext('misaeng-premium-slots'));
  for r in select * from misaeng_premium_reservations where status = 'waiting' order by created_at for update loop
    exit when misaeng_premium_active_count() >= p_slots;
    continue when misaeng_in_house_active(r.user_id) and misaeng_premium_in_house_count() >= misaeng_in_house_boost_slots();
    -- boost_only (reserved on a listing that was up): keep its end date, at least through the Boost window.
    update misaeng_listings
       set status = 'live', plan = 'premium', premium_start = now(), premium_end = now() + make_interval(days => p_premium_days),
           premium_extended = false,
           expires_at = case when r.boost_only then greatest(expires_at, now() + make_interval(days => p_premium_days))
                             else now() + make_interval(days => p_total_days) end
     where id = r.listing_id and status in ('live', 'expired');
    if found then
      update misaeng_premium_reservations set status = 'started', started_at = now() where id = r.id;
      v_started := v_started + 1;
    else
      perform misaeng_premium_cancel(r.user_id, r.listing_id);
    end if;
  end loop;
  return v_started;
end $$;

-- One purchase = spend + listing change, atomically. p_promotion: a listing discount the API applied (recorded).
-- p_upgrade_price (Boost mode, owner 11-26): Boost on a listing that is already up costs only this (the Boost part) and
-- keeps the listing's own end date — the regular days it already paid for are neither charged again nor restarted. If
-- fewer days are left than the Boost window, the end date moves to the Boost's end at no extra charge (a Boost is never
-- cut short). The same for a reservation on a listing that is up (boost_only). Null → the old rule (full price, restart).
-- Extension: +p_premium_days of Boost; the end date moves with it if needed (never cut short either).
-- Returns { ok, reservation, charged } (charged = credits taken or held now).
drop function if exists misaeng_listing_purchase(text, uuid, text, int, int, int[], int, int, int, int);
drop function if exists misaeng_listing_purchase(text, uuid, text, int, int, int[], int, int, int, int, uuid);
create or replace function misaeng_listing_purchase(p_user text, p_listing uuid, p_action text, p_days int, p_price int,
                                                   p_regular_days int[], p_slots int, p_premium_days int, p_total_days int,
                                                   p_now_price int default 0, p_promotion uuid default null,
                                                   p_upgrade_price int default null)
returns jsonb language plpgsql as $$
declare l record; v_spent record; v_now record; v_res uuid; v_live boolean; v_in_house boolean; v_spot_full boolean;
        v_upgrade boolean; v_price int := p_price;
begin
  perform pg_advisory_xact_lock(hashtext('misaeng-credits-' || p_user));
  if p_action in ('premium', 'extend', 'reserve') then perform pg_advisory_xact_lock(hashtext('misaeng-premium-slots')); end if;
  select * into l from misaeng_listings where id = p_listing and owner_id = p_user for update;
  if not found then raise exception 'misaeng:NOT_FOUND'; end if;
  if not l.brokered then raise exception 'misaeng:NOT_BROKERED'; end if;
  if l.status not in ('live', 'expired') then raise exception 'misaeng:NOT_AVAILABLE'; end if;
  v_live := l.status = 'live' and l.expires_at > now();
  -- Boost on a listing that is up: only the Boost part.
  v_upgrade := v_live and p_upgrade_price is not null and p_action in ('premium', 'reserve');
  if v_upgrade then v_price := p_upgrade_price; end if;
  v_in_house := misaeng_in_house_active(p_user);
  -- No spot for this member: all taken, or (in-house) in-house listings already hold their share.
  v_spot_full := misaeng_premium_active_count() >= p_slots
                 or v_in_house and misaeng_premium_in_house_count() >= misaeng_in_house_boost_slots();
  if p_promotion is not null and not misaeng_promotion_usable(p_promotion, p_user) then raise exception 'misaeng:PROMO_ENDED'; end if;

  if p_action = 'regular' then
    if not (p_days = any (p_regular_days)) then raise exception 'misaeng:INVALID_PLAN'; end if;
    if l.plan = 'premium' and l.premium_end > now() and v_live then raise exception 'misaeng:PREMIUM_ACTIVE'; end if;
    select * into v_spent from misaeng_credit_spend_locked(p_user, v_price, 'listing', p_listing, p_days || ' days');
    update misaeng_listings set status = 'live', plan = 'regular', plan_days = p_days,
           premium_start = null, premium_end = null, premium_extended = false,
           expires_at = now() + make_interval(days => p_days) where id = p_listing;
  elsif p_action = 'premium' then
    if l.plan = 'premium' and l.premium_end > now() and v_live then raise exception 'misaeng:PREMIUM_ACTIVE'; end if;
    if exists (select 1 from misaeng_premium_reservations where listing_id = p_listing and status = 'waiting') then
      raise exception 'misaeng:ALREADY_RESERVED';
    end if;
    if v_spot_full then raise exception 'misaeng:SLOTS_FULL'; end if;
    select * into v_spent from misaeng_credit_spend_locked(p_user, v_price,
      case when v_live then 'upgrade' else 'premium' end, p_listing, null);
    update misaeng_listings set status = 'live', plan = 'premium', premium_start = now(),
           premium_end = now() + make_interval(days => p_premium_days), premium_extended = false,
           expires_at = case when v_upgrade then greatest(expires_at, now() + make_interval(days => p_premium_days))
                             else now() + make_interval(days => p_total_days) end
     where id = p_listing;
  elsif p_action = 'extend' then
    if not (l.plan = 'premium' and l.premium_end > now() and v_live) then raise exception 'misaeng:NOT_PREMIUM'; end if;
    if l.premium_extended then raise exception 'misaeng:ALREADY_EXTENDED'; end if;
    select * into v_spent from misaeng_credit_spend_locked(p_user, v_price, 'extend', p_listing, '+' || p_premium_days || ' days Boost');
    update misaeng_listings set premium_end = premium_end + make_interval(days => p_premium_days),
           expires_at = greatest(expires_at, premium_end + make_interval(days => p_premium_days)),
           premium_extended = true where id = p_listing;
  elsif p_action = 'reserve' then
    if exists (select 1 from misaeng_premium_reservations where listing_id = p_listing and status = 'waiting') then
      raise exception 'misaeng:ALREADY_RESERVED';
    end if;
    if not v_spot_full then raise exception 'misaeng:SLOT_OPEN'; end if;
    if v_upgrade then p_now_price := 0; end if;
    if (select b.paid + b.staff from misaeng_credit_balance(p_user) b) < v_price + coalesce(p_now_price, 0) then
      raise exception 'misaeng:NOT_ENOUGH_CREDITS';
    end if;
    if coalesce(p_now_price, 0) > 0 then
      select * into v_now from misaeng_credit_spend_locked(p_user, p_now_price, 'listing', p_listing, p_total_days || ' days');
      update misaeng_listings set status = 'live', plan = 'regular', plan_days = p_total_days,
             expires_at = now() + make_interval(days => p_total_days) where id = p_listing;
    end if;
    select * into v_spent from misaeng_credit_spend_locked(p_user, v_price, 'reserve', p_listing, 'Boost reservation');
    insert into misaeng_premium_reservations (listing_id, user_id, paid_used, staff_used, lots, boost_only)
    values (p_listing, p_user, v_spent.paid_used, v_spent.staff_used, v_spent.lots, v_upgrade) returning id into v_res;
  else
    raise exception 'misaeng:INVALID_PLAN';
  end if;
  if p_promotion is not null then
    insert into misaeng_promotion_uses (promotion_id, user_id, ref_id) values (p_promotion, p_user, p_listing);
  end if;
  return jsonb_build_object('ok', true, 'reservation', v_res, 'charged', v_price + coalesce(p_now_price, 0));
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'misaeng_premium_promote(int, int, int)',
    'misaeng_listing_purchase(text, uuid, text, int, int, int[], int, int, int, int, uuid, int)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
