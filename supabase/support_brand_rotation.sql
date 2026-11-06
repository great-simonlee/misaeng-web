-- Per-brand housing lead rotation. Run after support.sql (safe to run again).
-- support_staff.in_rotation stays the Misaeng flag; in_rotation_ellieo is the Ellieo one.
-- Both are set by the Super Admin in Team Directory (ERP web + Misaeng ERP app).
alter table public.support_staff add column if not exists in_rotation_ellieo boolean not null default false;

insert into public.support_settings (key, value) values
  ('rotation.cursor.ellieo', '{"email": null}'::jsonb)
on conflict (key) do nothing;

-- Next housing lead for a brand: the first eligible staff after the last one who got that brand's lead, in rotation
-- order (wraps around). Misaeng keeps the old cursor key ('rotation.cursor'); Ellieo has its own.
-- Called without arguments (older servers) = Misaeng, same as before.
drop function if exists public.support_take_next_assignee();

create or replace function public.support_take_next_assignee(p_brand text default 'misaeng')
returns text
language plpgsql
as $$
declare
  ellieo boolean := lower(coalesce(p_brand, 'misaeng')) = 'ellieo';
  cursor_key text := case when ellieo then 'rotation.cursor.ellieo' else 'rotation.cursor' end;
  cur text;
  cur_order integer;
  nxt text;
begin
  perform pg_advisory_xact_lock(hashtext('support_rotation'));
  select value->>'email' into cur from public.support_settings where key = cursor_key;
  select rotation_order into cur_order from public.support_staff where email = cur;
  select s.email into nxt
    from public.support_staff s
   where s.active and s.accepting
     and (case when ellieo then s.in_rotation_ellieo else s.in_rotation end)
   order by
     case when cur_order is null
            or s.rotation_order > cur_order
            or (s.rotation_order = cur_order and s.email > cur) then 0 else 1 end,
     s.rotation_order, s.email
   limit 1;
  if nxt is not null then
    insert into public.support_settings (key, value, updated_at)
    values (cursor_key, jsonb_build_object('email', nxt), now())
    on conflict (key) do update set value = excluded.value, updated_at = now();
    update public.support_staff set last_assigned_at = now() where email = nxt;
  end if;
  return nxt;
end;
$$;

grant execute on function public.support_take_next_assignee(text) to service_role;
revoke execute on function public.support_take_next_assignee(text) from anon, authenticated, public;

notify pgrst, 'reload schema';
