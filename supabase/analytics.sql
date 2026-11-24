-- Misaeng analytics (KPI · 사용자 행동 분석 기획서, owner decisions 2026-11-24)
-- Apps and the website send behavior events to POST /api/track (misaeng.com), which writes them here with the
-- service role key. Every night analytics_rollup(day) turns them into small daily tables that the ERP reads through
-- /api/internal/analytics/*. Nothing here is sent to an outside service.
--
-- Never stored: message bodies, photos, verification documents. Search text is cleared after 90 days.
-- Raw events are kept 13 months (monthly partitions; older ones are dropped by the monthly job).
-- user_id = Misaeng uid (text). Days are America/New_York days.
--
-- Run once in the Supabase SQL Editor (staging, then prod). Safe to re-run. pg_cron jobs are created only where the
-- pg_cron extension is available (Supabase: Database → Extensions → pg_cron).

-- MARK: raw events

create table if not exists public.analytics_events (
  event_id uuid not null,
  ts timestamptz not null,
  received_at timestamptz not null default now(),
  event text not null,
  user_id text,
  anonymous_id text not null,
  session_id text,
  brand text not null default 'misaeng',
  platform text not null check (platform in ('web', 'ios', 'android', 'server')),
  app_version text,
  locale text,
  screen text,
  props jsonb not null default '{}'::jsonb,
  primary key (event_id, ts)
) partition by range (ts);

create table if not exists public.analytics_events_default partition of public.analytics_events default;

create index if not exists analytics_events_user_idx on public.analytics_events (user_id, ts desc);
create index if not exists analytics_events_event_idx on public.analytics_events (event, ts);
create index if not exists analytics_events_anon_idx on public.analytics_events (anonymous_id, ts desc);

-- Monthly partitions from last month to p_ahead months ahead, and drop the ones older than p_keep_months.
create or replace function public.analytics_maintain_partitions(p_ahead integer default 3, p_keep_months integer default 13)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m date;
  part text;
  r record;
  cutoff date := (date_trunc('month', now()) - make_interval(months => p_keep_months))::date;
begin
  for i in -1 .. p_ahead loop
    m := (date_trunc('month', now()) + make_interval(months => i))::date;
    part := 'analytics_events_' || to_char(m, 'YYYY_MM');
    if to_regclass('public.' || part) is null then
      begin
        execute format(
          'create table public.%I partition of public.analytics_events for values from (%L) to (%L)',
          part, m::timestamptz, (m + interval '1 month')::timestamptz
        );
      exception when others then
        -- rows for that month already sit in the default partition: leave them there
        raise notice 'analytics partition % not created: %', part, sqlerrm;
      end;
    end if;
  end loop;
  for r in
    select c.relname
    from pg_inherits i
    join pg_class c on c.oid = i.inhrelid
    join pg_class p on p.oid = i.inhparent
    where p.relname = 'analytics_events' and c.relname ~ '^analytics_events_\d{4}_\d{2}$'
  loop
    if to_date(substr(r.relname, 18), 'YYYY_MM') < cutoff then
      execute format('drop table if exists public.%I', r.relname);
    end if;
  end loop;
end;
$$;

select public.analytics_maintain_partitions();

-- anonymous_id (install / browser) → Misaeng account, with where they first and last came from (utm / ref).
create table if not exists public.analytics_identities (
  anonymous_id text primary key,
  user_id text not null,
  first_touch jsonb,
  last_touch jsonb,
  linked_at timestamptz not null default now()
);
create index if not exists analytics_identities_user_idx on public.analytics_identities (user_id);

create or replace function public.analytics_link_identity(p_anonymous_id text, p_user_id text, p_touch jsonb default null)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.analytics_identities (anonymous_id, user_id, first_touch, last_touch)
  values (p_anonymous_id, p_user_id, p_touch, p_touch)
  on conflict (anonymous_id) do update
    set user_id = excluded.user_id,
        first_touch = coalesce(public.analytics_identities.first_touch, excluded.first_touch),
        last_touch = coalesce(excluded.last_touch, public.analytics_identities.last_touch);
$$;

-- MARK: who is left out of every number

-- Managed from the ERP (review / test accounts, the owner's personal accounts …).
create table if not exists public.analytics_excluded_accounts (
  uid text primary key,
  email text,
  reason text,
  added_by text,
  created_at timestamptz not null default now()
);

-- Also left out automatically: @misaeng.com sign-ins and ERP support staff.
create or replace view public.analytics_internal_uids as
  select uid from public.analytics_excluded_accounts
  union
  select a.uid from public.auth_accounts a
  where lower(coalesce(a.email, '')) like '%@misaeng.com'
     or lower(coalesce(a.email, '')) in (select lower(email) from public.support_staff where email is not null);

-- Deleted accounts: 30 days later (the account-deletion grace) their events lose every link to the person.
create table if not exists public.analytics_deletions (
  uid text primary key,
  deleted_at timestamptz not null default now(),
  anonymized_at timestamptz
);

-- Every look at a member's timeline in the ERP (Super Admin only).
create table if not exists public.analytics_timeline_views (
  id uuid primary key default gen_random_uuid(),
  viewer_email text not null,
  target_uid text not null,
  viewed_at timestamptz not null default now()
);
create index if not exists analytics_timeline_views_target_idx on public.analytics_timeline_views (target_uid, viewed_at desc);

-- MARK: nightly aggregates (what the ERP reads)

create table if not exists public.metrics_daily (
  day date not null,
  brand text not null,
  platform text not null,          -- web | ios | android | all
  metric text not null,
  value numeric not null,
  primary key (day, brand, platform, metric)
);

create table if not exists public.content_daily (
  day date not null,
  brand text not null,
  target_type text not null,       -- post types (community, housing, review …), company, job
  target_id text not null,
  views integer not null default 0,
  uniq_viewers integer not null default 0,
  avg_dwell_ms integer,
  saves integer not null default 0,
  inquiries integer not null default 0,
  primary key (day, brand, target_type, target_id)
);

create table if not exists public.search_daily (
  day date not null,
  brand text not null,
  board text not null,
  query_norm text not null,
  searches integer not null,
  zero_results integer not null,
  primary key (day, brand, board, query_norm)
);

-- Signup week (Monday, New York) × weeks since signup.
create table if not exists public.cohort_retention (
  brand text not null,
  cohort_week date not null,
  week_n integer not null,
  users integer not null,
  retained integer not null,
  primary key (brand, cohort_week, week_n)
);

-- Meaningful actions (활동 WAU, the north-star metric) and the stricter "참여" list (owner 11-24).
create or replace function public.analytics_is_meaningful(p_event text, p_props jsonb)
returns boolean
language sql
immutable
as $$
  select p_event in ('review_created', 'review_unlocked', 'listing_inquiry_sent', 'coffee_chat_requested',
                     'points_spent', 'company_viewed', 'job_viewed')
      or (p_event = 'post_viewed' and p_props->>'post_type' = 'review');
$$;

create or replace function public.analytics_is_engaged(p_event text)
returns boolean
language sql
immutable
as $$
  select p_event in ('review_created', 'review_unlocked', 'listing_inquiry_sent', 'coffee_chat_requested',
                     'points_spent', 'post_created', 'comment_created');
$$;

create or replace function public.analytics_day_start(p_day date)
returns timestamptz
language sql
immutable
as $$
  select (p_day::timestamp) at time zone 'America/New_York';
$$;

-- Rebuilds every aggregate for one New York day (idempotent). Also refreshes the cohorts.
create or replace function public.analytics_rollup(p_day date)
returns void
language plpgsql
security definer
set search_path = public
set statement_timeout = '5min'
as $$
declare
  d0 timestamptz := public.analytics_day_start(p_day);
  d1 timestamptz := public.analytics_day_start(p_day + 1);
  w0 timestamptz := public.analytics_day_start(p_day - 6);
  m0 timestamptz := public.analytics_day_start(p_day - 29);
begin
  delete from public.metrics_daily where day = p_day;
  delete from public.content_daily where day = p_day;
  delete from public.search_daily where day = p_day;

  -- people counts (signed-in, not internal), per platform and 'all'
  with ev as (
    select e.brand, e.platform, e.user_id, e.event, e.props, e.ts
    from public.analytics_events e
    where e.ts >= m0 and e.ts < d1 and e.user_id is not null
      and not exists (select 1 from public.analytics_internal_uids x where x.uid = e.user_id)
  ),
  counts as (
    select brand, coalesce(platform, 'all') as platform,
      count(distinct user_id) filter (where ts >= d0) as dau,
      count(distinct user_id) filter (where ts >= w0) as wau,
      count(distinct user_id) as mau,
      count(distinct user_id) filter (where ts >= w0 and public.analytics_is_meaningful(event, props)) as active_wau,
      count(distinct user_id) filter (where ts >= w0 and public.analytics_is_engaged(event)) as engaged_wau,
      count(distinct user_id) filter (where ts >= m0 and public.analytics_is_meaningful(event, props)) as active_mau,
      count(distinct user_id) filter (where ts >= d0 and event = 'signup_completed') as signups,
      count(distinct user_id) filter (where ts >= d0 and event = 'verification_completed') as verifications,
      count(*) filter (where ts >= d0 and event = 'listing_inquiry_sent') as inquiries,
      count(*) filter (where ts >= d0 and event = 'post_created') as new_posts,
      count(*) filter (where ts >= d0 and event = 'review_created') as reviews,
      count(*) filter (where ts >= d0 and event = 'purchase_completed') as purchases,
      count(*) filter (where ts >= d0 and event = 'push_opened') as push_opens,
      count(*) filter (where ts >= d0 and event = 'coffee_chat_requested') as coffee_chats
    from ev
    group by grouping sets ((brand, platform), (brand))
  )
  insert into public.metrics_daily (day, brand, platform, metric, value)
  select p_day, c.brand, c.platform, m.metric, m.value
  from counts c
  cross join lateral (values
    ('dau', c.dau), ('wau', c.wau), ('mau', c.mau), ('active_wau', c.active_wau), ('engaged_wau', c.engaged_wau),
    ('active_mau', c.active_mau), ('signups', c.signups), ('verifications', c.verifications),
    ('inquiries', c.inquiries), ('new_posts', c.new_posts), ('reviews', c.reviews), ('purchases', c.purchases),
    ('push_opens', c.push_opens), ('coffee_chats', c.coffee_chats)
  ) as m(metric, value);

  -- D1 / D7 / D30: of the members who signed up N days before p_day, the share who came back on p_day
  insert into public.metrics_daily (day, brand, platform, metric, value)
  select p_day, s.brand, 'all', 'd' || n.n || '_retention',
    round(count(distinct s.user_id) filter (where exists (
      select 1 from public.analytics_events r
      where r.user_id = s.user_id and r.ts >= d0 and r.ts < d1 and r.event <> 'signup_completed'
    ))::numeric / nullif(count(distinct s.user_id), 0), 4)
  from (values (1), (7), (30)) as n(n)
  join public.analytics_events s
    on s.event = 'signup_completed'
   and s.ts >= public.analytics_day_start(p_day - n.n) and s.ts < public.analytics_day_start(p_day - n.n + 1)
   and s.user_id is not null
   and not exists (select 1 from public.analytics_internal_uids x where x.uid = s.user_id)
  group by s.brand, n.n
  having count(distinct s.user_id) > 0;

  -- what was viewed / saved / asked about (signed-out visitors count here, by anonymous id)
  insert into public.content_daily (day, brand, target_type, target_id, views, uniq_viewers, avg_dwell_ms, saves, inquiries)
  select p_day, brand, target_type, target_id,
    count(*) filter (where kind = 'view'),
    count(distinct viewer) filter (where kind = 'view'),
    avg(dwell) filter (where kind = 'view' and dwell is not null)::integer,
    count(*) filter (where kind = 'save'),
    count(*) filter (where kind = 'inquiry')
  from (
    select e.brand,
      case e.event
        when 'post_viewed' then coalesce(nullif(e.props->>'post_type', ''), 'community')
        when 'company_viewed' then 'company'
        when 'job_viewed' then 'job'
        when 'post_saved' then coalesce(nullif(e.props->>'post_type', ''), 'community')
        when 'listing_inquiry_sent' then coalesce(nullif(e.props->>'listing_type', ''), 'housing')
      end as target_type,
      coalesce(e.props->>'post_id', e.props->>'company_id', e.props->>'job_id', e.props->>'listing_id') as target_id,
      case when e.event in ('post_viewed', 'company_viewed', 'job_viewed') then 'view'
           when e.event = 'post_saved' then 'save' else 'inquiry' end as kind,
      coalesce(e.user_id, e.anonymous_id) as viewer,
      case when (e.props->>'dwell_ms') ~ '^\d+$' then least((e.props->>'dwell_ms')::bigint, 3600000) end as dwell
    from public.analytics_events e
    where e.ts >= d0 and e.ts < d1
      and e.event in ('post_viewed', 'company_viewed', 'job_viewed', 'post_saved', 'listing_inquiry_sent')
      and (e.user_id is null or not exists (select 1 from public.analytics_internal_uids x where x.uid = e.user_id))
  ) t
  where target_id is not null and target_id <> ''
  group by brand, target_type, target_id;

  -- searches (query text lowercased; it is cleared from the raw events after 90 days)
  insert into public.search_daily (day, brand, board, query_norm, searches, zero_results)
  select p_day, e.brand, coalesce(nullif(e.props->>'board', ''), 'all'),
    left(lower(btrim(e.props->>'query')), 200),
    count(*),
    count(*) filter (where (e.props->>'result_count') = '0')
  from public.analytics_events e
  where e.ts >= d0 and e.ts < d1 and e.event = 'search_performed'
    and coalesce(btrim(e.props->>'query'), '') <> ''
    and (e.user_id is null or not exists (select 1 from public.analytics_internal_uids x where x.uid = e.user_id))
  group by 1, 2, 3, 4;

  -- cohorts: the last 13 signup weeks
  delete from public.cohort_retention where cohort_week >= (date_trunc('week', p_day::timestamp) - interval '12 weeks')::date;
  insert into public.cohort_retention (brand, cohort_week, week_n, users, retained)
  with signups as (
    select distinct on (e.user_id) e.brand, e.user_id,
      date_trunc('week', e.ts at time zone 'America/New_York')::date as cohort_week
    from public.analytics_events e
    where e.event = 'signup_completed' and e.user_id is not null
      and e.ts >= public.analytics_day_start((date_trunc('week', p_day::timestamp) - interval '12 weeks')::date)
      and e.ts < d1
      and not exists (select 1 from public.analytics_internal_uids x where x.uid = e.user_id)
    order by e.user_id, e.ts
  ),
  weeks as (
    select s.brand, s.cohort_week, s.user_id, w.n
    from signups s
    cross join generate_series(0, 12) as w(n)
    where s.cohort_week + w.n * 7 <= p_day
  )
  select w.brand, w.cohort_week, w.n,
    count(distinct w.user_id),
    count(distinct w.user_id) filter (where exists (
      select 1 from public.analytics_events a
      where a.user_id = w.user_id
        and a.ts >= public.analytics_day_start(w.cohort_week + w.n * 7)
        and a.ts < public.analytics_day_start(w.cohort_week + w.n * 7 + 7)
    ))
  from weeks w
  group by w.brand, w.cohort_week, w.n;
end;
$$;

-- Nightly job: yesterday and the day before (late events from phones that were offline), the 90-day search purge.
create or replace function public.analytics_nightly()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'America/New_York')::date;
begin
  perform public.analytics_rollup(today - 2);
  perform public.analytics_rollup(today - 1);
  update public.analytics_events
     set props = props - 'query'
   where event = 'search_performed' and ts < now() - interval '90 days' and props ? 'query';
  -- deleted accounts after 30 days: no account id, no device id, no links
  update public.analytics_events e
     set user_id = null, anonymous_id = 'deleted', session_id = null, props = e.props - 'touch'
    from public.analytics_deletions d
   where d.anonymized_at is null and d.deleted_at < now() - interval '30 days' and e.user_id = d.uid;
  delete from public.analytics_identities i
   using public.analytics_deletions d
   where d.anonymized_at is null and d.deleted_at < now() - interval '30 days' and i.user_id = d.uid;
  delete from public.analytics_timeline_views v
   using public.analytics_deletions d
   where d.anonymized_at is null and d.deleted_at < now() - interval '30 days' and v.target_uid = d.uid;
  update public.analytics_deletions set anonymized_at = now()
   where anonymized_at is null and deleted_at < now() - interval '30 days';
end;
$$;

-- MARK: reads for the ERP (service role only)

-- Signup funnel: visitors → sign-up → verification → first meaningful action. Housing: listing views → saves → inquiries.
create or replace function public.analytics_funnel(p_kind text, p_from date, p_to date, p_brand text default 'misaeng')
returns table (step text, users bigint)
language sql
stable
security definer
set search_path = public
as $$
  with ev as (
    select e.* from public.analytics_events e
    where e.brand = p_brand
      and e.ts >= public.analytics_day_start(p_from) and e.ts < public.analytics_day_start(p_to + 1)
      and (e.user_id is null or not exists (select 1 from public.analytics_internal_uids x where x.uid = e.user_id))
  ),
  signed as (select distinct user_id from ev where event = 'signup_completed' and user_id is not null)
  select * from (
    select 'visitors'::text, count(distinct anonymous_id) from ev where p_kind = 'signup' and platform = 'web' and user_id is null
    union all
    select 'signups', count(*) from signed where p_kind = 'signup'
    union all
    select 'verified', count(distinct e.user_id) from ev e join signed s using (user_id)
      where p_kind = 'signup' and e.event = 'verification_completed'
    union all
    select 'first_action', count(distinct e.user_id) from ev e join signed s using (user_id)
      where p_kind = 'signup' and public.analytics_is_meaningful(e.event, e.props)
    union all
    select 'listing_viewers', count(distinct coalesce(user_id, anonymous_id)) from ev
      where p_kind = 'housing' and event = 'post_viewed' and props->>'post_type' in ('housing', 'roommate', 'sublet')
    union all
    select 'savers', count(distinct coalesce(user_id, anonymous_id)) from ev
      where p_kind = 'housing' and event = 'post_saved' and props->>'post_type' in ('housing', 'roommate', 'sublet')
    union all
    select 'inquirers', count(distinct user_id) from ev
      where p_kind = 'housing' and event = 'listing_inquiry_sent' and coalesce(props->>'listing_type', 'housing') = 'housing'
  ) f(step, users)
  where (p_kind = 'signup' and step in ('visitors', 'signups', 'verified', 'first_action'))
     or (p_kind = 'housing' and step in ('listing_viewers', 'savers', 'inquirers'));
$$;

create or replace function public.analytics_top_content(p_type text, p_days integer, p_limit integer default 30, p_brand text default 'misaeng')
returns table (target_type text, target_id text, views bigint, uniq_viewers bigint, avg_dwell_ms integer, saves bigint, inquiries bigint)
language sql
stable
security definer
set search_path = public
as $$
  select c.target_type, c.target_id, sum(c.views), sum(c.uniq_viewers),
    (sum(coalesce(c.avg_dwell_ms, 0)::bigint * c.views) / nullif(sum(c.views) filter (where c.avg_dwell_ms is not null), 0))::integer,
    sum(c.saves), sum(c.inquiries)
  from public.content_daily c
  where c.brand = p_brand and c.day > (now() at time zone 'America/New_York')::date - p_days
    and (p_type = 'all'
      or (p_type = 'post' and c.target_type not in ('company', 'job'))
      or c.target_type = p_type)
  group by c.target_type, c.target_id
  order by 4 desc, 3 desc
  limit greatest(1, least(p_limit, 200));
$$;

create or replace function public.analytics_top_searches(p_days integer, p_limit integer default 30, p_brand text default 'misaeng')
returns table (board text, query text, searches bigint, zero_results bigint)
language sql
stable
security definer
set search_path = public
as $$
  select s.board, s.query_norm, sum(s.searches), sum(s.zero_results)
  from public.search_daily s
  where s.brand = p_brand and s.day > (now() at time zone 'America/New_York')::date - p_days
  group by s.board, s.query_norm
  order by 3 desc
  limit greatest(1, least(p_limit, 200));
$$;

-- One member's events, newest first, including what they did before signing in on a linked device / browser.
create or replace function public.analytics_timeline(p_uid text, p_limit integer default 200, p_before timestamptz default null)
returns table (ts timestamptz, event text, platform text, screen text, props jsonb, signed_in boolean)
language sql
stable
security definer
set search_path = public
as $$
  select e.ts, e.event, e.platform, e.screen, e.props, e.user_id is not null
  from public.analytics_events e
  where (e.user_id = p_uid
         or (e.user_id is null and e.anonymous_id in (select anonymous_id from public.analytics_identities where user_id = p_uid)))
    and (p_before is null or e.ts < p_before)
  order by e.ts desc
  limit greatest(1, least(p_limit, 500));
$$;

-- MARK: access — server (service role) only

alter table public.analytics_events enable row level security;
alter table public.analytics_identities enable row level security;
alter table public.analytics_excluded_accounts enable row level security;
alter table public.analytics_timeline_views enable row level security;
alter table public.analytics_deletions enable row level security;
alter table public.metrics_daily enable row level security;
alter table public.content_daily enable row level security;
alter table public.search_daily enable row level security;
alter table public.cohort_retention enable row level security;

revoke all on public.analytics_events, public.analytics_identities, public.analytics_excluded_accounts,
  public.analytics_timeline_views, public.analytics_deletions, public.metrics_daily, public.content_daily, public.search_daily,
  public.cohort_retention, public.analytics_internal_uids
  from anon, authenticated;
grant select, insert, update, delete on public.analytics_events, public.analytics_identities,
  public.analytics_excluded_accounts, public.analytics_timeline_views, public.analytics_deletions, public.metrics_daily,
  public.content_daily, public.search_daily, public.cohort_retention
  to service_role;
grant select on public.analytics_internal_uids to service_role;

revoke all on function public.analytics_maintain_partitions(integer, integer), public.analytics_link_identity(text, text, jsonb),
  public.analytics_rollup(date), public.analytics_nightly(), public.analytics_funnel(text, date, date, text),
  public.analytics_top_content(text, integer, integer, text), public.analytics_top_searches(integer, integer, text),
  public.analytics_timeline(text, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.analytics_maintain_partitions(integer, integer), public.analytics_link_identity(text, text, jsonb),
  public.analytics_rollup(date), public.analytics_nightly(), public.analytics_funnel(text, date, date, text),
  public.analytics_top_content(text, integer, integer, text), public.analytics_top_searches(integer, integer, text),
  public.analytics_timeline(text, integer, timestamptz)
  to service_role;

-- MARK: schedules (pg_cron, UTC): nightly at 08:30 UTC (03:30 New York in winter), partitions on the 1st

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    if exists (select 1 from cron.job where jobname = 'analytics-nightly') then
      perform cron.unschedule('analytics-nightly');
    end if;
    if exists (select 1 from cron.job where jobname = 'analytics-partitions') then
      perform cron.unschedule('analytics-partitions');
    end if;
    perform cron.schedule('analytics-nightly', '30 8 * * *', 'select public.analytics_nightly()');
    perform cron.schedule('analytics-partitions', '0 6 1 * *', 'select public.analytics_maintain_partitions()');
  else
    raise notice 'pg_cron is not available: run select public.analytics_nightly(); daily some other way.';
  end if;
end;
$$;
