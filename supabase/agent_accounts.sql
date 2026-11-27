-- Misaeng licensed agent accounts + paid agent listings (owner 2026-11-26). Run in the SQL Editor of STAGING
-- (misaeng-staging, okmppnhiwzlnfarosvds) first; production later, once. ONE transaction (all or nothing); a second
-- run stops at the first statement and changes nothing.
--
-- Ported from Ellieo (ellieo-app/shared/ellieo/db: retention listings part, agent_license(_2), agent_listing_pay,
-- credits_paid_only) with every name renamed ellieo_ → misaeng_, so Misaeng and Ellieo never share a balance, price,
-- license approval (per app, owner 11-26) or listing. Nothing here touches an existing Misaeng table.
--
-- Differences from Ellieo:
--   Licenses   three private photos (license, government ID, selfie) instead of one, license type (salesperson |
--              associate_broker | broker), consent fields; photos deleted 30 days after the decision (purge route)
--   Listings   misaeng_listings = listings posted by approved agents only (no personal listings; Misaeng's own
--              listings stay in the ERP → Storage flow); beds / baths / city added
--   Prices     same as Ellieo to start ($1 = 10 credits: 60 / 100 / 140, Boost +250, new Premium 390, extension +250,
--              packs 100 / 220 / 460 / 960); App Store products com.misaeng.nyc.credits.*; ERP-editable
--   Credits    ON (misaeng_settings credits_enabled = true)
--   Brokerage  misaeng_settings 'brokerage' (Fact Real Estate, responsible broker, office) for the disclosure on
--              Misaeng's own (ERP) listings

begin;

do $$
declare v_done boolean := false;
begin
  if to_regclass('public.misaeng_settings') is not null then
    execute 'select exists (select 1 from misaeng_settings where key = ''credits_enabled'')' into v_done;
  end if;
  if v_done then
    raise exception 'Misaeng agent accounts SQL is already applied (misaeng_settings credits_enabled exists) — nothing changed.';
  end if;
end $$;

-- ════════════════════════════════════════ listings (from retention.sql, listings part) ════════════════════════════
create table if not exists misaeng_listings (
  id             uuid primary key default gen_random_uuid(),
  owner_id       text not null,
  kind           text not null,                       -- privateRoom | sharedRoom | studio | apartment | sublet
  city           text not null default 'nyc' check (city in ('nyc', 'boston', 'dc')),
  zip            text not null,
  area           text not null,
  neighborhood   text,
  beds           int  check (beds between 0 and 10),
  baths          numeric(3,1) check (baths between 0 and 10),
  rent           int  not null check (rent between 1 and 30000),
  period         text not null default 'monthly',
  move_in        date,
  youtube_id     text,
  details_html   text check (char_length(details_html) <= 4000),
  cover_thumb    text,
  status         text not null default 'live' check (status in ('live', 'expired', 'archived', 'deleted', 'removed')),
  posted_at      timestamptz not null default now(),
  expires_at     timestamptz not null default now() + interval '30 days',
  deleted_at     timestamptz,
  removed_at     timestamptz,
  removed_reason text,
  reports        int not null default 0
);
create index if not exists misaeng_listings_live on misaeng_listings (posted_at desc) where status = 'live';
create index if not exists misaeng_listings_owner on misaeng_listings (owner_id, posted_at desc);

create table if not exists misaeng_files (
  path         text primary key,
  owner_id     text not null,
  listing_id   uuid references misaeng_listings (id) on delete set null,
  role         text not null,                         -- photo | thumb | floor_plan
  position     int,
  bytes        int,
  created_at   timestamptz not null default now(),
  purge_after  timestamptz default now() + interval '24 hours'
);
create index if not exists misaeng_files_purge on misaeng_files (purge_after) where purge_after is not null;

create table if not exists misaeng_listing_reports (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references misaeng_listings (id) on delete cascade,
  reporter    text not null,
  reason      text not null check (char_length(reason) between 1 and 40),
  note        text check (char_length(note) <= 500),
  created_at  timestamptz not null default now(),
  closed_at   timestamptz,
  closed_by   text,
  unique (listing_id, reporter)
);

drop function if exists misaeng_renew_listing(uuid, text);
create or replace function misaeng_renew_listing(p_listing uuid, p_owner text) returns boolean language sql as $$
  with renewed as (
    update misaeng_listings set status = 'live', expires_at = now() + interval '30 days'
     where id = p_listing and owner_id = p_owner and status in ('live', 'expired') returning id)
  select exists (select 1 from renewed);
$$;

create or replace function misaeng_listings_daily() returns void language plpgsql as $$
begin
  update misaeng_listings set status = 'expired' where status = 'live' and expires_at < now();
  with gone as (
    update misaeng_listings set status = 'archived'
     where status = 'expired' and expires_at < now() - interval '90 days' returning id, cover_thumb)
  update misaeng_files f set purge_after = now()
    from gone where f.listing_id = gone.id and f.path is distinct from gone.cover_thumb;
  update misaeng_files f set purge_after = now()
    from misaeng_listings l
   where f.listing_id = l.id and l.status = 'deleted' and l.deleted_at < now() - interval '7 days'
     and f.purge_after is null;
  delete from misaeng_listings
   where status = 'deleted' and deleted_at < now() - interval '7 days'
     and not exists (select 1 from misaeng_files f where f.listing_id = misaeng_listings.id);
  delete from misaeng_listing_reports where closed_at < now() - interval '365 days';
end $$;

alter table misaeng_listings        enable row level security;
alter table misaeng_files           enable row level security;
alter table misaeng_listing_reports enable row level security;
revoke execute on function misaeng_listings_daily()           from public, anon, authenticated;
revoke execute on function misaeng_renew_listing(uuid, text)  from public, anon, authenticated;
grant usage on schema public to service_role;
grant all on misaeng_listings, misaeng_files, misaeng_listing_reports to service_role;
grant execute on function misaeng_listings_daily(), misaeng_renew_listing(uuid, text) to service_role;

create extension if not exists pg_cron;
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'misaeng-listings-daily') then
    perform cron.schedule('misaeng-listings-daily', '10 9 * * *', 'select misaeng_listings_daily()');  -- 04:10 ET
  end if;
end $$;

-- ════════════════════════════════════════ agent_license.sql (+ part 2) ════════════════════════════════════════
-- Ellieo: "Licensed Agent" verification for New York real-estate agents (owner 11-25).
-- Run AFTER retention.sql (misaeng_listings), in the SQL Editor of staging (shared with Misaeng; every name starts
-- with misaeng_) and later Ellieo's own production project. Safe to run again.
--
-- The app never touches these tables: the Ellieo API (src/lib/ellieo/agentLicense.server.ts) reads and writes them
-- with the service role, and the ERP reviews through the API's internal route (/api/internal/ellieo/agent-licenses).
--
--   Apply      member sends NY license number, type (broker | salesperson), name as on the license, brokerage,
--              business phone or email, optional expiration date, and one photo of the license / pocket card
--   Review     staff compare it with the NY DOS record, then approve (staff confirm the expiration date) or reject
--              with a reason the member sees
--   Status     none → pending → approved | rejected. Approved ends at expires_on (NY licenses renew every 2 years):
--              after that the badge is hidden and the member is asked to apply again (shown as "expired")
--   One open   at most one pending application per member; a new one after a rejection / expiry is a new row
--   Photo      private bucket misaeng-agent-licenses ('{uid}/{uuid}.jpg'); never public, staff see 60-second signed URLs
--   Listings   approved agents can post brokered listings: brokerage name shown, broker fee (0 = "No fee", NYC FARE Act)

-- ── Applications ────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists misaeng_agent_licenses (
  id                   uuid primary key default gen_random_uuid(),
  user_id              text not null,                                   -- app uid (text, like the rest of the site)
  license_number       text not null check (char_length(license_number) between 4 and 20),
  license_type         text check (license_type in ('broker', 'associate_broker', 'salesperson')),
  holder_name          text not null check (char_length(holder_name) between 2 and 80),   -- as on the license
  brokerage            text not null check (char_length(brokerage) between 2 and 80),
  contact              text not null check (char_length(contact) between 5 and 120),      -- business phone or email
  applicant_expires_on date,                                            -- what the member typed (optional)
  photo_path           text,                                            -- license / pocket card (bucket misaeng-agent-licenses)
  id_photo_path        text,                                            -- government ID
  selfie_path          text,                                            -- selfie (camera)
  consent_at           timestamptz,                                     -- ID / face image consent (purpose, manual review, 30-day delete)
  consent_version      text,
  status               text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  expires_on           date,                                            -- confirmed by staff on approval
  reject_reason        text check (char_length(reject_reason) <= 300),
  reviewed_by          text,                                            -- staff email (ERP)
  reviewed_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint misaeng_agent_licenses_approved_expiry check (status <> 'approved' or expires_on is not null)
);
create index if not exists misaeng_agent_licenses_user on misaeng_agent_licenses (user_id, created_at desc);
create index if not exists misaeng_agent_licenses_status on misaeng_agent_licenses (status, created_at desc);
create unique index if not exists misaeng_agent_licenses_one_pending
  on misaeng_agent_licenses (user_id) where status = 'pending';

-- ── Brokered listings ───────────────────────────────────────────────────────────────────────────────────────────
alter table misaeng_listings add column if not exists brokered   boolean not null default true;
alter table misaeng_listings add column if not exists brokerage  text check (char_length(brokerage) <= 80);
-- Dollars the tenant pays the agent; 0 = no fee. Under the FARE Act the landlord's agent fee can't be charged to the tenant.
alter table misaeng_listings add column if not exists broker_fee int check (broker_fee between 0 and 100000);
alter table misaeng_listings add column if not exists license_id uuid references misaeng_agent_licenses (id) on delete set null;

