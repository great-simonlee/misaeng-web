-- Misaeng agent listings: the same details as staff (ERP) listings (owner 2026-11-27).
-- Run after supabase/agent_accounts.sql, on staging and prod. Idempotent (safe to run again).
--
-- rooms          each room with its own monthly price: [{ "type": "master-w-bath" | "master-wo-bath" | "regular-bedroom"
--                | "flexroom" | "other", "price": 2232 }] — Housing shows them as 룸 옵션 rows like staff listings
-- building       building info set by the agent, staff-listing shape: { amenities[], includedUtility[], appliances[],
--                partWall[], amenityFee { type, amount, period, per } | null,
--                incomeRequirements { personalIncome, personalGuarantor, guarantorCompany } | null }
-- street_address the building's number + street (private: only used to find the nearby subway; never shown)
-- latitude/longitude  from the street address (private, like staff listings' coordinates)
-- subway         "🚇 N min walk to Station (lines)" lines, closest first (shown in 가까운 지하철)
--
-- The server works before this runs: until the columns exist it posts listings without these details (checked again
-- every minute, src/lib/agents/listings.server.ts hasDetailColumns). Move-in is required for new listings by the
-- server only (older rows may have no date, so no NOT NULL here).

alter table misaeng_listings add column if not exists rooms jsonb;
alter table misaeng_listings add column if not exists building jsonb;
alter table misaeng_listings add column if not exists street_address text;
alter table misaeng_listings add column if not exists latitude double precision;
alter table misaeng_listings add column if not exists longitude double precision;
alter table misaeng_listings add column if not exists subway jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'misaeng_listings_rooms_array') then
    alter table misaeng_listings
      add constraint misaeng_listings_rooms_array check (rooms is null or (jsonb_typeof(rooms) = 'array' and jsonb_array_length(rooms) <= 10));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'misaeng_listings_building_object') then
    alter table misaeng_listings
      add constraint misaeng_listings_building_object check (building is null or jsonb_typeof(building) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'misaeng_listings_street_len') then
    alter table misaeng_listings
      add constraint misaeng_listings_street_len check (street_address is null or char_length(street_address) between 3 and 120);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'misaeng_listings_subway_array') then
    alter table misaeng_listings
      add constraint misaeng_listings_subway_array check (subway is null or jsonb_typeof(subway) = 'array');
  end if;
end $$;

-- PostgREST picks up the new columns.
notify pgrst, 'reload schema';
