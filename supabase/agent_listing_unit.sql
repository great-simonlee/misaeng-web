-- Misaeng agent listings: unit number + one live listing per address and unit, lease offer (owner 2026-11-27).
-- Run after supabase/agent_listing_details.sql, on staging and prod. Idempotent.
--
-- unit_number  "12A", "PH3" … (upper case, as the app sends it). The building address + unit are private (never shown).
-- The server refuses a new listing when a live listing already has the same ZIP, street (normalized: upper case,
-- STREET → ST …) and unit (src/lib/agents/listings.server.ts duplicateLive). The server works before this runs: until
-- the column exists it posts without the unit and skips the check.

alter table misaeng_listings add column if not exists unit_number text;
-- Lease offer, staff-listing shape: { leaseTerm (months), freeMonth (months free), rentCredit (dollars) } — Housing
-- shows "N개월 무료" / "$X 크레딧" and the Net price from it, like staff listings.
alter table misaeng_listings add column if not exists promotion jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'misaeng_listings_unit_len') then
    alter table misaeng_listings
      add constraint misaeng_listings_unit_len check (unit_number is null or char_length(unit_number) between 1 and 12);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'misaeng_listings_promotion_object') then
    alter table misaeng_listings
      add constraint misaeng_listings_promotion_object check (promotion is null or jsonb_typeof(promotion) = 'object');
  end if;
end $$;

-- The duplicate lookup reads live listings by ZIP.
create index if not exists misaeng_listings_zip_live on misaeng_listings (zip) where status = 'live';

notify pgrst, 'reload schema';