-- ── Private photo bucket ────────────────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('misaeng-agent-licenses', 'misaeng-agent-licenses', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
-- No storage.objects policies on purpose: anon / authenticated get nothing; the service role bypasses RLS.

-- ── Access ──────────────────────────────────────────────────────────────────────────────────────────────────────
alter table misaeng_agent_licenses enable row level security;
revoke all on misaeng_agent_licenses from anon, authenticated;
grant select, insert, update, delete on misaeng_agent_licenses to service_role;

notify pgrst, 'reload schema';

-- Ellieo Licensed Agent, part 2 (owner 11-25 decisions). Run AFTER agent_license.sql, in the SQL Editor of staging
-- (misaeng-staging) and later Ellieo's own production project. Safe to run again.
--
--   1. Approval takes down the member's personal (non-brokered) listings: new listing status 'removed' with a
--      reason (hidden, kept — not deleted; never repostable: misaeng_renew_listing only renews live / expired).
--   2. License photos are deleted 30 days after the decision (the API's purge route deletes the file, then sets
--      photo_path = null and photo_deleted_at).
--   3. No license type any more (Broker / Salesperson): the column stays for old rows but is optional.

-- 1. Listings taken down when their owner became a Licensed Agent
alter table misaeng_listings drop constraint if exists misaeng_listings_status_check;
alter table misaeng_listings add constraint misaeng_listings_status_check
  check (status in ('live', 'expired', 'archived', 'deleted', 'removed'));
alter table misaeng_listings add column if not exists removed_at     timestamptz;
alter table misaeng_listings add column if not exists removed_reason text;   -- 'licensed_agent'

-- 2. License photo retention
alter table misaeng_agent_licenses add column if not exists photo_deleted_at timestamptz;
create index if not exists misaeng_agent_licenses_photo_due
  on misaeng_agent_licenses (reviewed_at) where photo_path is not null and status <> 'pending';

-- 3. License type optional
alter table misaeng_agent_licenses alter column license_type drop not null;

notify pgrst, 'reload schema';


-- ════════════════════════════════════════ agent_listing_pay.sql (Ellieo port) ════════════════════════════════════════
-- Ellieo: credits (packs, Stripe purchases, refunds), paid brokered listings and Premium (Boost) — owner 11-25 final.
-- Run AFTER agent_license.sql and agent_license_2.sql, in the SQL Editor of staging (misaeng-staging) and later
-- Ellieo's own production project. Safe to run again.
--
-- The app never talks to these tables: the Ellieo API (src/lib/ellieo/listingPlans.server.ts, credits.server.ts) calls
-- the functions below with the service role. Prices, packs, durations and the slot count live in ONE config
-- (misaeng_settings: 'listing_prices' and 'credits'; the Super Admin edits them in the ERP) and the API passes the numbers
-- in, so nothing here hard-codes a price. Errors are raised as 'misaeng:<CODE>'.
--
--   Credits     1 credit = $1 list price. Every grant is a "lot" with `remaining`:
--                 paid   — bought (Stripe) or granted as paid by staff; never expire
--                 reward — free; expire 90 days after the grant; always spent first (soonest expiry first)
--               Spending takes reward lots, then paid lots oldest first; the ledger also gets negative rows to show.
--               Balance = what is left of unexpired lots.
--   Packs       $9.99 → 10 · $19.99 → 22 · $39.99 → 46 · $79.99 → 96 (config). A Stripe purchase = one paid lot.
--   Refunds     a pack can be refunded within 7 days only if none of its credits was used (no partial refunds):
--               member requests → ERP approves → Stripe refund → the lot is reversed. Stripe refunds / disputes made
--               elsewhere reverse the lot too (webhook).
--   Regular     brokered listing for 7 / 14 / 28 days (6 / 10 / 14 credits); expires at the end; renew = buy again
--   Premium     "Boost": the 28-day regular price + 25 credits for 7 days at the top of Housing (new listing = 39),
--               shown 28 days in all from the Boost start; one extension of +7 days for 25 (max 14 days of Boost).
--               Upgrading a regular listing = the same 39, and its 28 days restart from the Boost start.
--   Slots       3 Boosts at a time (NYC). Full → a reservation, paid up front, started in order when a slot frees.
--               A new listing goes live as a regular 28-day listing while it waits (the regular part is charged then,
--               the Boost part is held); cancelling the reservation refunds the held part in full.
--   Everyone    pays the same way — the owner's own agents too (no in-house exemption, owner 11-25); staff give
--               them credits with an ERP grant instead.
--   Grants      ERP grants are lots with reason 'grant' (paid or reward, required note, staff email + time). They are
--               never refundable and never count as revenue. The Super Admin can make a negative correction
--               ('adjust', with a note), taken from what is left of that bucket.
--   Rented      the owner marks a listing rented: off the board; no refund of unused days.

-- ── Settings (the one config) ───────────────────────────────────────────────────────────────────────────────────
create table if not exists misaeng_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);
insert into misaeng_settings (key, value) values ('listing_prices', jsonb_build_object(
  'regular', jsonb_build_object('7', 6, '14', 10, '28', 14),
  'premium', jsonb_build_object('mode', 'boost', 'bundlePrice', 39, 'boostPrice', 25, 'days', 7, 'totalDays', 28,
                                'extendPrice', 25, 'maxExtensions', 1),
  'slots', 3))
on conflict (key) do nothing;
insert into misaeng_settings (key, value) values ('credits', jsonb_build_object(
  'packs', jsonb_build_array(
    jsonb_build_object('id', 'pack10', 'priceCents', 999,  'credits', 10),
    jsonb_build_object('id', 'pack22', 'priceCents', 1999, 'credits', 22),
    jsonb_build_object('id', 'pack46', 'priceCents', 3999, 'credits', 46),
    jsonb_build_object('id', 'pack96', 'priceCents', 7999, 'credits', 96)),
  'salesTaxRate', 0,
  'topUpLinkIOS', true,
  'topUpLinkAndroid', true,
  'refundDays', 7,
  'rewardDays', 90,
  'seller', jsonb_build_object('name', 'Misaeng LLC',
                               'address', '45 Rockefeller Plaza, Fl 20, New York, NY 10111, United States',
                               'email', 'info@misaeng.com')))
on conflict (key) do nothing;

-- ── Listings: plan + Boost window ───────────────────────────────────────────────────────────────────────────────
alter table misaeng_listings add column if not exists plan             text;          -- regular | premium (null = personal)
alter table misaeng_listings add column if not exists plan_days        int;
alter table misaeng_listings add column if not exists premium_start    timestamptz;
alter table misaeng_listings add column if not exists premium_end      timestamptz;
alter table misaeng_listings add column if not exists premium_extended boolean not null default false;
alter table misaeng_listings add column if not exists rented_at        timestamptz;
create index if not exists misaeng_listings_premium on misaeng_listings (premium_end) where premium_end is not null;

-- ── Credits ledger (lots + movements) ───────────────────────────────────────────────────────────────────────────
create table if not exists misaeng_credit_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  bucket      text not null check (bucket in ('paid', 'reward')),
  amount      int  not null check (amount <> 0),          -- + lot (grant / purchase / refund) · − movement (spend, expiry, reversal)
  remaining   int,                                         -- lots: what is left to spend
  expires_at  timestamptz,                                 -- reward lots: +90 days
  reason      text not null,                               -- grant | adjust | purchase | listing | premium | upgrade | extend | reserve | refund | expire | reversal
  ref_id      uuid,                                        -- listing, reservation or purchase
  note        text check (char_length(note) <= 200),
  created_by  text,                                        -- staff email (ERP grants)
  created_at  timestamptz not null default now()
);
alter table misaeng_credit_ledger add column if not exists remaining int;
create index if not exists misaeng_credit_ledger_user on misaeng_credit_ledger (user_id, created_at desc);
create index if not exists misaeng_credit_ledger_lots on misaeng_credit_ledger (user_id, bucket, created_at)
  where amount > 0 and remaining > 0;

-- ── Purchases (Stripe Checkout) ─────────────────────────────────────────────────────────────────────────────────
create table if not exists misaeng_credit_purchases (
  id                   uuid primary key default gen_random_uuid(),
  user_id              text not null,
  stripe_session_id    text not null unique,                -- idempotency: one purchase per Checkout session
  stripe_payment_intent text,
  pack_id              text not null,
  credits              int not null check (credits > 0),
  amount_cents         int not null check (amount_cents >= 0),   -- pack price (before tax)
  tax_cents            int not null default 0,
  currency             text not null default 'usd',
  status               text not null default 'paid'
                         check (status in ('paid', 'refund_requested', 'refunded', 'disputed', 'reversed')),
  lot_id               uuid references misaeng_credit_ledger (id),
  card_brand           text,
  card_last4           text,
  buyer_name           text,
  buyer_email          text,
  brokerage            text,
  receipt_url          text,                                -- Stripe's hosted receipt
  refund_reason        text check (char_length(refund_reason) <= 300),
  refund_requested_at  timestamptz,
  refund_decided_by    text,
  refund_decided_at    timestamptz,
  refund_note          text check (char_length(refund_note) <= 300),
  created_at           timestamptz not null default now()
);
create index if not exists misaeng_credit_purchases_user on misaeng_credit_purchases (user_id, created_at desc);
create index if not exists misaeng_credit_purchases_requests on misaeng_credit_purchases (refund_requested_at)
  where status = 'refund_requested';
create index if not exists misaeng_credit_purchases_intent on misaeng_credit_purchases (stripe_payment_intent);

-- ── Premium reservations ────────────────────────────────────────────────────────────────────────────────────────
create table if not exists misaeng_premium_reservations (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references misaeng_listings (id) on delete cascade,
  user_id      text not null,
  status       text not null default 'waiting' check (status in ('waiting', 'started', 'cancelled')),
  paid_used    int not null default 0,                     -- the held (refundable) part
  reward_used  int not null default 0,
  created_at   timestamptz not null default now(),
  started_at   timestamptz,
  cancelled_at timestamptz
);
create unique index if not exists misaeng_premium_reservations_one_waiting
  on misaeng_premium_reservations (listing_id) where status = 'waiting';
create index if not exists misaeng_premium_reservations_queue
  on misaeng_premium_reservations (created_at) where status = 'waiting';

-- ── Balance ─────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function misaeng_credit_balance(p_user text)
returns table (paid int, reward int) language sql stable as $$
  select
    coalesce((select sum(remaining) from misaeng_credit_ledger
               where user_id = p_user and bucket = 'paid' and amount > 0 and remaining > 0), 0)::int,
    coalesce((select sum(remaining) from misaeng_credit_ledger
               where user_id = p_user and bucket = 'reward' and amount > 0 and remaining > 0
                 and (expires_at is null or expires_at > now())), 0)::int;
$$;

