-- Misaeng analytics — more breakdowns for the ERP Analytics screens (owner 11-24: "as many metrics as possible").
-- Needs supabase/analytics.sql first (analytics_events, analytics_identities, analytics_internal_uids, content tables).
--
-- analytics_breakdown(from, to, brand, platform) reads the raw events of one New York date range (at most 92 days)
-- and returns one JSON object with every section the ERP shows: events, sessions, new vs returning members, screens,
-- app versions, locales, push, paywall → purchase, search, filters, content by type + top items, points, errors,
-- signed-out visitors → sign-up, hour × weekday activity. Internal accounts (analytics_internal_uids) are left out,
-- and so are signed-out events from a device that is linked to an internal account.
--
-- Run once in the Supabase SQL Editor (staging, then prod) after analytics.sql. Safe to re-run.

create or replace function public.analytics_breakdown(
  p_from date,
  p_to date,
  p_brand text default 'misaeng',
  p_platform text default 'all'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
set statement_timeout = '90s'
as $$
declare
  v_from date := greatest(p_from, p_to - 91);
  t0 timestamptz;
  t1 timestamptz;
  result jsonb;
begin
  if p_to is null or p_from is null or p_from > p_to then
    raise exception 'analytics_breakdown: bad date range';
  end if;
  t0 := public.analytics_day_start(v_from);
  t1 := public.analytics_day_start(p_to + 1);

  with internal as (
    select uid from public.analytics_internal_uids
  ),
  internal_devices as (
    select i.anonymous_id from public.analytics_identities i join internal x on x.uid = i.user_id
  ),
  ev as materialized (
    select e.ts, e.event, e.user_id, e.anonymous_id, e.session_id, e.platform, e.app_version, e.locale, e.screen, e.props,
      coalesce(e.user_id, 'anon:' || e.anonymous_id) as person,
      (e.ts at time zone 'America/New_York') as local_ts
    from public.analytics_events e
    where e.ts >= t0 and e.ts < t1
      and e.brand = p_brand
      and e.platform <> 'server'
      and (p_platform = 'all' or e.platform = p_platform)
      and (e.user_id is null or not exists (select 1 from internal x where x.uid = e.user_id))
      and (e.user_id is not null or not exists (select 1 from internal_devices d where d.anonymous_id = e.anonymous_id))
  ),
  signed_up as (
    select distinct user_id from ev where event = 'signup_completed' and user_id is not null
  ),
  sess as (
    -- *_viewed / screen_viewed are sent when the screen closes, so the session starts at min(ts - dwell)
    select session_id, min(platform) as platform, bool_or(user_id is not null) as signed_in, count(*) as events,
      least(extract(epoch from max(ts) - min(ts - make_interval(secs => coalesce(dwell, 0) / 1000.0))), 4 * 3600) as seconds
    from (
      select session_id, platform, user_id, ts,
        case when (props->>'dwell_ms') ~ '^\d+$' then least((props->>'dwell_ms')::bigint, 3600000) end as dwell
      from ev
      where session_id is not null and session_id <> ''
    ) s
    group by session_id
  ),
  views as (
    select
      case event
        when 'post_viewed' then coalesce(nullif(props->>'post_type', ''), 'community')
        when 'company_viewed' then 'company'
        else 'job'
      end as target_type,
      coalesce(props->>'post_id', props->>'company_id', props->>'job_id') as target_id,
      nullif(props->>'title', '') as title,
      person,
      case when (props->>'dwell_ms') ~ '^\d+$' then least((props->>'dwell_ms')::bigint, 3600000) end as dwell
    from ev
    where event in ('post_viewed', 'company_viewed', 'job_viewed')
  ),
  anon_visitors as (
    select distinct anonymous_id from ev where user_id is null and platform = 'web'
  )
  select jsonb_build_object(
    'from', v_from,
    'to', p_to,
    'platform', p_platform,

    'totals', (
      select jsonb_build_object(
        'events', count(*),
        'members', count(distinct user_id),
        'devices', count(distinct anonymous_id),
        'anonymous_events', count(*) filter (where user_id is null)
      ) from ev
    ),

    'events', coalesce((
      select jsonb_agg(jsonb_build_object('event', event, 'platform', platform, 'count', n, 'people', people) order by n desc)
      from (
        select event, platform, count(*) as n, count(distinct person) as people
        from ev group by event, platform
      ) t
    ), '[]'::jsonb),

    'users', (
      select jsonb_build_object(
        'active', count(distinct a.user_id),
        'new', count(distinct a.user_id) filter (where s.user_id is not null),
        'returning', count(distinct a.user_id) filter (where s.user_id is null),
        'verified', (select count(distinct user_id) from ev where event = 'verification_completed' and user_id is not null),
        'active_meaningful', count(distinct a.user_id) filter (where public.analytics_is_meaningful(a.event, a.props)),
        'engaged', count(distinct a.user_id) filter (where public.analytics_is_engaged(a.event))
      )
      from ev a left join signed_up s on s.user_id = a.user_id
      where a.user_id is not null
    ),

    'sessions', (
      select jsonb_build_object(
        'sessions', count(*),
        'signed_in_sessions', count(*) filter (where signed_in),
        'single_event', count(*) filter (where events = 1),
        'avg_events', round(avg(events)::numeric, 1),
        'avg_seconds', round(avg(seconds)::numeric),
        'median_seconds', round(percentile_cont(0.5) within group (order by seconds)::numeric),
        'p90_seconds', round(percentile_cont(0.9) within group (order by seconds)::numeric),
        'people', (select count(distinct person) from ev where session_id is not null and session_id <> ''),
        'by_platform', coalesce((
          select jsonb_agg(jsonb_build_object('platform', platform, 'sessions', n, 'avg_seconds', avg_s, 'median_seconds', med_s) order by n desc)
          from (
            select platform, count(*) as n, round(avg(seconds)::numeric) as avg_s,
              round(percentile_cont(0.5) within group (order by seconds)::numeric) as med_s
            from sess group by platform
          ) p
        ), '[]'::jsonb),
        'length_buckets', coalesce((
          select jsonb_agg(jsonb_build_object('bucket', bucket, 'sessions', n) order by ord)
          from (
            select case when seconds < 10 then '<10s' when seconds < 60 then '10s–1m' when seconds < 180 then '1–3m'
                        when seconds < 600 then '3–10m' when seconds < 1800 then '10–30m' else '30m+' end as bucket,
                   case when seconds < 10 then 1 when seconds < 60 then 2 when seconds < 180 then 3
                        when seconds < 600 then 4 when seconds < 1800 then 5 else 6 end as ord,
                   count(*) as n
            from sess group by 1, 2
          ) b
        ), '[]'::jsonb)
      ) from sess
    ),

    'screens', coalesce((
      select jsonb_agg(jsonb_build_object('screen', screen, 'views', n, 'people', people, 'avg_dwell_ms', dwell) order by n desc)
      from (
        select coalesce(nullif(props->>'screen', ''), screen, 'unknown') as screen, count(*) as n, count(distinct person) as people,
          avg(case when (props->>'dwell_ms') ~ '^\d+$' then least((props->>'dwell_ms')::bigint, 3600000) end)::integer as dwell
        from ev where event = 'screen_viewed'
        group by 1 order by 2 desc limit 40
      ) t
    ), '[]'::jsonb),

    'versions', coalesce((
      select jsonb_agg(jsonb_build_object('platform', platform, 'app_version', v, 'members', members, 'devices', devices) order by platform, devices desc)
      from (
        select platform, coalesce(nullif(app_version, ''), 'unknown') as v,
          count(distinct user_id) as members, count(distinct anonymous_id) as devices
        from ev where platform in ('ios', 'android')
        group by 1, 2
      ) t
    ), '[]'::jsonb),

    'locales', coalesce((
      select jsonb_agg(jsonb_build_object('locale', l, 'people', people, 'members', members) order by people desc)
      from (
        select coalesce(nullif(split_part(replace(lower(locale), '_', '-'), '-', 1), ''), 'unknown') as l,
          count(distinct person) as people, count(distinct user_id) as members
        from ev group by 1
      ) t
    ), '[]'::jsonb),

    'push', (
      select jsonb_build_object(
        'push_opened', count(*) filter (where event = 'push_opened'),
        'push_openers', count(distinct person) filter (where event = 'push_opened'),
        'app_opened', count(*) filter (where event = 'app_opened'),
        'app_opened_push', count(*) filter (where event = 'app_opened' and props->>'source' = 'push'),
        'app_opened_link', count(*) filter (where event = 'app_opened' and props->>'source' = 'link'),
        'by_type', coalesce((
          select jsonb_agg(jsonb_build_object('push_type', t, 'opens', n, 'people', people) order by n desc)
          from (
            select coalesce(nullif(props->>'push_type', ''), 'unknown') as t, count(*) as n, count(distinct person) as people
            from ev where event = 'push_opened' group by 1
          ) p
        ), '[]'::jsonb)
      ) from ev where event in ('push_opened', 'app_opened')
    ),

    'paywall', (
      with pv as (
        select person, user_id, coalesce(nullif(props->>'from', ''), 'unknown') as src, min(ts) as first_ts
        from ev where event = 'paywall_viewed' group by 1, 2, 3
      ),
      buy as (
        select user_id, min(ts) as ts from ev where event = 'purchase_completed' and user_id is not null group by 1
      )
      select jsonb_build_object(
        'views', (select count(*) from ev where event = 'paywall_viewed'),
        'viewers', (select count(distinct person) from pv),
        'purchases', (select count(*) from ev where event = 'purchase_completed'),
        'purchasers', (select count(*) from buy),
        'converted', (select count(distinct pv.person) from pv join buy b on b.user_id = pv.user_id and b.ts >= pv.first_ts),
        'by_source', coalesce((
          select jsonb_agg(jsonb_build_object('source', src, 'viewers', viewers, 'converted', converted) order by viewers desc)
          from (
            select pv.src, count(distinct pv.person) as viewers,
              count(distinct pv.person) filter (where b.user_id is not null) as converted
            from pv left join buy b on b.user_id = pv.user_id and b.ts >= pv.first_ts
            group by pv.src
          ) s
        ), '[]'::jsonb),
        'by_plan', coalesce((
          select jsonb_agg(jsonb_build_object('product', product, 'plan', plan, 'store', store, 'purchases', n) order by n desc)
          from (
            select coalesce(nullif(props->>'product', ''), 'premium') as product, coalesce(nullif(props->>'plan', ''), '—') as plan,
              coalesce(nullif(props->>'source', ''), platform) as store, count(*) as n
            from ev where event = 'purchase_completed' group by 1, 2, 3
          ) s
        ), '[]'::jsonb)
      )
    ),

    'search', (
      with s as (
        select person, coalesce(nullif(props->>'board', ''), 'all') as board,
          left(lower(btrim(coalesce(props->>'query', ''))), 200) as q,
          (props->>'result_count') = '0' as zero
        from ev where event = 'search_performed'
      )
      select jsonb_build_object(
        'searches', count(*),
        'searchers', count(distinct person),
        'zero_results', count(*) filter (where zero),
        'by_board', coalesce((
          select jsonb_agg(jsonb_build_object('board', board, 'searches', n, 'zero_results', z) order by n desc)
          from (select board, count(*) as n, count(*) filter (where zero) as z from s group by board) b
        ), '[]'::jsonb),
        'top', coalesce((
          select jsonb_agg(jsonb_build_object('query', q, 'board', board, 'searches', n, 'zero_results', z) order by n desc)
          from (select q, board, count(*) as n, count(*) filter (where zero) as z from s where q <> '' group by q, board order by 3 desc limit 30) t
        ), '[]'::jsonb),
        'top_zero', coalesce((
          select jsonb_agg(jsonb_build_object('query', q, 'board', board, 'searches', n) order by n desc)
          from (select q, board, count(*) as n from s where zero and q <> '' group by q, board order by 3 desc limit 30) t
        ), '[]'::jsonb)
      ) from s
    ),

    'filters', coalesce((
      select jsonb_agg(jsonb_build_object('board', board, 'filter', filter, 'value', value, 'uses', n, 'people', people) order by n desc)
      from (
        select coalesce(nullif(props->>'board', ''), 'all') as board, coalesce(nullif(props->>'filter', ''), '—') as filter,
          left(coalesce(nullif(props->>'value', ''), '—'), 80) as value, count(*) as n, count(distinct person) as people
        from ev where event = 'filter_applied'
        group by 1, 2, 3 order by 4 desc limit 50
      ) t
    ), '[]'::jsonb),

    'content', (
      select jsonb_build_object(
        'by_type', coalesce((
          select jsonb_agg(jsonb_build_object('type', target_type, 'views', n, 'viewers', people, 'items', items,
                                              'avg_dwell_ms', dwell, 'saves', saves, 'inquiries', inq) order by n desc)
          from (
            select v.target_type, count(*) as n, count(distinct v.person) as people, count(distinct v.target_id) as items,
              avg(v.dwell)::integer as dwell,
              (select count(*) from ev where event = 'post_saved' and coalesce(nullif(props->>'post_type', ''), 'community') = v.target_type) as saves,
              (select count(*) from ev where event = 'listing_inquiry_sent' and coalesce(nullif(props->>'listing_type', ''), 'housing') = v.target_type) as inq
            from views v group by v.target_type
          ) t
        ), '[]'::jsonb),
        'top', coalesce((
          select jsonb_agg(jsonb_build_object('group', grp, 'type', target_type, 'id', target_id, 'title', title, 'views', n,
                                              'viewers', people, 'avg_dwell_ms', dwell) order by grp, n desc)
          from (
            select *, row_number() over (partition by grp order by n desc, people desc) as rk
            from (
              select case when target_type in ('company', 'job') then target_type else 'post' end as grp,
                target_type, target_id, max(title) as title, count(*) as n, count(distinct person) as people,
                avg(dwell)::integer as dwell
              from views where coalesce(target_id, '') <> ''
              group by 1, 2, 3
            ) g
          ) r where rk <= 15
        ), '[]'::jsonb),
        'saves', (select count(*) from ev where event = 'post_saved'),
        'likes', (select count(*) from ev where event = 'post_liked'),
        'comments', (select count(*) from ev where event = 'comment_created'),
        'posts', (select count(*) from ev where event = 'post_created'),
        'inquiries', (select count(*) from ev where event = 'listing_inquiry_sent'),
        'job_apply_clicks', (select count(*) from ev where event = 'job_apply_clicked'),
        'company_follows', (select count(*) from ev where event = 'company_followed'),
        'reviews', (select count(*) from ev where event = 'review_created'),
        'review_unlocks', (select count(*) from ev where event = 'review_unlocked'),
        'coffee_chats', (select count(*) from ev where event = 'coffee_chat_requested')
      )
    ),

    'points', (
      select jsonb_build_object(
        'earned', coalesce(sum(amt) filter (where event = 'points_earned'), 0),
        'spent', coalesce(sum(amt) filter (where event = 'points_spent'), 0),
        'earners', count(distinct user_id) filter (where event = 'points_earned'),
        'spenders', count(distinct user_id) filter (where event = 'points_spent'),
        'by_reason', coalesce((
          select jsonb_agg(jsonb_build_object('kind', kind, 'reason', reason, 'events', n, 'amount', total, 'members', members) order by total desc)
          from (
            select case when event = 'points_earned' then 'earned' else 'spent' end as kind,
              coalesce(nullif(props->>'reason', ''), 'other') as reason, count(*) as n,
              sum(case when (props->>'amount') ~ '^-?\d+(\.\d+)?$' then abs((props->>'amount')::numeric) else 0 end) as total,
              count(distinct user_id) as members
            from ev where event in ('points_earned', 'points_spent') group by 1, 2
          ) r
        ), '[]'::jsonb)
      )
      from (
        select event, user_id,
          case when (props->>'amount') ~ '^-?\d+(\.\d+)?$' then abs((props->>'amount')::numeric) else 0 end as amt
        from ev where event in ('points_earned', 'points_spent')
      ) p
    ),

    'errors', coalesce((
      select jsonb_agg(jsonb_build_object('screen', s, 'code', c, 'count', n, 'people', people) order by n desc)
      from (
        select coalesce(nullif(props->>'screen', ''), screen, 'unknown') as s, coalesce(nullif(props->>'code', ''), 'unknown') as c,
          count(*) as n, count(distinct person) as people
        from ev where event = 'error_shown' group by 1, 2 order by 3 desc limit 40
      ) t
    ), '[]'::jsonb),

    'tabs', coalesce((
      select jsonb_agg(jsonb_build_object('tab', tab, 'switches', n, 'people', people) order by n desc)
      from (
        select coalesce(nullif(props->>'tab', ''), 'unknown') as tab, count(*) as n, count(distinct person) as people
        from ev where event = 'tab_switched' group by 1 order by 2 desc limit 30
      ) t
    ), '[]'::jsonb),

    'anonymous', (
      select jsonb_build_object(
        'web_visitors', (select count(*) from anon_visitors),
        'linked', (select count(distinct a.anonymous_id) from anon_visitors a join public.analytics_identities i using (anonymous_id)),
        'signed_up', (
          select count(distinct a.anonymous_id) from anon_visitors a
          join public.analytics_identities i using (anonymous_id)
          join signed_up s on s.user_id = i.user_id
        ),
        'sources', coalesce((
          select jsonb_agg(jsonb_build_object('source', src, 'visitors', n, 'signed_up', su) order by n desc)
          from (
            select coalesce(nullif(i.first_touch #>> '{utm,source}', ''), nullif(i.first_touch->>'ref', ''), 'direct / unknown') as src,
              count(*) as n, count(*) filter (where s.user_id is not null) as su
            from anon_visitors a
            left join public.analytics_identities i using (anonymous_id)
            left join signed_up s on s.user_id = i.user_id
            group by 1 order by 2 desc limit 20
          ) t
        ), '[]'::jsonb)
      )
    ),

    'heatmap', coalesce((
      select jsonb_agg(jsonb_build_object('dow', dow, 'hour', hr, 'events', n, 'people', people) order by dow, hr)
      from (
        select extract(dow from local_ts)::int as dow, extract(hour from local_ts)::int as hr,
          count(*) as n, count(distinct person) as people
        from ev where event <> 'screen_viewed'
        group by 1, 2
      ) t
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

revoke all on function public.analytics_breakdown(date, date, text, text) from public, anon, authenticated;
grant execute on function public.analytics_breakdown(date, date, text, text) to service_role;
