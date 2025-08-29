-- ============================================================================
-- Update pg_cron schedule: end_of_season to JST 00:00 (UTC 15:00 previous day)
-- ----------------------------------------------------------------------------
-- Context:
--   - Current dev DB shows cron.job entry:
--       jobname: 'end-of-season-processing', schedule: '5 15 * * *'
--     which corresponds to JST 00:05 (UTC+9).
--   - Request: move to exact midnight JST (00:00), i.e., UTC 15:00 of the previous day.
--   - DB TimeZone: UTC (verified).
--   - Function exists: public.end_current_season()
-- Safety:
--   - If the job exists, alter its schedule.
--   - If not, create it with the desired schedule.
--   - Does not modify other jobs (e.g., start-of-season / matchmaking).
-- ============================================================================

DO $$
DECLARE
  v_jobid INTEGER;
BEGIN
  -- Find the existing end-of-season job by stable jobname
  SELECT jobid INTO v_jobid
  FROM cron.job
  WHERE jobname = 'end-of-season-processing'
  ORDER BY jobid ASC
  LIMIT 1;

  IF v_jobid IS NOT NULL THEN
    -- Update schedule to UTC 15:00 (JST 00:00)
    PERFORM cron.alter_job(v_jobid, schedule => '0 15 * * *');
  ELSE
    -- Fallback: create the job if missing
    PERFORM cron.schedule(
      'end-of-season-processing',        -- job name (unique)
      '0 15 * * *',                      -- every day at 15:00 UTC (00:00 JST)
      $cmd$SELECT public.end_current_season();$cmd$
    );
  END IF;
END $$;

-- Notes:
-- - start-of-season job ('start-new-season-processing') remains unchanged.
-- - end_current_season() already guards with end_at <= NOW(), so bringing
--   execution forward from 00:05 to 00:00 JST will not prematurely end
--   seasons whose end_at is later than the execution time.
