-- Fix access for season_rankings_view by allowing SELECT on season_user_metrics under RLS
-- Idempotent: drops existing policies if present, then recreates

SET search_path TO public, auth;

-- Ensure view uses invoker rights (so RLS on underlying tables apply with caller)
ALTER VIEW IF EXISTS public.season_rankings_view SET (security_invoker = true);

-- Grant explicit SELECT on the view to anon/auth (in addition to invoker)
GRANT SELECT ON public.season_rankings_view TO anon, authenticated;

-- season_user_metrics RLS: allow read by anon/authenticated (public data)
ALTER TABLE IF EXISTS public.season_user_metrics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'season_user_metrics' AND policyname = 'season_user_metrics_public_select'
  ) THEN
    EXECUTE 'DROP POLICY season_user_metrics_public_select ON public.season_user_metrics';
  END IF;
END$$;

CREATE POLICY season_user_metrics_public_select
  ON public.season_user_metrics
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Optional: grant table-level select (RLS still applies)
GRANT SELECT ON public.season_user_metrics TO anon, authenticated;

COMMENT ON POLICY season_user_metrics_public_select ON public.season_user_metrics IS 'Allow anyone (anon/authenticated) to read season_user_metrics for rankings view.';
