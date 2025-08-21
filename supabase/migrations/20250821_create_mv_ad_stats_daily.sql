-- materialized view for daily ad stats (30 day window focus)
begin;
create materialized view if not exists mv_ad_stats_daily as
select 
  date_trunc('day', occurred_at) as day,
  creative_id,
  placement_id,
  flight_id,
  count(*) filter (where type='impression') as impressions,
  count(*) filter (where type='click') as clicks
from ad_events
where occurred_at >= (now() - interval '30 days')
group by 1,2,3,4;

create index if not exists mv_ad_stats_daily_day_idx on mv_ad_stats_daily (day);
commit;
