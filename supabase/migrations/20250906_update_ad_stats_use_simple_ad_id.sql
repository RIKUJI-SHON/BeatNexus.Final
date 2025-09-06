-- Migration: Update ad stats objects to use simple_ad_id instead of creative_id
-- Purpose: Align aggregation layer with renamed ad_events.simple_ad_id column
-- Safe to recreate because mv/view/functions are derived only from ad_events (no manual data)

begin;
-- Drop dependent objects (if exist) that still reference creative_id
DROP VIEW IF EXISTS public.vw_ad_stats_daily_with_ctr;
DROP FUNCTION IF EXISTS public.get_ad_stats(text, text, uuid, uuid, uuid);
DROP MATERIALIZED VIEW IF EXISTS public.mv_ad_stats_daily;

-- Recreate materialized view using simple_ad_id
CREATE MATERIALIZED VIEW public.mv_ad_stats_daily AS
SELECT
  date_trunc('day', occurred_at) AS day,
  simple_ad_id,
  placement_id,
  flight_id,
  COUNT(*) FILTER (WHERE type = 'impression') AS impressions,
  COUNT(*) FILTER (WHERE type = 'click') AS clicks
FROM public.ad_events
WHERE occurred_at >= (now() - interval '30 days')
GROUP BY 1,2,3,4;

CREATE INDEX IF NOT EXISTS mv_ad_stats_daily_day_idx ON public.mv_ad_stats_daily (day);

-- Refresh function (non-concurrent: no unique index on MV currently)
CREATE OR REPLACE FUNCTION public.refresh_mv_ad_stats_daily()
RETURNS TABLE (refreshed boolean, rows int) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_after int;
BEGIN
  REFRESH MATERIALIZED VIEW public.mv_ad_stats_daily;
  SELECT COUNT(*) INTO v_after FROM public.mv_ad_stats_daily;
  RETURN QUERY SELECT true, v_after;
END;$$;
COMMENT ON FUNCTION public.refresh_mv_ad_stats_daily IS 'Refresh mv_ad_stats_daily (non-concurrent) and return row count.';

-- Fetch function updated param name p_simple_ad_id
CREATE OR REPLACE FUNCTION public.get_ad_stats(
  period text,
  p_placement_key text DEFAULT NULL,
  p_campaign_id uuid DEFAULT NULL,
  p_flight_id uuid DEFAULT NULL,
  p_simple_ad_id uuid DEFAULT NULL
) RETURNS TABLE (
  day date,
  simple_ad_id uuid,
  placement_id uuid,
  flight_id uuid,
  impressions bigint,
  clicks bigint,
  ctr numeric
) LANGUAGE sql STABLE AS $$
  WITH base AS (
    SELECT * FROM public.mv_ad_stats_daily
    WHERE day >= (
      CASE WHEN period = '7d' THEN (current_date - interval '6 days')
           WHEN period = '24h' THEN (current_date - interval '1 day')
           ELSE (current_date - interval '6 days') END)
  ), f AS (
    SELECT b.*
    FROM base b
    LEFT JOIN ad_placements ap ON ap.id = b.placement_id
    WHERE (p_placement_key IS NULL OR ap.key = p_placement_key)
      AND (p_campaign_id IS NULL OR EXISTS (
           SELECT 1 FROM ad_flights f2 WHERE f2.id = b.flight_id AND f2.campaign_id = p_campaign_id))
      AND (p_flight_id IS NULL OR b.flight_id = p_flight_id)
      AND (p_simple_ad_id IS NULL OR b.simple_ad_id = p_simple_ad_id)
  )
  SELECT
    day::date,
    simple_ad_id,
    placement_id,
    flight_id,
    SUM(impressions)::bigint AS impressions,
    SUM(clicks)::bigint AS clicks,
    CASE WHEN SUM(impressions) > 0 THEN ROUND((SUM(clicks)::numeric / SUM(impressions)::numeric)*100, 4) ELSE 0 END AS ctr
  FROM f
  GROUP BY 1,2,3,4
  ORDER BY day DESC;
$$;
COMMENT ON FUNCTION public.get_ad_stats IS 'Fetch aggregated ad stats (24h or 7d) filtered optionally by placement key / campaign / flight / simple_ad_id. Returns day-level rows with CTR%.';

-- View with computed CTR (simple_ad_id based)
CREATE VIEW public.vw_ad_stats_daily_with_ctr AS
SELECT
  day,
  simple_ad_id,
  placement_id,
  flight_id,
  impressions,
  clicks,
  CASE WHEN impressions > 0 THEN ROUND((clicks::numeric / impressions::numeric)*100, 4) ELSE 0 END AS ctr
FROM public.mv_ad_stats_daily;
COMMENT ON VIEW public.vw_ad_stats_daily_with_ctr IS 'Day-level ad stats (last 30d) with computed CTR% using simple_ad_id';

COMMIT;
