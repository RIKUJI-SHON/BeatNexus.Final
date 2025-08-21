-- Migration: create view with computed CTR for ad stats (Phase 3 enhancement)
begin;

drop view if exists public.vw_ad_stats_daily_with_ctr;
create view public.vw_ad_stats_daily_with_ctr as
select
  day,
  creative_id,
  placement_id,
  flight_id,
  impressions,
  clicks,
  case when impressions > 0 then round((clicks::numeric / impressions::numeric)*100, 4) else 0 end as ctr
from public.mv_ad_stats_daily;

comment on view public.vw_ad_stats_daily_with_ctr is 'Day-level ad stats (last 30d) with computed CTR% (clicks/impressions*100, 4dp) sourced from mv_ad_stats_daily';

commit;