-- ── Grant a lot (ERP grants, refunds of held credits, purchases) ────────────────────────────────────────────────
drop function if exists misaeng_credit_grant(text, int, text, text, uuid, text, text);
create or replace function misaeng_credit_grant(p_user text, p_amount int, p_bucket text, p_reason text,
                                               p_ref uuid, p_note text, p_by text, p_reward_days int default 90)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  if p_amount is null or p_amount <= 0 or p_amount > 100000 then raise exception 'misaeng:INVALID_AMOUNT'; end if;
  if p_bucket not in ('paid', 'reward') then raise exception 'misaeng:INVALID_BUCKET'; end if;
  insert into misaeng_credit_ledger (user_id, bucket, amount, remaining, expires_at, reason, ref_id, note, created_by)
  values (p_user, p_bucket, p_amount, p_amount,
          case when p_bucket = 'reward' then now() + make_interval(days => coalesce(p_reward_days, 90)) end,
          p_reason, p_ref, p_note, p_by)
  returning id into v_id;
  return v_id;
end $$;

-- ── Spend: reward lots first (soonest expiry), then paid lots (oldest). Caller holds the user lock. ────────────
create or replace function misaeng_credit_spend_locked(p_user text, p_amount int, p_reason text, p_ref uuid, p_note text,
                                                      out paid_used int, out reward_used int)
language plpgsql as $$
declare v_paid int; v_reward int; v_left int; g record; v_take int;
begin
  paid_used := 0; reward_used := 0;
  if p_amount is null or p_amount <= 0 then return; end if;
  select b.paid, b.reward into v_paid, v_reward from misaeng_credit_balance(p_user) b;
  if v_paid + v_reward < p_amount then raise exception 'misaeng:NOT_ENOUGH_CREDITS'; end if;
  v_left := p_amount;
  for g in select id, bucket, remaining from misaeng_credit_ledger
            where user_id = p_user and amount > 0 and remaining > 0
              and (bucket = 'paid' or expires_at is null or expires_at > now())
            order by case when bucket = 'reward' then 0 else 1 end, expires_at nulls last, created_at
            for update loop
    exit when v_left <= 0;
    v_take := least(v_left, g.remaining);
    update misaeng_credit_ledger set remaining = remaining - v_take where id = g.id;
    if g.bucket = 'reward' then reward_used := reward_used + v_take; else paid_used := paid_used + v_take; end if;
    v_left := v_left - v_take;
  end loop;
  if reward_used > 0 then
    insert into misaeng_credit_ledger (user_id, bucket, amount, reason, ref_id, note)
    values (p_user, 'reward', -reward_used, p_reason, p_ref, p_note);
  end if;
  if paid_used > 0 then
    insert into misaeng_credit_ledger (user_id, bucket, amount, reason, ref_id, note)
    values (p_user, 'paid', -paid_used, p_reason, p_ref, p_note);
  end if;
end $$;

-- ── Purchases ───────────────────────────────────────────────────────────────────────────────────────────────────
-- Webhook (checkout.session.completed): one paid lot per Checkout session. Idempotent: a repeat returns the same row.
create or replace function misaeng_credit_purchase_complete(
  p_user text, p_session text, p_intent text, p_pack text, p_credits int, p_amount_cents int, p_tax_cents int,
  p_currency text, p_card_brand text, p_last4 text, p_buyer_name text, p_buyer_email text, p_brokerage text, p_receipt_url text)
returns jsonb language plpgsql as $$
declare v_existing record; v_id uuid; v_lot uuid;
begin
  perform pg_advisory_xact_lock(hashtext('misaeng-credits-' || p_user));
  select id into v_existing from misaeng_credit_purchases where stripe_session_id = p_session;
  if found then return jsonb_build_object('purchaseId', v_existing.id, 'created', false); end if;
  insert into misaeng_credit_purchases (user_id, stripe_session_id, stripe_payment_intent, pack_id, credits, amount_cents,
                                       tax_cents, currency, card_brand, card_last4, buyer_name, buyer_email, brokerage, receipt_url)
  values (p_user, p_session, p_intent, p_pack, p_credits, p_amount_cents, coalesce(p_tax_cents, 0), coalesce(p_currency, 'usd'),
          p_card_brand, p_last4, p_buyer_name, p_buyer_email, p_brokerage, p_receipt_url)
  returning id into v_id;
  v_lot := misaeng_credit_grant(p_user, p_credits, 'paid', 'purchase', v_id, p_pack, null);
  update misaeng_credit_purchases set lot_id = v_lot where id = v_id;
  return jsonb_build_object('purchaseId', v_id, 'created', true);
end $$;

-- Refundable: paid (or a pending request), within p_days, and not one credit of the lot used.
create or replace function misaeng_credit_purchase_refundable(p_purchase uuid, p_days int) returns boolean language sql stable as $$
  select exists (
    select 1 from misaeng_credit_purchases p join misaeng_credit_ledger l on l.id = p.lot_id
     where p.id = p_purchase and p.status in ('paid', 'refund_requested')
       and p.created_at > now() - make_interval(days => p_days)
       and l.remaining = l.amount);
$$;

create or replace function misaeng_credit_refund_request(p_user text, p_purchase uuid, p_reason text, p_days int)
returns boolean language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtext('misaeng-credits-' || p_user));
  if not exists (select 1 from misaeng_credit_purchases where id = p_purchase and user_id = p_user) then
    raise exception 'misaeng:NOT_FOUND';
  end if;
  if not misaeng_credit_purchase_refundable(p_purchase, p_days) then raise exception 'misaeng:NOT_REFUNDABLE'; end if;
  update misaeng_credit_purchases set status = 'refund_requested', refund_requested_at = now(),
         refund_reason = left(p_reason, 300) where id = p_purchase;
  return true;
end $$;

-- Takes the lot back (refund approved, refunded in Stripe, or disputed). Whatever is left of the lot is removed; if
-- some was already used (a dispute), the shortfall is noted and the balance is never pushed below zero.
create or replace function misaeng_credit_purchase_reverse(p_purchase uuid, p_status text, p_note text, p_by text)
returns jsonb language plpgsql as $$
declare p record; l record; v_left int;
begin
  if p_status not in ('refunded', 'disputed', 'reversed') then raise exception 'misaeng:INVALID'; end if;
  select * into p from misaeng_credit_purchases where id = p_purchase for update;
  if not found then raise exception 'misaeng:NOT_FOUND'; end if;
  perform pg_advisory_xact_lock(hashtext('misaeng-credits-' || p.user_id));
  if p.status in ('refunded', 'reversed') then return jsonb_build_object('already', true); end if;
  select * into l from misaeng_credit_ledger where id = p.lot_id for update;
  v_left := coalesce(l.remaining, 0);
  if v_left > 0 then
    update misaeng_credit_ledger set remaining = 0 where id = l.id;
    insert into misaeng_credit_ledger (user_id, bucket, amount, reason, ref_id, note, created_by)
    values (p.user_id, 'paid', -v_left, 'reversal', p.id,
            left(coalesce(p_note, p_status) || case when v_left < p.credits then ' (' || (p.credits - v_left) || ' already used)' else '' end, 200),
            p_by);
  end if;
  update misaeng_credit_purchases set status = p_status, refund_decided_by = coalesce(p_by, refund_decided_by),
         refund_decided_at = now(), refund_note = left(coalesce(p_note, refund_note), 300) where id = p.id;
  return jsonb_build_object('removed', v_left, 'shortfall', p.credits - v_left);
end $$;

-- ERP (Super Admin): negative correction, taken from what is left of that bucket's lots (newest first), never below 0.
create or replace function misaeng_credit_adjust(p_user text, p_amount int, p_bucket text, p_note text, p_by text)
returns int language plpgsql as $$
declare v_left int; g record; v_take int; v_done int := 0;
begin
  if p_amount is null or p_amount >= 0 or p_amount < -100000 then raise exception 'misaeng:INVALID_AMOUNT'; end if;
  if p_bucket not in ('paid', 'reward') then raise exception 'misaeng:INVALID_BUCKET'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'misaeng:NOTE_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtext('misaeng-credits-' || p_user));
  v_left := -p_amount;
  for g in select id, remaining from misaeng_credit_ledger
            where user_id = p_user and bucket = p_bucket and amount > 0 and remaining > 0
              and (p_bucket = 'paid' or expires_at is null or expires_at > now())
            order by created_at desc for update loop
    exit when v_left <= 0;
    v_take := least(v_left, g.remaining);
    update misaeng_credit_ledger set remaining = remaining - v_take where id = g.id;
    v_left := v_left - v_take;
    v_done := v_done + v_take;
  end loop;
  if v_done = 0 then raise exception 'misaeng:NOTHING_TO_ADJUST'; end if;
  insert into misaeng_credit_ledger (user_id, bucket, amount, reason, note, created_by)
  values (p_user, p_bucket, -v_done, 'adjust', left(p_note, 200), p_by);
  return v_done;
end $$;

-- ERP: refuse a refund request (back to paid).
create or replace function misaeng_credit_refund_deny(p_purchase uuid, p_note text, p_by text) returns boolean language sql as $$
  update misaeng_credit_purchases set status = 'paid', refund_decided_by = p_by, refund_decided_at = now(),
         refund_note = left(p_note, 300)
   where id = p_purchase and status = 'refund_requested'
  returning true;
$$;

-- Accounting: credits still owed to members.
create or replace function misaeng_credit_liability() returns jsonb language sql stable as $$
  select jsonb_build_object(
    'paidCredits',      coalesce((select sum(remaining) from misaeng_credit_ledger where bucket = 'paid' and amount > 0 and remaining > 0), 0),
    'purchasedCredits', coalesce((select sum(l.remaining) from misaeng_credit_ledger l join misaeng_credit_purchases p on p.lot_id = l.id
                                   where l.remaining > 0), 0),
    -- What members paid for the credits they still hold (pack price per credit × credits left).
    'purchasedCents',   coalesce((select round(sum(l.remaining::numeric * p.amount_cents / p.credits)) from misaeng_credit_ledger l
                                   join misaeng_credit_purchases p on p.lot_id = l.id where l.remaining > 0), 0),
    'grantedPaidCredits', coalesce((select sum(remaining) from misaeng_credit_ledger l
                                   where bucket = 'paid' and amount > 0 and remaining > 0
                                     and not exists (select 1 from misaeng_credit_purchases p where p.lot_id = l.id)), 0),
    'rewardCredits',    coalesce((select sum(remaining) from misaeng_credit_ledger where bucket = 'reward' and amount > 0
                                   and remaining > 0 and (expires_at is null or expires_at > now())), 0),
    'members',          coalesce((select count(distinct user_id) from misaeng_credit_ledger where amount > 0 and remaining > 0), 0),
    'salesCents',       coalesce((select sum(amount_cents) from misaeng_credit_purchases where status in ('paid', 'refund_requested')), 0),
    'refundedCents',    coalesce((select sum(amount_cents) from misaeng_credit_purchases where status in ('refunded', 'disputed', 'reversed')), 0),
    'pendingRefunds',   coalesce((select count(*) from misaeng_credit_purchases where status = 'refund_requested'), 0));
