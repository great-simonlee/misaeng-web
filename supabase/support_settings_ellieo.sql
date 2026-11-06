-- Ellieo support settings (brand overrides). Run after support.sql + support_brand_rotation.sql. Safe to run again:
-- existing rows are never changed (change them later in the ERP / staff app Settings).
--
-- How keys resolve (misaeng-web src/lib/support/settings.server.ts → resolveSupportSettings, same rule in the ERP):
--   brand 'misaeng' → always the base key (e.g. inquiry.assignee)
--   brand 'ellieo'  → '<key>.ellieo' when that row exists, else the base key
-- Overridable keys: support.enabled, inquiry.enabled, inquiry.assignee, admins, escalation.final, housing.hours,
-- housing.escalate_minutes, email.delay_minutes, testers. Not per brand: reports.assignee. Rotation cursors are
-- rotation.cursor (Misaeng) / rotation.cursor.ellieo (support_brand_rotation.sql).
-- Not inserted here (they fall back to the base key): admins, housing.*, email.delay_minutes, testers.

insert into public.support_settings (key, value) values
  ('support.enabled.ellieo', 'true'::jsonb),                     -- Ellieo housing inquiries (ellieo.com board threads)
  ('inquiry.enabled.ellieo', 'true'::jsonb),                     -- Ellieo inquiries & suggestions
  ('inquiry.assignee.ellieo', '"simon@misaeng.com"'::jsonb)      -- Ellieo general inquiries → Simon
on conflict (key) do nothing;

-- Final escalation contact for Ellieo housing (2h unanswered): same as Misaeng's current value.
insert into public.support_settings (key, value)
select 'escalation.final.ellieo',
       coalesce((select value from public.support_settings where key = 'escalation.final'), '"simon@misaeng.com"'::jsonb)
on conflict (key) do nothing;
