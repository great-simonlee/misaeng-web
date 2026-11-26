-- Misaeng credits · Google Play purchases (2026-11-26, Android credit packs)
-- The Android app buys credit packs as Play one-time (consumable) products with the same ids as the App Store packs
-- (com.misaeng.nyc.credits.100 / .220 / .460 / .960). POST /api/credits/google reads the purchase back from the Google
-- Play Developer API and records it here once per purchase token (idempotent), then the app consumes it.
-- Refunds: Play voided-purchase notifications (/api/premium/google/notifications) take the credits back.
-- Run after supabase/agent_accounts.sql, on staging first (SQL Editor). Safe to re-run.

alter table misaeng_credit_purchases drop constraint if exists misaeng_credit_purchases_provider_check;
alter table misaeng_credit_purchases add constraint misaeng_credit_purchases_provider_check
  check (provider in ('stripe', 'apple', 'google'));
alter table misaeng_credit_purchases add column if not exists google_order_id       text;
alter table misaeng_credit_purchases add column if not exists google_purchase_token text;
alter table misaeng_credit_purchases add column if not exists google_environment    text;
create unique index if not exists misaeng_credit_purchases_google_token on misaeng_credit_purchases (google_purchase_token)
  where google_purchase_token is not null;

-- Same as agent_accounts.sql, plus the Google Play branch: p.googleToken (idempotency key), p.googleOrder,
-- p.googleEnvironment ('test' | 'live').

create or replace function misaeng_credit_purchase_record(p jsonb) returns jsonb language plpgsql as $$
declare
  v_user text := p->>'user'; v_existing uuid; v_id uuid; v_lot uuid;
  v_base int := (p->>'baseCredits')::int; v_bonus int := coalesce((p->>'bonusCredits')::int, 0);
  v_total int; v_cents int := (p->>'amountCents')::int; v_debt record; v_pay int; v_paid_down int := 0;
  v_promos uuid[] := coalesce(array(select jsonb_array_elements_text(coalesce(p->'promotionIds', '[]'::jsonb))::uuid), '{}');
  v_promo uuid;
begin
  if v_user is null or v_base is null or v_base <= 0 or v_bonus < 0 or v_cents is null or v_cents < 0 then
    raise exception 'misaeng:INVALID';
  end if;
  if coalesce(p->>'provider', 'stripe') not in ('stripe', 'apple', 'google') then raise exception 'misaeng:INVALID'; end if;
  perform pg_advisory_xact_lock(hashtext('misaeng-credits-' || v_user));
  if p->>'stripeSession' is not null then
    select id into v_existing from misaeng_credit_purchases where stripe_session_id = p->>'stripeSession';
  elsif p->>'appleTransaction' is not null then
    select id into v_existing from misaeng_credit_purchases where apple_transaction_id = p->>'appleTransaction';
  elsif p->>'googleToken' is not null then
    select id into v_existing from misaeng_credit_purchases where google_purchase_token = p->>'googleToken';
  else
    raise exception 'misaeng:INVALID';
  end if;
  if v_existing is not null then return jsonb_build_object('purchaseId', v_existing, 'created', false); end if;
  v_total := v_base + v_bonus;
  insert into misaeng_credit_purchases (user_id, provider, stripe_session_id, stripe_payment_intent, apple_transaction_id,
         apple_original_transaction_id, apple_environment, product_id, pack_id, credits, base_credits, bonus_credits,
         amount_cents, tax_cents, list_cents, discount_cents, currency, card_brand, card_last4, buyer_name, buyer_email,
         brokerage, receipt_url, promotion_ids, google_order_id, google_purchase_token, google_environment)
  values (v_user, coalesce(p->>'provider', 'stripe'), p->>'stripeSession', p->>'stripeIntent', p->>'appleTransaction',
          p->>'appleOriginalTransaction', p->>'appleEnvironment', p->>'productId', coalesce(p->>'packId', 'pack'), v_total,
          v_base, v_bonus, v_cents, coalesce((p->>'taxCents')::int, 0), coalesce((p->>'listCents')::int, v_cents),
          coalesce((p->>'discountCents')::int, 0), coalesce(p->>'currency', 'usd'), p->>'cardBrand', p->>'last4',
          p->>'buyerName', p->>'buyerEmail', p->>'brokerage', p->>'receiptUrl', v_promos,
          p->>'googleOrder', p->>'googleToken', p->>'googleEnvironment')
  returning id into v_id;
  insert into misaeng_credit_ledger (user_id, bucket, amount, remaining, reason, ref_id, purchase_id, unit_cents, note)
  values (v_user, 'paid', v_total, v_total, 'purchase', v_id, v_id, v_cents::numeric / v_total,
          left(coalesce(p->>'packId', '') || case when v_bonus > 0 then ' +' || v_bonus || ' bonus' else '' end, 200))
  returning id into v_lot;
  update misaeng_credit_purchases set lot_id = v_lot where id = v_id;
  -- An open debt (an earlier refund after the credits were used) is paid first.
  for v_debt in select id, remaining from misaeng_credit_ledger
                 where user_id = v_user and reason = 'debt' and remaining > 0 order by created_at for update loop
    v_pay := least(v_debt.remaining, v_total - v_paid_down);
    exit when v_pay <= 0;
    update misaeng_credit_ledger set remaining = remaining - v_pay where id = v_debt.id;
    v_paid_down := v_paid_down + v_pay;
  end loop;
  if v_paid_down > 0 then
    update misaeng_credit_ledger set remaining = remaining - v_paid_down where id = v_lot;
    insert into misaeng_credit_ledger (user_id, bucket, amount, reason, ref_id, lot_id, note, value_cents)
    values (v_user, 'paid', -v_paid_down, 'debt_paid', v_id, v_lot, 'Applied to an earlier refund',
            round(v_paid_down * v_cents::numeric / v_total, 4));
  end if;
  foreach v_promo in array v_promos loop
    insert into misaeng_promotion_uses (promotion_id, user_id, ref_id) values (v_promo, v_user, v_id);
  end loop;
  return jsonb_build_object('purchaseId', v_id, 'created', true, 'debtPaid', v_paid_down);
end $$;


revoke execute on function misaeng_credit_purchase_record(jsonb) from public, anon, authenticated;
grant execute on function misaeng_credit_purchase_record(jsonb) to service_role;