$$;

-- ── Boost slots ─────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function misaeng_premium_active_count() returns int language sql stable as $$
  select count(*)::int from misaeng_listings
   where status = 'live' and plan = 'premium' and premium_end > now() and expires_at > now();
$$;

-- Starts waiting reservations in order while slots are free. Returns how many started.
drop function if exists misaeng_premium_promote();
create or replace function misaeng_premium_promote(p_slots int, p_premium_days int, p_total_days int)
returns int language plpgsql as $$
declare r record; v_started int := 0;
begin
  perform pg_advisory_xact_lock(hashtext('misaeng-premium-slots'));
  for r in select * from misaeng_premium_reservations where status = 'waiting' order by created_at for update loop
    exit when misaeng_premium_active_count() >= p_slots;
    update misaeng_listings
       set status = 'live', plan = 'premium', premium_start = now(), premium_end = now() + make_interval(days => p_premium_days),
           premium_extended = false, expires_at = now() + make_interval(days => p_total_days)
     where id = r.listing_id and status in ('live', 'expired');
    if found then
      update misaeng_premium_reservations set status = 'started', started_at = now() where id = r.id;
      v_started := v_started + 1;
    else
      -- The listing is gone (rented, deleted): refund the held credits.
      perform misaeng_premium_cancel(r.user_id, r.listing_id);
    end if;
  end loop;
  return v_started;
end $$;

