-- Misaeng agent listing prices v3 (owner 2026-11-27): about 1.6× v2, rounded to tens.
-- Listings: 7일 30 · 14일 60 · 28일 110 · Premium = 28일 + Boost 240 = 350 · Boost / Premium 연장 240.
-- (v2: 20 · 40 · 70 · Premium 220 · Boost/연장 150.) Packs are unchanged (100 $9.99 · 220 $18.99 · 460 $36.99 · 960 $69.99).
-- Misaeng only (Ellieo keeps v2). Only the price setting changes; balances, purchases and live listings are untouched.
-- Run on staging and prod (SQL Editor). Safe to re-run. The ERP › Licensed Agents › Prices & packs shows the result.

do $$
declare
  v_listing jsonb := jsonb_build_object(
    'regular', jsonb_build_object('7', 30, '14', 60, '28', 110),
    'premium', jsonb_build_object('mode', 'boost', 'bundlePrice', 350, 'boostPrice', 240, 'days', 7, 'totalDays', 28,
                                  'extendPrice', 240, 'maxExtensions', 1));
begin
  insert into misaeng_settings (key, value) values ('listing_prices', jsonb_build_object('slots', 3)) on conflict (key) do nothing;
  update misaeng_settings set value = value || v_listing, updated_at = now(), updated_by = 'agent_listing_prices_v3.sql'
   where key = 'listing_prices';
end $$;
