-- Misaeng licensed agents: business email + phone as their own columns (owner 2026-11-26).
-- Run after supabase/agent_accounts.sql, on staging and prod. Idempotent (safe to run again).
--
-- Applications now require BOTH a business email and a business phone (NY 19 NYCRR 175.25: the listing shows the
-- agent's contact details). `contact` stays for older app builds and keeps "phone · email".
-- The server works before and after this runs: until the columns exist it writes only `contact` ("phone · email")
-- and reads the two back from it; once they exist (checked again every minute) it writes and reads them as well.

alter table misaeng_agent_licenses add column if not exists contact_email text;
alter table misaeng_agent_licenses add column if not exists contact_phone text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'misaeng_agent_licenses_contact_email_len') then
    alter table misaeng_agent_licenses
      add constraint misaeng_agent_licenses_contact_email_len check (contact_email is null or char_length(contact_email) between 5 and 90);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'misaeng_agent_licenses_contact_phone_len') then
    alter table misaeng_agent_licenses
      add constraint misaeng_agent_licenses_contact_phone_len check (contact_phone is null or char_length(contact_phone) between 10 and 25);
  end if;
end $$;

-- Backfill from `contact`: each "·"-separated part that looks like an email / a phone (10+ digits).
-- US 10-digit numbers (or 11 starting with 1) are stored as "(212) 555-0123", like the server does.
with parts as (
  select l.id, trim(p.part) as part
  from misaeng_agent_licenses l
  cross join lateral regexp_split_to_table(l.contact, '·') as p(part)
  where l.contact_email is null or l.contact_phone is null
),
found as (
  select
    id,
    min(lower(part)) filter (where part ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' and char_length(part) <= 90) as email,
    min(part) filter (
      where part ~ '^[+0-9\s().-]+$'
        and char_length(regexp_replace(part, '\D', '', 'g')) between 10 and 15
        and char_length(part) <= 25
    ) as phone
  from parts
  group by id
),
digits as (
  select id, email, phone, regexp_replace(coalesce(phone, ''), '\D', '', 'g') as d
  from found
),
formatted as (
  select
    id,
    email,
    case
      when phone is null then null
      when char_length(d) = 10 then '(' || substr(d, 1, 3) || ') ' || substr(d, 4, 3) || '-' || substr(d, 7, 4)
      when char_length(d) = 11 and d like '1%' then '(' || substr(d, 2, 3) || ') ' || substr(d, 5, 3) || '-' || substr(d, 8, 4)
      else phone
    end as phone
  from digits
)
update misaeng_agent_licenses l
set contact_email = coalesce(l.contact_email, f.email),
    contact_phone = coalesce(l.contact_phone, f.phone)
from formatted f
where f.id = l.id
  and ((l.contact_email is null and f.email is not null) or (l.contact_phone is null and f.phone is not null));

-- PostgREST picks up the new columns.
notify pgrst, 'reload schema';