-- ── One purchase = spend + listing change, atomically ──────────────────────────────────────────────────────────
-- p_action: regular (p_days, new or renew) · premium (new or upgrade; p_price = regular total + boost) · extend ·
-- reserve (slots full: p_price held for the Boost, p_now_price charged now for a new listing's regular 28 days).
drop function if exists misaeng_listing_purchase(text, uuid, text, int, int);
drop function if exists misaeng_listing_purchase(text, uuid, text, int, int, int[], int, int, int);
create or replace function misaeng_listing_purchase(p_user text, p_listing uuid, p_action text, p_days int, p_price int,
                                                   p_regular_days int[], p_slots int, p_premium_days int, p_total_days int,
                                                   p_now_price int default 0)
returns jsonb language plpgsql as $$
declare l record; v_spent record; v_now record; v_res uuid; v_live boolean;
begin
  perform pg_advisory_xact_lock(hashtext('misaeng-credits-' || p_user));
  if p_action in ('premium', 'extend', 'reserve') then perform pg_advisory_xact_lock(hashtext('misaeng-premium-slots')); end if;
  select * into l from misaeng_listings where id = p_listing and owner_id = p_user for update;
  if not found then raise exception 'misaeng:NOT_FOUND'; end if;
  if not l.brokered then raise exception 'misaeng:NOT_BROKERED'; end if;
  if l.status not in ('live', 'expired') then raise exception 'misaeng:NOT_AVAILABLE'; end if;
  v_live := l.status = 'live' and l.expires_at > now();

  if p_action = 'regular' then
    if not (p_days = any (p_regular_days)) then raise exception 'misaeng:INVALID_PLAN'; end if;
    if l.plan = 'premium' and l.premium_end > now() and v_live then raise exception 'misaeng:PREMIUM_ACTIVE'; end if;
    select * into v_spent from misaeng_credit_spend_locked(p_user, p_price, 'listing', p_listing, p_days || ' days');
    update misaeng_listings set status = 'live', plan = 'regular', plan_days = p_days,
           premium_start = null, premium_end = null, premium_extended = false,
           expires_at = now() + make_interval(days => p_days) where id = p_listing;
  elsif p_action = 'premium' then
    if l.plan = 'premium' and l.premium_end > now() and v_live then raise exception 'misaeng:PREMIUM_ACTIVE'; end if;
    if exists (select 1 from misaeng_premium_reservations where listing_id = p_listing and status = 'waiting') then
      raise exception 'misaeng:ALREADY_RESERVED';
    end if;
    if misaeng_premium_active_count() >= p_slots then raise exception 'misaeng:SLOTS_FULL'; end if;
    select * into v_spent from misaeng_credit_spend_locked(p_user, p_price,
      case when l.plan = 'regular' and v_live then 'upgrade' else 'premium' end, p_listing, null);
    update misaeng_listings set status = 'live', plan = 'premium', premium_start = now(),
           premium_end = now() + make_interval(days => p_premium_days), premium_extended = false,
           expires_at = now() + make_interval(days => p_total_days)
     where id = p_listing;
  elsif p_action = 'extend' then
    if not (l.plan = 'premium' and l.premium_end > now() and v_live) then raise exception 'misaeng:NOT_PREMIUM'; end if;
    if l.premium_extended then raise exception 'misaeng:ALREADY_EXTENDED'; end if;
    select * into v_spent from misaeng_credit_spend_locked(p_user, p_price, 'extend', p_listing, '+' || p_premium_days || ' days Boost');
    update misaeng_listings set premium_end = least(premium_end + make_interval(days => p_premium_days), expires_at),
           premium_extended = true where id = p_listing;
  elsif p_action = 'reserve' then
    if exists (select 1 from misaeng_premium_reservations where listing_id = p_listing and status = 'waiting') then
      raise exception 'misaeng:ALREADY_RESERVED';
    end if;
    if misaeng_premium_active_count() < p_slots then raise exception 'misaeng:SLOT_OPEN'; end if;
    if (select b.paid + b.reward from misaeng_credit_balance(p_user) b) < p_price + coalesce(p_now_price, 0) then
      raise exception 'misaeng:NOT_ENOUGH_CREDITS';
    end if;
    -- A new listing (or an expired one) goes live as a regular 28-day listing while it waits.
    if coalesce(p_now_price, 0) > 0 then
      select * into v_now from misaeng_credit_spend_locked(p_user, p_now_price, 'listing', p_listing, p_total_days || ' days');
      update misaeng_listings set status = 'live', plan = 'regular', plan_days = p_total_days,
             expires_at = now() + make_interval(days => p_total_days) where id = p_listing;
    end if;
    select * into v_spent from misaeng_credit_spend_locked(p_user, p_price, 'reserve', p_listing, 'Boost reservation');
    insert into misaeng_premium_reservations (listing_id, user_id, paid_used, reward_used)
    values (p_listing, p_user, v_spent.paid_used, v_spent.reward_used) returning id into v_res;
  else
    raise exception 'misaeng:INVALID_PLAN';
  end if;
  return jsonb_build_object('ok', true, 'reservation', v_res);
end $$;

-- Cancel a waiting reservation: the held credits come back in full (paid as paid, reward as a new reward lot).
create or replace function misaeng_premium_cancel(p_user text, p_listing uuid) returns boolean language plpgsql as $$
declare r record;
begin
  perform pg_advisory_xact_lock(hashtext('misaeng-credits-' || p_user));
  select * into r from misaeng_premium_reservations
   where listing_id = p_listing and user_id = p_user and status = 'waiting' for update;
  if not found then return false; end if;
  update misaeng_premium_reservations set status = 'cancelled', cancelled_at = now() where id = r.id;
  if r.paid_used > 0 then perform misaeng_credit_grant(p_user, r.paid_used, 'paid', 'refund', r.id, 'Boost reservation cancelled', null); end if;
  if r.reward_used > 0 then perform misaeng_credit_grant(p_user, r.reward_used, 'reward', 'refund', r.id, 'Boost reservation cancelled', null); end if;
  return true;
end $$;

-- ── Daily (with the retention job): expired reward lots get an 'expire' row; reservations start ─────────────────
create or replace function misaeng_credits_daily() returns void language plpgsql as $$
declare g record;
begin
  for g in select id, user_id, remaining from misaeng_credit_ledger
            where bucket = 'reward' and amount > 0 and remaining > 0 and expires_at <= now() for update loop
    update misaeng_credit_ledger set remaining = 0 where id = g.id;
    insert into misaeng_credit_ledger (user_id, bucket, amount, reason, ref_id, note)
    values (g.user_id, 'reward', -g.remaining, 'expire', g.id, 'Reward credits expired');
  end loop;
  perform misaeng_premium_promote(
    coalesce((select (value->>'slots')::int from misaeng_settings where key = 'listing_prices'), 3),
    coalesce((select (value->'premium'->>'days')::int from misaeng_settings where key = 'listing_prices'), 7),
    coalesce((select (value->'premium'->>'totalDays')::int from misaeng_settings where key = 'listing_prices'), 28));
end $$;

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('misaeng-credits-daily', '20 9 * * *', 'select misaeng_credits_daily()');  -- 04:20 ET
  end if;
end $$;

-- ── Access ──────────────────────────────────────────────────────────────────────────────────────────────────────
alter table misaeng_settings             enable row level security;
alter table misaeng_credit_ledger        enable row level security;
alter table misaeng_credit_purchases     enable row level security;
alter table misaeng_premium_reservations enable row level security;
revoke all on misaeng_settings, misaeng_credit_ledger, misaeng_credit_purchases, misaeng_premium_reservations from anon, authenticated;
grant select, insert, update, delete on misaeng_settings, misaeng_credit_ledger, misaeng_credit_purchases,
  misaeng_premium_reservations to service_role;

do $$
declare f text;
begin
  foreach f in array array[
    'misaeng_credit_balance(text)', 'misaeng_credit_grant(text, int, text, text, uuid, text, text, int)',
    'misaeng_credit_spend_locked(text, int, text, uuid, text)',
    'misaeng_credit_purchase_complete(text, text, text, text, int, int, int, text, text, text, text, text, text, text)',
    'misaeng_credit_purchase_refundable(uuid, int)', 'misaeng_credit_refund_request(text, uuid, text, int)',
    'misaeng_credit_purchase_reverse(uuid, text, text, text)', 'misaeng_credit_refund_deny(uuid, text, text)',
    'misaeng_credit_adjust(text, int, text, text, text)',
    'misaeng_credit_liability()', 'misaeng_premium_active_count()', 'misaeng_premium_promote(int, int, int)',
    'misaeng_listing_purchase(text, uuid, text, int, int, int[], int, int, int, int)',
    'misaeng_premium_cancel(text, uuid)', 'misaeng_credits_daily()'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

notify pgrst, 'reload schema';


-- ════════════════════════════════════════ credits_paid_only.sql (Ellieo port) ════════════════════════════════════════
-- Ellieo credits, part 2 (owner 11-25): credits only from payment, $1 = 10 credits, in-house accounts, discounts and
-- bonuses, App Store purchases. Run AFTER agent_listing_pay.sql, in the SQL Editor of staging (misaeng-staging) and
-- later Ellieo's own production project. Safe to run again.
--
--   Separate     Ellieo credits never mix with Misaeng points (other tables; the Ellieo server turns points off).
--   Unit         $1 = 10 credits. Regular 7 / 14 / 28 days = 60 / 100 / 140 · Boost +250 per 7 days (new Premium 390)
--                · one extension +250. Packs $9.99 / $19.99 / $39.99 / $79.99 → 100 / 220 / 460 / 960. The first run
--                multiplies every existing number by 10 (flag misaeng_settings 'credits_unit').
--   Paid only    A member gets credits only by paying: every paid lot points at its purchase (Stripe or App Store) and
--                keeps what one credit cost (unit_cents = cents paid / credits incl. bonus). No reward credits, no free
--                grants; credits held for a Boost reservation go back to the lots they came from. Spending writes the
--                value of what was spent (value_cents) → revenue; what is left × unit_cents → liability.
--   Refunds      a refund / chargeback / App Store refund takes the purchase's credits back. If some were used, the rest
--                comes from the member's other paid credits, and what is still missing stays as a debt that the next
--                purchase pays first (no spending while the balance is below zero).
--   Corrections  Super Admin only, always negative and always on one purchase.
--   In-house     members with a verified email on the in-house domain list (default misaeng.com, ERP) and not on the
--                exception list: staff credits only ($0, never refundable, never transferable, never revenue), no
--                purchases. Every month (America/New_York) the daily job replaces what is left of last month's staff
--                credits with this month's amount (default 1000). ERP can top up (Super Admin, note required).
--                Removing someone from in-house zeroes their staff credits and deletes all their listings.
--                In-house listings hold at most 1 of the 3 Boost spots (others wait in the reservation queue).
--   Promotions   pack_discount (cheaper pack on the web checkout), purchase_bonus (+% credits on a purchase, web and App
--                Store), listing_discount (fewer credits for a listing plan); period, target (all / new / chosen
--                members), per-member and total limits. Bonus credits carry the purchase's unit value.

-- ── 1. One-time switch to $1 = 10 credits ───────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from misaeng_settings where key = 'credits_unit') then
    update misaeng_credit_ledger set amount = amount * 10, remaining = remaining * 10;
    update misaeng_credit_purchases set credits = credits * 10;
    update misaeng_premium_reservations set paid_used = paid_used * 10, reward_used = reward_used * 10;
    insert into misaeng_settings (key, value) values ('listing_prices', '{}'::jsonb) on conflict (key) do nothing;
    update misaeng_settings set updated_at = now(), updated_by = 'credits_paid_only.sql', value = jsonb_build_object(
      'regular', jsonb_build_object('7', 60, '14', 100, '28', 140),
      'premium', jsonb_build_object('mode', 'boost', 'bundlePrice', 390, 'boostPrice', 250, 'days', 7, 'totalDays', 28,
                                    'extendPrice', 250, 'maxExtensions', 1),
      'slots', 3)
     where key = 'listing_prices';
    insert into misaeng_settings (key, value) values ('credits', '{}'::jsonb) on conflict (key) do nothing;
    update misaeng_settings set updated_at = now(), updated_by = 'credits_paid_only.sql',
           value = (value - 'rewardDays') || jsonb_build_object(
             'packs', jsonb_build_array(
               jsonb_build_object('id', 'pack100', 'priceCents', 999,  'credits', 100, 'appleProductId', 'com.misaeng.nyc.credits.100'),
               jsonb_build_object('id', 'pack220', 'priceCents', 1999, 'credits', 220, 'appleProductId', 'com.misaeng.nyc.credits.220'),
               jsonb_build_object('id', 'pack460', 'priceCents', 3999, 'credits', 460, 'appleProductId', 'com.misaeng.nyc.credits.460'),
               jsonb_build_object('id', 'pack960', 'priceCents', 7999, 'credits', 960, 'appleProductId', 'com.misaeng.nyc.credits.960')))
     where key = 'credits';
    insert into misaeng_settings (key, value, updated_by) values ('credits_unit', jsonb_build_object('perDollar', 10), 'credits_paid_only.sql');
  end if;
end $$;

insert into misaeng_settings (key, value) values ('in_house', jsonb_build_object(
  'domains', jsonb_build_array('misaeng.com'),
  'exceptions', jsonb_build_array('simon+misaeng-qa@misaeng.com'),
  'monthlyCredits', 1000,
  'boostSlots', 1))
on conflict (key) do nothing;

-- ── 2. Ledger: staff bucket, purchase link, unit value ──────────────────────────────────────────────────────────
alter table misaeng_credit_ledger add column if not exists purchase_id uuid references misaeng_credit_purchases (id);
alter table misaeng_credit_ledger add column if not exists unit_cents  numeric(12, 4);   -- lots: what one credit cost (staff = 0)
alter table misaeng_credit_ledger add column if not exists value_cents numeric(14, 4);   -- movements: value of the credits moved
alter table misaeng_credit_ledger add column if not exists lot_id      uuid;             -- returns / clean-ups: the lot touched
alter table misaeng_credit_ledger drop constraint if exists misaeng_credit_ledger_bucket_check;
alter table misaeng_credit_ledger add constraint misaeng_credit_ledger_bucket_check
  check (bucket in ('paid', 'staff', 'reward'));                                        -- 'reward' = history only
create index if not exists misaeng_credit_ledger_purchase on misaeng_credit_ledger (purchase_id) where purchase_id is not null;
create index if not exists misaeng_credit_ledger_debt on misaeng_credit_ledger (user_id) where reason = 'debt' and remaining > 0;

-- Purchase lots that exist already: link them to their purchase.
update misaeng_credit_ledger l set purchase_id = p.id
  from misaeng_credit_purchases p where p.lot_id = l.id and l.purchase_id is null;

-- Clean-up: credits that were not paid for (reward lots, ERP grants) are taken away, with a ledger row each.
do $$
declare g record;
begin
  for g in select id, user_id, bucket, remaining from misaeng_credit_ledger
            where amount > 0 and remaining > 0 and bucket in ('paid', 'reward') and purchase_id is null
              and not (bucket = 'paid' and reason = 'refund') for update loop
    update misaeng_credit_ledger set remaining = 0 where id = g.id;
    insert into misaeng_credit_ledger (user_id, bucket, amount, reason, lot_id, note, value_cents)
    values (g.user_id, g.bucket, -g.remaining, 'cleanup', g.id, 'Credits are now only from payment', 0);
  end loop;
end $$;

-- ── 3. Purchases: App Store, bonus, discount ────────────────────────────────────────────────────────────────────
alter table misaeng_credit_purchases alter column stripe_session_id drop not null;
alter table misaeng_credit_purchases add column if not exists provider text not null default 'stripe';
alter table misaeng_credit_purchases drop constraint if exists misaeng_credit_purchases_provider_check;
alter table misaeng_credit_purchases add constraint misaeng_credit_purchases_provider_check check (provider in ('stripe', 'apple'));
alter table misaeng_credit_purchases add column if not exists apple_transaction_id          text;
alter table misaeng_credit_purchases add column if not exists apple_original_transaction_id text;
alter table misaeng_credit_purchases add column if not exists apple_environment             text;
alter table misaeng_credit_purchases add column if not exists product_id                    text;
alter table misaeng_credit_purchases add column if not exists base_credits                  int;
alter table misaeng_credit_purchases add column if not exists bonus_credits                 int not null default 0;
alter table misaeng_credit_purchases add column if not exists list_cents                    int;    -- pack price before discount
alter table misaeng_credit_purchases add column if not exists discount_cents                int not null default 0;
alter table misaeng_credit_purchases add column if not exists promotion_ids                 uuid[] not null default '{}';
create unique index if not exists misaeng_credit_purchases_apple_tx on misaeng_credit_purchases (apple_transaction_id)
  where apple_transaction_id is not null;
update misaeng_credit_purchases set base_credits = credits where base_credits is null;
update misaeng_credit_purchases set list_cents = amount_cents where list_cents is null;
update misaeng_credit_ledger l set unit_cents = p.amount_cents::numeric / nullif(p.credits, 0)
  from misaeng_credit_purchases p where l.purchase_id = p.id and l.amount > 0 and l.unit_cents is null;

-- Rules for new rows (old history rows are left as they are: NOT VALID).
alter table misaeng_credit_ledger drop constraint if exists misaeng_credit_ledger_paid_lot_has_purchase;
alter table misaeng_credit_ledger add constraint misaeng_credit_ledger_paid_lot_has_purchase
  check (bucket <> 'paid' or amount < 0 or remaining is null or purchase_id is not null or reason = 'refund') not valid;
-- ('refund' = paid credits given back by the first version for a cancelled reservation; no new ones are made.)
alter table misaeng_credit_ledger drop constraint if exists misaeng_credit_ledger_no_new_reward;
alter table misaeng_credit_ledger add constraint misaeng_credit_ledger_no_new_reward
  check (bucket <> 'reward' or remaining is null or remaining = 0) not valid;

-- ── 4. Reservations remember which lots paid for them ──────────────────────────────────────────────────────────
alter table misaeng_premium_reservations add column if not exists staff_used int not null default 0;
alter table misaeng_premium_reservations add column if not exists lots jsonb not null default '[]'::jsonb;
-- Boost on a listing that is already up: only the Boost part was held; starting it keeps the listing's own end date.
alter table misaeng_premium_reservations add column if not exists boost_only boolean not null default false;

-- Reservations waiting from the first version don't know their lots: their paid part is pinned to the member's newest
-- purchase lot so a cancel gives it back there (their reward part is gone with reward credits).
do $$
declare r record; v_lot uuid;
begin
  for r in select id, user_id, paid_used from misaeng_premium_reservations
            where status = 'waiting' and lots = '[]'::jsonb and paid_used > 0 loop
    select id into v_lot from misaeng_credit_ledger
     where user_id = r.user_id and bucket = 'paid' and amount > 0 and purchase_id is not null
     order by created_at desc limit 1;
    if v_lot is not null then
      update misaeng_premium_reservations
         set lots = jsonb_build_array(jsonb_build_object('lot', v_lot, 'n', r.paid_used, 'bucket', 'paid')) where id = r.id;
    end if;
  end loop;
end $$;

-- ── 5. In-house accounts ────────────────────────────────────────────────────────────────────────────────────────
create table if not exists misaeng_in_house (
  user_id          text primary key,
  email            text not null,
  status           text not null default 'active' check (status in ('active', 'removed')),
  source           text not null default 'domain' check (source in ('domain', 'erp')),
  last_grant_month text,                                  -- 'YYYY-MM' (America/New_York)
  created_at       timestamptz not null default now(),
  removed_at       timestamptz,
  removed_by       text,
  removed_note     text check (char_length(removed_note) <= 200)
);

-- ── 6. Promotions ───────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists misaeng_promotions (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('pack_discount', 'purchase_bonus', 'listing_discount')),
  title           text not null check (char_length(title) between 2 and 80),
  code            text unique check (code ~ '^[A-Z0-9_-]{3,24}$'),   -- null = applied automatically
  percent         int  not null check (percent between 1 and 90),
  pack_ids        text[] not null default '{}',                     -- empty = every pack
  starts_at       timestamptz not null default now(),
  ends_at         timestamptz,
  target          text not null default 'all' check (target in ('all', 'new', 'users')),
  user_ids        text[] not null default '{}',
  per_user_limit  int check (per_user_limit between 1 and 1000),
  total_limit     int check (total_limit between 1 and 1000000),
  active          boolean not null default true,
  note            text check (char_length(note) <= 200),
  created_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create table if not exists misaeng_promotion_uses (
  id            uuid primary key default gen_random_uuid(),
  promotion_id  uuid not null references misaeng_promotions (id) on delete cascade,
  user_id       text not null,
  ref_id        uuid,                                       -- purchase or listing
  created_at    timestamptz not null default now()
);
create index if not exists misaeng_promotion_uses_promo on misaeng_promotion_uses (promotion_id, user_id);

-- ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
-- Functions
-- ════════════════════════════════════════════════════════════════════════════════════════════════════════════════

create or replace function misaeng_ny_month() returns text language sql stable as $$
  select to_char(now() at time zone 'America/New_York', 'YYYY-MM');
$$;

create or replace function misaeng_in_house_active(p_user text) returns boolean language sql stable as $$
  select exists (select 1 from misaeng_in_house where user_id = p_user and status = 'active');
$$;

-- Balance: paid lots (minus debt) and staff lots.
drop function if exists misaeng_credit_balance(text);
create or replace function misaeng_credit_balance(p_user text)
returns table (paid int, staff int, debt int) language sql stable as $$
  select
    (coalesce((select sum(remaining) from misaeng_credit_ledger
                where user_id = p_user and bucket = 'paid' and amount > 0 and remaining > 0), 0)
     - coalesce((select sum(remaining) from misaeng_credit_ledger
                where user_id = p_user and reason = 'debt' and remaining > 0), 0))::int,
    coalesce((select sum(remaining) from misaeng_credit_ledger
               where user_id = p_user and bucket = 'staff' and amount > 0 and remaining > 0), 0)::int,
    coalesce((select sum(remaining) from misaeng_credit_ledger
               where user_id = p_user and reason = 'debt' and remaining > 0), 0)::int;
$$;

-- No more free grants.
drop function if exists misaeng_credit_grant(text, int, text, text, uuid, text, text);
drop function if exists misaeng_credit_grant(text, int, text, text, uuid, text, text, int);

-- Spend: staff lots first, then paid lots (oldest). Caller holds the user lock. Returns the lots used so a
-- reservation can give them back. The paid movement row carries the value of what was spent.
drop function if exists misaeng_credit_spend_locked(text, int, text, uuid, text);
create or replace function misaeng_credit_spend_locked(p_user text, p_amount int, p_reason text, p_ref uuid, p_note text,
                                                      out paid_used int, out staff_used int, out lots jsonb)
language plpgsql as $$
declare b record; v_left int; g record; v_take int; v_value numeric := 0;
begin
  paid_used := 0; staff_used := 0; lots := '[]'::jsonb;
  if p_amount is null or p_amount <= 0 then return; end if;
  select * into b from misaeng_credit_balance(p_user);
  -- b.paid is net of debt: below zero → no spending at all; staff lots go first, so paid lots are never used beyond it.
  if b.paid < 0 or b.paid + b.staff < p_amount then raise exception 'misaeng:NOT_ENOUGH_CREDITS'; end if;
  v_left := p_amount;
  for g in select id, bucket, remaining, coalesce(unit_cents, 0) as unit from misaeng_credit_ledger
            where user_id = p_user and amount > 0 and remaining > 0 and bucket in ('staff', 'paid')
            order by case when bucket = 'staff' then 0 else 1 end, created_at
            for update loop
    exit when v_left <= 0;
    v_take := least(v_left, g.remaining);
    update misaeng_credit_ledger set remaining = remaining - v_take where id = g.id;
    lots := lots || jsonb_build_array(jsonb_build_object('lot', g.id, 'n', v_take, 'bucket', g.bucket));
    if g.bucket = 'staff' then staff_used := staff_used + v_take;
    else paid_used := paid_used + v_take; v_value := v_value + v_take * g.unit; end if;
    v_left := v_left - v_take;
  end loop;
  if v_left > 0 then raise exception 'misaeng:NOT_ENOUGH_CREDITS'; end if;
  if staff_used > 0 then
    insert into misaeng_credit_ledger (user_id, bucket, amount, reason, ref_id, note, value_cents)
    values (p_user, 'staff', -staff_used, p_reason, p_ref, p_note, 0);
  end if;
  if paid_used > 0 then
    insert into misaeng_credit_ledger (user_id, bucket, amount, reason, ref_id, note, value_cents)
    values (p_user, 'paid', -paid_used, p_reason, p_ref, p_note, round(v_value, 4));
  end if;
end $$;

-- Gives held credits back to the lots they came from (Boost reservation cancelled). Staff credits come back only
-- while the member is still in-house and the lot is this month's.
create or replace function misaeng_credit_return_lots(p_user text, p_lots jsonb, p_ref uuid, p_note text)
returns int language plpgsql as $$
declare e jsonb; l record; v_n int; v_back int := 0;
begin
  for e in select * from jsonb_array_elements(coalesce(p_lots, '[]'::jsonb)) loop
    v_n := (e->>'n')::int;
    select * into l from misaeng_credit_ledger where id = (e->>'lot')::uuid and user_id = p_user for update;
    continue when not found or v_n is null or v_n <= 0;
    -- Staff credits that expired (new month) or were removed don't come back; neither do the credits of a purchase
    -- that was refunded or charged back since.
    if l.bucket = 'staff' and (not misaeng_in_house_active(p_user) or exists (
         select 1 from misaeng_credit_ledger x where x.lot_id = l.id and x.reason in ('staff_expire', 'staff_removed'))) then
      continue;
    end if;
    if l.bucket = 'paid' and exists (select 1 from misaeng_credit_purchases c
                                      where c.id = l.purchase_id and c.status in ('refunded', 'disputed', 'reversed')) then
      continue;
    end if;
    update misaeng_credit_ledger set remaining = remaining + v_n where id = l.id;
    insert into misaeng_credit_ledger (user_id, bucket, amount, reason, ref_id, lot_id, note, value_cents)
    values (p_user, l.bucket, v_n, 'return', p_ref, l.id, left(p_note, 200), round(v_n * coalesce(l.unit_cents, 0), 4));
    v_back := v_back + v_n;
  end loop;
  return v_back;
end $$;

-- Takes up to p_amount paid credits away (newest lots first, optionally only from one lot). Returns what was taken.
create or replace function misaeng_credit_take_paid(p_user text, p_amount int, p_only_lot uuid, p_reason text, p_ref uuid,
                                                   p_note text, p_by text)
returns int language plpgsql as $$
declare g record; v_left int := p_amount; v_take int; v_done int := 0; v_value numeric := 0;
begin
  if p_amount is null or p_amount <= 0 then return 0; end if;
  for g in select id, remaining, coalesce(unit_cents, 0) as unit from misaeng_credit_ledger
            where user_id = p_user and bucket = 'paid' and amount > 0 and remaining > 0
              and (p_only_lot is null or id = p_only_lot)
            order by created_at desc for update loop
    exit when v_left <= 0;
    v_take := least(v_left, g.remaining);
    update misaeng_credit_ledger set remaining = remaining - v_take where id = g.id;
    v_left := v_left - v_take; v_done := v_done + v_take; v_value := v_value + v_take * g.unit;
  end loop;
  if v_done > 0 then
    insert into misaeng_credit_ledger (user_id, bucket, amount, reason, ref_id, note, created_by, value_cents)
    values (p_user, 'paid', -v_done, p_reason, p_ref, left(p_note, 200), p_by, round(v_value, 4));
  end if;
  return v_done;
end $$;

-- ── Purchases ───────────────────────────────────────────────────────────────────────────────────────────────────
-- One purchase (Stripe Checkout or App Store transaction) = one paid lot. Idempotent on the Stripe session / the
-- App Store transaction id. Pays an open debt first. p: { user, provider, stripeSession, stripeIntent, appleTransaction,
-- appleOriginalTransaction, appleEnvironment, productId, packId, baseCredits, bonusCredits, amountCents, taxCents,
-- listCents, discountCents, currency, cardBrand, last4, buyerName, buyerEmail, brokerage, receiptUrl, promotionIds[] }
drop function if exists misaeng_credit_purchase_complete(text, text, text, text, int, int, int, text, text, text, text, text, text, text);
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
  if coalesce(p->>'provider', 'stripe') not in ('stripe', 'apple') then raise exception 'misaeng:INVALID'; end if;
  perform pg_advisory_xact_lock(hashtext('misaeng-credits-' || v_user));
  if p->>'stripeSession' is not null then
    select id into v_existing from misaeng_credit_purchases where stripe_session_id = p->>'stripeSession';
  elsif p->>'appleTransaction' is not null then
    select id into v_existing from misaeng_credit_purchases where apple_transaction_id = p->>'appleTransaction';
  else
    raise exception 'misaeng:INVALID';
  end if;
  if v_existing is not null then return jsonb_build_object('purchaseId', v_existing, 'created', false); end if;
  v_total := v_base + v_bonus;
  insert into misaeng_credit_purchases (user_id, provider, stripe_session_id, stripe_payment_intent, apple_transaction_id,
         apple_original_transaction_id, apple_environment, product_id, pack_id, credits, base_credits, bonus_credits,
         amount_cents, tax_cents, list_cents, discount_cents, currency, card_brand, card_last4, buyer_name, buyer_email,
         brokerage, receipt_url, promotion_ids)
  values (v_user, coalesce(p->>'provider', 'stripe'), p->>'stripeSession', p->>'stripeIntent', p->>'appleTransaction',
          p->>'appleOriginalTransaction', p->>'appleEnvironment', p->>'productId', coalesce(p->>'packId', 'pack'), v_total,
          v_base, v_bonus, v_cents, coalesce((p->>'taxCents')::int, 0), coalesce((p->>'listCents')::int, v_cents),
          coalesce((p->>'discountCents')::int, 0), coalesce(p->>'currency', 'usd'), p->>'cardBrand', p->>'last4',
          p->>'buyerName', p->>'buyerEmail', p->>'brokerage', p->>'receiptUrl', v_promos)
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

-- Refundable: paid (or a pending request), within p_days, and not one credit of the lot used.
create or replace function misaeng_credit_purchase_refundable(p_purchase uuid, p_days int) returns boolean language sql stable as $$
  select exists (
    select 1 from misaeng_credit_purchases p join misaeng_credit_ledger l on l.id = p.lot_id
     where p.id = p_purchase and p.status in ('paid', 'refund_requested') and p.provider = 'stripe'
       and p.created_at > now() - make_interval(days => p_days)
       and l.remaining = l.amount);
$$;

-- Takes a purchase's credits back (refund approved, refunded in Stripe or by Apple, chargeback). Whatever is left of its
-- lot goes first; credits already used come out of the member's other paid credits; anything still missing becomes a
-- debt the next purchase pays first. Idempotent.
create or replace function misaeng_credit_purchase_reverse(p_purchase uuid, p_status text, p_note text, p_by text)
returns jsonb language plpgsql as $$
declare p record; v_lot int; v_other int := 0; v_short int; v_debt int := 0;
begin
  if p_status not in ('refunded', 'disputed', 'reversed') then raise exception 'misaeng:INVALID'; end if;
  select * into p from misaeng_credit_purchases where id = p_purchase for update;
  if not found then raise exception 'misaeng:NOT_FOUND'; end if;
  perform pg_advisory_xact_lock(hashtext('misaeng-credits-' || p.user_id));
  if p.status in ('refunded', 'reversed', 'disputed') then return jsonb_build_object('already', true); end if;
  v_lot := misaeng_credit_take_paid(p.user_id, p.credits, p.lot_id, 'reversal', p.id, coalesce(p_note, p_status), p_by);
  v_short := p.credits - v_lot;
  if v_short > 0 then
    v_other := misaeng_credit_take_paid(p.user_id, v_short, null, 'reversal', p.id,
                                       'Used credits of a refunded purchase', p_by);
    v_debt := v_short - v_other;
    if v_debt > 0 then
      insert into misaeng_credit_ledger (user_id, bucket, amount, remaining, reason, ref_id, purchase_id, note, created_by, value_cents)
      values (p.user_id, 'paid', -v_debt, v_debt, 'debt', p.id, p.id, 'Owed after a refund of used credits', p_by,
              round(v_debt * p.amount_cents::numeric / nullif(p.credits, 0), 4));
    end if;
  end if;
  update misaeng_credit_purchases set status = p_status, refund_decided_by = coalesce(p_by, refund_decided_by),
         refund_decided_at = now(), refund_note = left(coalesce(p_note, refund_note), 300) where id = p.id;
  return jsonb_build_object('removed', v_lot + v_other, 'fromPurchase', v_lot, 'fromOther', v_other, 'debt', v_debt);
end $$;

-- Super Admin correction: negative only, always on one purchase's lot, never below zero.
drop function if exists misaeng_credit_adjust(text, int, text, text, text);
create or replace function misaeng_credit_adjust(p_purchase uuid, p_amount int, p_note text, p_by text)
returns int language plpgsql as $$
declare p record; v_done int;
begin
  if p_amount is null or p_amount >= 0 or p_amount < -1000000 then raise exception 'misaeng:INVALID_AMOUNT'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'misaeng:NOTE_REQUIRED'; end if;
  select * into p from misaeng_credit_purchases where id = p_purchase;
  if not found then raise exception 'misaeng:NOT_FOUND'; end if;
  perform pg_advisory_xact_lock(hashtext('misaeng-credits-' || p.user_id));
  v_done := misaeng_credit_take_paid(p.user_id, -p_amount, p.lot_id, 'adjust', p.id, p_note, p_by);
  if v_done = 0 then raise exception 'misaeng:NOTHING_TO_ADJUST'; end if;
  return v_done;
end $$;

-- ── In-house ────────────────────────────────────────────────────────────────────────────────────────────────────
-- This month's staff credits: what is left of earlier staff lots expires, then a new lot. Caller holds the user lock.
create or replace function misaeng_staff_monthly_locked(p_user text, p_amount int) returns boolean language plpgsql as $$
declare g record; v_month text := misaeng_ny_month();
begin
  if (select last_grant_month from misaeng_in_house where user_id = p_user) = v_month then return false; end if;
  for g in select id, remaining from misaeng_credit_ledger
            where user_id = p_user and bucket = 'staff' and amount > 0 and remaining > 0 for update loop
    update misaeng_credit_ledger set remaining = 0 where id = g.id;
    insert into misaeng_credit_ledger (user_id, bucket, amount, reason, lot_id, note, value_cents)
    values (p_user, 'staff', -g.remaining, 'staff_expire', g.id, 'Last month''s staff credits', 0);
  end loop;
  if coalesce(p_amount, 0) > 0 then
    insert into misaeng_credit_ledger (user_id, bucket, amount, remaining, reason, note, unit_cents)
    values (p_user, 'staff', p_amount, p_amount, 'staff_grant', v_month, 0);
  end if;
  update misaeng_in_house set last_grant_month = v_month where user_id = p_user;
  return true;
end $$;

-- The server calls this when a member qualifies (verified email on the domain list, not an exception). A member
-- removed by staff stays removed. Gives this month's credits right away.
create or replace function misaeng_in_house_sync(p_user text, p_email text) returns text language plpgsql as $$
declare v_status text;
begin
  perform pg_advisory_xact_lock(hashtext('misaeng-credits-' || p_user));
  insert into misaeng_in_house (user_id, email) values (p_user, lower(p_email)) on conflict (user_id) do nothing;
  select status into v_status from misaeng_in_house where user_id = p_user;
  if v_status = 'active' then
    perform misaeng_staff_monthly_locked(p_user,
      coalesce((select (value->>'monthlyCredits')::int from misaeng_settings where key = 'in_house'), 1000));
  end if;
  return v_status;
end $$;

-- ERP: add someone by hand (or bring back someone removed).
create or replace function misaeng_in_house_add(p_user text, p_email text, p_by text) returns boolean language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtext('misaeng-credits-' || p_user));
  insert into misaeng_in_house (user_id, email, source) values (p_user, lower(p_email), 'erp')
  on conflict (user_id) do update set status = 'active', source = 'erp', removed_at = null, removed_by = null,
         removed_note = null,
         -- someone brought back gets this month's credits; someone already active keeps what they have
         last_grant_month = case when misaeng_in_house.status = 'removed' then null else misaeng_in_house.last_grant_month end;
  perform misaeng_staff_monthly_locked(p_user,
    coalesce((select (value->>'monthlyCredits')::int from misaeng_settings where key = 'in_house'), 1000));
  return true;
