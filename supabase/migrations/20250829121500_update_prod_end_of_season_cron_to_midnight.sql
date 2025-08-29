-- ============================================================================
-- Production: Update pg_cron schedule for end-of-season to JST 00:00
-- ----------------------------------------------------------------------------
-- Handles both jobname variants:
--   - 'end-season-job' (observed in production)
--   - 'end-of-season-processing' (compatibility)
-- If none found, creates 'end-season-job' with the desired schedule.
-- ============================================================================

DO $$
DECLARE
  v_jobid INTEGER;
BEGIN
  -- Prefer the production jobname
  SELECT jobid INTO v_jobid
  FROM cron.job
  WHERE jobname = 'end-season-job'
  ORDER BY jobid ASC
  LIMIT 1;

  IF v_jobid IS NULL THEN
    -- Fallback to legacy/dev naming if present
    SELECT jobid INTO v_jobid
    FROM cron.job
    WHERE jobname = 'end-of-season-processing'
    ORDER BY jobid ASC
    LIMIT 1;
  END IF;

  IF v_jobid IS NOT NULL THEN
    -- Update schedule to UTC 15:00 (JST 00:00)
    PERFORM cron.alter_job(v_jobid, schedule => '0 15 * * *');
  ELSE
    -- Create with the production jobname when missing
    PERFORM cron.schedule(
      'end-season-job',                   -- job name (unique in prod)
      '0 15 * * *',                      -- every day at 15:00 UTC (00:00 JST)
      $cmd$SELECT public.end_current_season();$cmd$
    );
  END IF;
END $$;
