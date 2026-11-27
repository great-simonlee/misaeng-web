-- Misaeng agent credit packs: bigger volume discounts (owner 2026-11-26). Run on staging and prod (SQL Editor).
-- Same credits, lower prices for the larger packs — compared with buying the same credits as 100-packs ($9.99 / 100):
--   220 → $18.99 (13% off $21.98) · 460 → $36.99 (19% off $45.95) · 960 → $69.99 (27% off $95.90).
-- Safe to re-run. Only Misaeng's settings change (Ellieo's prices are separate). App Store / Google Play prices of
-- com.misaeng.nyc.credits.220 / .460 / .960 must be set to the same amounts.
update misaeng_settings
   set value = jsonb_set(value, '{packs}', jsonb_build_array(
         jsonb_build_object('id', 'pack100', 'priceCents', 999,  'credits', 100, 'appleProductId', 'com.misaeng.nyc.credits.100'),
         jsonb_build_object('id', 'pack220', 'priceCents', 1899, 'credits', 220, 'appleProductId', 'com.misaeng.nyc.credits.220'),
         jsonb_build_object('id', 'pack460', 'priceCents', 3699, 'credits', 460, 'appleProductId', 'com.misaeng.nyc.credits.460'),
         jsonb_build_object('id', 'pack960', 'priceCents', 6999, 'credits', 960, 'appleProductId', 'com.misaeng.nyc.credits.960'))),
       updated_at = now(),
       updated_by = 'agent_pack_prices.sql'
 where key = 'credits';

select value -> 'packs' as packs from misaeng_settings where key = 'credits';
