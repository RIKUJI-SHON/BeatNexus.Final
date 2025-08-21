-- Remove ad tracking (impressions/click logging) infrastructure (Phase rollback)
-- Description: Drop ad_events, stats MV, tracking RPC helpers
-- WARNING: Destructive. Backup before applying to production.
begin;

-- Drop lightweight click logger if present
DROP FUNCTION IF EXISTS public.log_ad_click_minimal(uuid, text, uuid, text, uuid, jsonb);

-- Drop serve candidates helper variants (if signature variants existed)
DROP FUNCTION IF EXISTS public.ad_serve_candidates(text, uuid);
DROP FUNCTION IF EXISTS public.ad_serve_candidates(p_placement_key text, p_user_id uuid);

-- Drop materialized view if existed
DROP MATERIALIZED VIEW IF EXISTS public.mv_ad_stats_daily;

-- Drop events table
DROP TABLE IF EXISTS public.ad_events CASCADE;

commit;