end $$;

-- ERP (Super Admin): extra staff credits for this month. Note required.
create or replace function misaeng_staff_topup(p_user text, p_amount int, p_note text, p_by text) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  if p_amount is null or p_amount <= 0 or p_amount > 1000000 then raise exception 'misaeng:INVALID_AMOUNT'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'misaeng:NOTE_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtext('misaeng-credits-' || p_user));
  if not misaeng_in_house_active(p_user) then raise exception 'misaeng:NOT_IN_HOUSE'; end if;
  insert into misaeng_credit_ledger (user_id, bucket, amount, remaining, reason, note, created_by, unit_cents)
  values (p_user, 'staff', p_amount, p_amount, 'staff_topup', left(p_note, 200), p_by, 0)
  returning id into v_id;
  return v_id;
end $$;

-- ERP: someone leaves. Staff credits → 0, waiting Boost reservations cancelled (paid part back to its lots), and every
-- listing they posted is deleted (hidden now; the daily job removes it and its photos).
create or replace function misaeng_in_house_remove(p_user text, p_note text, p_by text) returns jsonb language plpgsql as $$
declare g record; r record; v_zeroed int := 0; v_listings int;
begin
  perform pg_advisory_xact_lock(hashtext('misaeng-credits-' || p_user));
  update misaeng_in_house set status = 'removed', removed_at = now(), removed_by = p_by, removed_note = left(p_note, 200)
   where user_id = p_user and status = 'active';
  if not found then raise exception 'misaeng:NOT_IN_HOUSE'; end if;
  for g in select id, remaining from misaeng_credit_ledger
            where user_id = p_user and bucket = 'staff' and amount > 0 and remaining > 0 for update loop
    update misaeng_credit_ledger set remaining = 0 where id = g.id;
    insert into misaeng_credit_ledger (user_id, bucket, amount, reason, lot_id, note, created_by, value_cents)
    values (p_user, 'staff', -g.remaining, 'staff_removed', g.id, 'No longer in-house', p_by, 0);
    v_zeroed := v_zeroed + g.remaining;
  end loop;
  for r in select * from misaeng_premium_reservations where user_id = p_user and status = 'waiting' for update loop
    update misaeng_premium_reservations set status = 'cancelled', cancelled_at = now() where id = r.id;
    perform misaeng_credit_return_lots(p_user, r.lots, r.id, 'Boost reservation cancelled');
  end loop;
  update misaeng_listings set status = 'deleted', deleted_at = now(),
         premium_end = case when premium_end > now() then now() else premium_end end
   where owner_id = p_user and status <> 'deleted';
  get diagnostics v_listings = row_count;
  return jsonb_build_object('staffCreditsRemoved', v_zeroed, 'listingsDeleted', v_listings);
