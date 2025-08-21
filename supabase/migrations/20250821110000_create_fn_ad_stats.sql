-- Migration: stats refresh + fetch RPCs for ad system (Phase 3)
begin;

-- 1. Refresh function (returns refreshed=true plus rowcount for transparency)
create or replace function public.refresh_mv_ad_stats_daily()
returns table (refreshed boolean, rows int) language plpgsql security definer set search_path = public as $$
declare
  v_before int;
  v_after int;
begin
  -- count before
  select count(*) into v_before from mv_ad_stats_daily;
  refresh materialized view concurrently mv_ad_stats_daily;
  select count(*) into v_after from mv_ad_stats_daily;
  return query select true as refreshed, v_after as rows;
end;$$;
comment on function public.refresh_mv_ad_stats_daily is 'Refresh mv_ad_stats_daily (concurrently) and return row count.';

-- 2. Fetch function (period: '24h' or '7d')
create or replace function public.get_ad_stats(period text,
  p_placement_key text default null,
  p_campaign_id uuid default null,
  p_flight_id uuid default null,
  p_creative_id uuid default null)
returns table (
  day date,
  creative_id uuid,
  placement_id uuid,
  flight_id uuid,
  impressions bigint,
  clicks bigint,
  ctr numeric
) language sql stable as $$
  with base as (
    select * from mv_ad_stats_daily
    where day >= (case when period = '7d' then (current_date - interval '6 days')
                       when period = '24h' then (current_date - interval '1 day')
                       else (current_date - interval '6 days') end)
  ), f as (
    select b.*
    from base b
    left join ad_placements ap on ap.id = b.placement_id
    where (p_placement_key is null or ap.key = p_placement_key)
      and (p_campaign_id is null or exists (
            select 1 from ad_flights f2 where f2.id = b.flight_id and f2.campaign_id = p_campaign_id))
      and (p_flight_id is null or b.flight_id = p_flight_id)
      and (p_creative_id is null or b.creative_id = p_creative_id)
  )
  select 
    day::date,
    creative_id,
    placement_id,
    flight_id,
    sum(impressions)::bigint as impressions,
    sum(clicks)::bigint as clicks,
    case when sum(impressions) > 0 then round((sum(clicks)::numeric / sum(impressions)::numeric)*100, 4) else 0 end as ctr
  from f
  group by 1,2,3,4
  order by day desc;
$$;
comment on function public.get_ad_stats is 'Fetch aggregated ad stats for given period (24h or 7d) filtered optionally by placement key / campaign / flight / creative. Returns day-level rows with CTR%';

commit;
