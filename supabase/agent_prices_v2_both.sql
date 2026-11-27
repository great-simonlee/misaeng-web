-- Agent prices v2 — Misaeng AND Ellieo (owner 2026-11-26). Run on staging and prod (SQL Editor). Safe to re-run.
-- Listings: 7일 20 · 14일 40 · 28일 70 · Premium = 28일 + Boost 150 = 220 · Boost / Premium 연장 150.
-- Packs (same credits, volume discounts vs the 100-pack): 100 $9.99 · 220 $18.99 · 460 $36.99 · 960 $69.99.
-- Only the price settings change; balances, purchases and listings are untouched. Other keys (slots…) are kept.

do $$
declare
  v_listing jsonb := jsonb_build_object(
    'regular', jsonb_build_object('7', 20, '14', 40, '28', 70),
    'premium', jsonb_build_object('mode', 'boost', 'bundlePrice', 220, 'boostPrice', 150, 'days', 7, 'totalDays', 28,
                                  'extendPrice', 150, 'maxExtensions', 1));
begin
  -- Misaeng
  insert into misaeng_settings (key, value) values ('listing_prices', jsonb_build_object('slots', 3)) on conflict (key) do nothing;
  update misaeng_settings set value = value || v_listing, updated_at = now(), updated_by = 'agent_prices_v2_both.sql'
   where key = 'listing_prices';
  update misaeng_settings set updated_at = now(), updated_by = 'agent_prices_v2_both.sql',
         value = jsonb_set(value, '{packs}', jsonb_build_array(
           jsonb_build_object('id', 'pack100', 'priceCents', 999,  'credits', 100, 'appleProductId', 'com.misaeng.nyc.credits.100'),
           jsonb_build_object('id', 'pack220', 'priceCents', 1899, 'credits', 220, 'appleProductId', 'com.misaeng.nyc.credits.220'),
           jsonb_build_object('id', 'pack460', 'priceCents', 3699, 'credits', 460, 'appleProductId', 'com.misaeng.nyc.credits.460'),
           jsonb_build_object('id', 'pack960', 'priceCents', 6999, 'credits', 960, 'appleProductId', 'com.misaeng.nyc.credits.960')))
   where key = 'credits';

  -- Ellieo
  insert into ellieo_settings (key, value) values ('listing_prices', jsonb_build_object('slots', 3)) on conflict (key) do nothing;
  update ellieo_settings set value = value || v_listing, updated_at = now(), updated_by = 'agent_prices_v2_both.sql'
   where key = 'listing_prices';
  update ellieo_settings set updated_at = now(), updated_by = 'agent_prices_v2_both.sql',
         value = jsonb_set(value, '{packs}', jsonb_build_array(
           jsonb_build_object('id', 'pack100', 'priceCents', 999,  'credits', 100, 'appleProductId', 'com.misaeng.ellieo.credits.100'),
           jsonb_build_object('id', 'pack220', 'priceCents', 1899, 'credits', 220, 'appleProductId', 'com.misaeng.ellieo.credits.220'),
           jsonb_build_object('id', 'pack460', 'priceCents', 3699, 'credits', 460, 'appleProductId', 'com.misaeng.ellieo.credits.460'),
           jsonb_build_object('id', 'pack960', 'priceCents', 6999, 'credits', 960, 'appleProductId', 'com.misaeng.ellieo.credits.960')))
   where key = 'credits';
end $$;

select 'misaeng' as app, key, value from misaeng_settings where key in ('listing_prices', 'credits')
union all
select 'ellieo', key, value from ellieo_settings where key in ('listing_prices', 'credits')
order by app, key;