end $$;

-- ERP: a test / QA account on the in-house domain that must be able to pay (also put it on the exception list).
-- Staff credits → 0 and waiting reservations cancelled, but its listings stay.
create or replace function misaeng_in_house_exclude(p_user text, p_note text, p_by text) returns jsonb language plpgsql as $$
declare g record; r record; v_zeroed int := 0;
begin
  perform pg_advisory_xact_lock(hashtext('misaeng-credits-' || p_user));
  update misaeng_in_house set status = 'removed', removed_at = now(), removed_by = p_by,
         removed_note = left('Excluded: ' || coalesce(p_note, ''), 200)
   where user_id = p_user and status = 'active';
  if not found then raise exception 'misaeng:NOT_IN_HOUSE'; end if;
  for r in select * from misaeng_premium_reservations where user_id = p_user and status = 'waiting' for update loop
    update misaeng_premium_reservations set status = 'cancelled', cancelled_at = now() where id = r.id;
    perform misaeng_credit_return_lots(p_user, r.lots, r.id, 'Boost reservation cancelled');
  end loop;
  for g in select id, remaining from misaeng_credit_ledger
            where user_id = p_user and bucket = 'staff' and amount > 0 and remaining > 0 for update loop
    update misaeng_credit_ledger set remaining = 0 where id = g.id;
    insert into misaeng_credit_ledger (user_id, bucket, amount, reason, lot_id, note, created_by, value_cents)
    values (p_user, 'staff', -g.remaining, 'staff_removed', g.id, 'Not in-house (test account)', p_by, 0);
    v_zeroed := v_zeroed + g.remaining;
  end loop;
  return jsonb_build_object('staffCreditsRemoved', v_zeroed);
