-- Staff profile photo (the ERP agent photo, synced by ellieo-erp when it changes and when staff use the app).
-- Shown to users in the housing chat header, next to staff bubbles, and in reply pushes.
alter table public.support_staff add column if not exists avatar_url text;

notify pgrst, 'reload schema';