end $$;

-- ── Promotions ──────────────────────────────────────────────────────────────────────────────────────────────────
-- Can this member use it now? (period, target, limits). 'new' = no purchase yet (packs / bonus) or no listing plan
-- bought yet (listing discount).
create or replace function misaeng_promotion_usable(p_promo uuid, p_user text) returns boolean language sql stable as $$
  select exists (
    select 1 from misaeng_promotions pr
     where pr.id = p_promo and pr.active and pr.starts_at <= now() and (pr.ends_at is null or pr.ends_at > now())
       and (pr.target = 'all'
            or pr.target = 'users' and p_user = any (pr.user_ids)
            or pr.target = 'new' and (
                 pr.kind <> 'listing_discount' and not exists (select 1 from misaeng_credit_purchases c where c.user_id = p_user)
              or pr.kind = 'listing_discount' and not exists (
                   select 1 from misaeng_credit_ledger l where l.user_id = p_user and l.amount < 0
                      and l.reason in ('listing', 'premium', 'upgrade', 'extend', 'reserve'))))
       and (pr.per_user_limit is null or (select count(*) from misaeng_promotion_uses u
                                           where u.promotion_id = pr.id and u.user_id = p_user) < pr.per_user_limit)
       and (pr.total_limit is null or (select count(*) from misaeng_promotion_uses u where u.promotion_id = pr.id) < pr.total_limit));
$$;

-- ── Boost spots: in-house listings hold at most `boostSlots` (default 1) of them ───────────────────────────────
create or replace function misaeng_in_house_boost_slots() returns int language sql stable as $$
  select coalesce((select (value->>'boostSlots')::int from misaeng_settings where key = 'in_house'), 1);
$$;

create or replace function misaeng_premium_in_house_count() returns int language sql stable as $$
  select count(*)::int from misaeng_listings l join misaeng_in_house h on h.user_id = l.owner_id and h.status = 'active'
   where l.status = 'live' and l.plan = 'premium' and l.premium_end > now() and l.expires_at > now();
$$;

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

-- Cancel a waiting reservation: the held credits go back to the lots they came from.
create or replace function misaeng_premium_cancel(p_user text, p_listing uuid) returns boolean language plpgsql as $$
declare r record;
begin
  perform pg_advisory_xact_lock(hashtext('misaeng-credits-' || p_user));
  select * into r from misaeng_premium_reservations
   where listing_id = p_listing and user_id = p_user and status = 'waiting' for update;
  if not found then return false; end if;
  update misaeng_premium_reservations set status = 'cancelled', cancelled_at = now() where id = r.id;
  perform misaeng_credit_return_lots(p_user, r.lots, r.id, 'Boost reservation cancelled');
  return true;
end $$;

-- ── Accounting ──────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function misaeng_credit_liability() returns jsonb language sql stable as $$
  select jsonb_build_object(
    -- Paid credits members still hold and what they paid for them (unit value per lot).
    'paidCredits',     coalesce((select sum(remaining) from misaeng_credit_ledger where bucket = 'paid' and amount > 0 and remaining > 0), 0),
    'liabilityCents',  coalesce((select round(sum(remaining * coalesce(unit_cents, 0))) from misaeng_credit_ledger
                                  where bucket = 'paid' and amount > 0 and remaining > 0), 0),
    'debtCredits',     coalesce((select sum(remaining) from misaeng_credit_ledger where reason = 'debt' and remaining > 0), 0),
    -- Earned: value of paid credits spent on listings, minus what reservations gave back.
    'revenueCents',    coalesce((select round(sum(case when amount < 0 then value_cents else -value_cents end)) from misaeng_credit_ledger
                                  where bucket = 'paid' and value_cents is not null
                                    and (amount < 0 and reason in ('listing', 'premium', 'upgrade', 'extend', 'reserve')
                                         or amount > 0 and reason = 'return')), 0),
    'staffCredits',    coalesce((select sum(remaining) from misaeng_credit_ledger where bucket = 'staff' and amount > 0 and remaining > 0), 0),
    'inHouseMembers',  coalesce((select count(*) from misaeng_in_house where status = 'active'), 0),
    'members',         coalesce((select count(distinct user_id) from misaeng_credit_ledger
                                  where bucket = 'paid' and amount > 0 and remaining > 0), 0),
    'salesCents',      coalesce((select sum(amount_cents) from misaeng_credit_purchases where status in ('paid', 'refund_requested')), 0),
    'appleSalesCents', coalesce((select sum(amount_cents) from misaeng_credit_purchases
                                  where provider = 'apple' and status in ('paid', 'refund_requested')), 0),
    'refundedCents',   coalesce((select sum(amount_cents) from misaeng_credit_purchases where status in ('refunded', 'disputed', 'reversed')), 0),
    'pendingRefunds',  coalesce((select count(*) from misaeng_credit_purchases where status = 'refund_requested'), 0));
$$;

-- ── Daily: monthly staff credits, then reservations start ───────────────────────────────────────────────────────
create or replace function misaeng_credits_daily() returns void language plpgsql as $$
declare h record; v_amount int := coalesce((select (value->>'monthlyCredits')::int from misaeng_settings where key = 'in_house'), 1000);
begin
  for h in select user_id from misaeng_in_house where status = 'active' and last_grant_month is distinct from misaeng_ny_month() loop
    perform pg_advisory_xact_lock(hashtext('misaeng-credits-' || h.user_id));
    perform misaeng_staff_monthly_locked(h.user_id, v_amount);
  end loop;
  perform misaeng_premium_promote(
    coalesce((select (value->>'slots')::int from misaeng_settings where key = 'listing_prices'), 3),
    coalesce((select (value->'premium'->>'days')::int from misaeng_settings where key = 'listing_prices'), 7),
    coalesce((select (value->'premium'->>'totalDays')::int from misaeng_settings where key = 'listing_prices'), 28));
end $$;

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('misaeng-credits-daily', '20 9 * * *', 'select misaeng_credits_daily()');  -- 04:20 ET
  end if;
end $$;

-- ── Access ──────────────────────────────────────────────────────────────────────────────────────────────────────
alter table misaeng_in_house       enable row level security;
alter table misaeng_promotions     enable row level security;
alter table misaeng_promotion_uses enable row level security;
revoke all on misaeng_in_house, misaeng_promotions, misaeng_promotion_uses from anon, authenticated;
grant select, insert, update, delete on misaeng_in_house, misaeng_promotions, misaeng_promotion_uses to service_role;

do $$
declare f text;
begin
  foreach f in array array[
    'misaeng_ny_month()', 'misaeng_in_house_active(text)', 'misaeng_credit_balance(text)',
    'misaeng_credit_spend_locked(text, int, text, uuid, text)', 'misaeng_credit_return_lots(text, jsonb, uuid, text)',
    'misaeng_credit_take_paid(text, int, uuid, text, uuid, text, text)', 'misaeng_credit_purchase_record(jsonb)',
    'misaeng_credit_purchase_refundable(uuid, int)', 'misaeng_credit_purchase_reverse(uuid, text, text, text)',
    'misaeng_credit_adjust(uuid, int, text, text)', 'misaeng_staff_monthly_locked(text, int)',
    'misaeng_in_house_sync(text, text)', 'misaeng_in_house_add(text, text, text)', 'misaeng_staff_topup(text, int, text, text)',
    'misaeng_in_house_remove(text, text, text)', 'misaeng_in_house_exclude(text, text, text)', 'misaeng_promotion_usable(uuid, text)', 'misaeng_in_house_boost_slots()',
    'misaeng_premium_in_house_count()', 'misaeng_premium_promote(int, int, int)',
    'misaeng_listing_purchase(text, uuid, text, int, int, int[], int, int, int, int, uuid, int)',
    'misaeng_premium_cancel(text, uuid)', 'misaeng_credit_liability()', 'misaeng_credits_daily()'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

notify pgrst, 'reload schema';


-- ════════════════════════════════════════ Misaeng settings ════════════════════════════════════════════════════════
insert into misaeng_settings (key, value) values ('credits_enabled', '{"enabled": true}'::jsonb)
on conflict (key) do nothing;
insert into misaeng_settings (key, value) values ('brokerage', jsonb_build_object(
  'name', 'Fact Real Estate',
  'licenseType', 'Licensed Real Estate Broker',
  'responsibleBroker', '',
  'officePhone', '',
  'officeEmail', '',
  'officeAddress', '',
  'fairHousingNoticeUrl', 'https://dos.ny.gov/system/files/documents/2024/03/fair-housing-notice.pdf',
  'housingDisclosureUrl', 'https://dos.ny.gov/system/files/documents/2024/03/nys-housing-and-anti-discrimination-disclosure-form.pdf'))
on conflict (key) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('misaeng-agent-listings', 'misaeng-agent-listings', true, 3145728, array['image/jpeg']),
  ('misaeng-agent-licenses', 'misaeng-agent-licenses', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

commit;

notify pgrst, 'reload schema';

select 'misaeng agent accounts ready (licenses, listings, credits x10, in-house, promotions)' as result;
