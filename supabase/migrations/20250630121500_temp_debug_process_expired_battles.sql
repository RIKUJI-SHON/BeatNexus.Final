-- TEMPORARY DEBUGGING MIGRATION
-- This migration replaces the main function with a simple debug version.
-- The goal is to determine if the FOR loop is iterating over the expired battles at all.
-- It will only RAISE a NOTICE for each expired battle it finds.
-- THIS MUST BE REVERTED after debugging is complete.

CREATE OR REPLACE FUNCTION public.process_expired_battles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'DEBUG: Starting process_expired_battles_debug_v1';
  
  FOR rec IN
    SELECT id, status, end_voting_at FROM public.active_battles
    WHERE end_voting_at < now() AND status = 'ACTIVE'
  LOOP
    -- The only action is to raise a notice.
    RAISE NOTICE 'DEBUG: Found expired battle with ID: %', rec.id;
  END LOOP;
  
  RAISE NOTICE 'DEBUG: Finished process_expired_battles_debug_v1';
END;
$$;

COMMENT ON FUNCTION public.process_expired_battles() IS 'v_debug1: TEMPORARY DEBUGGING VERSION. ONLY LOGS FOUND BATTLES. DO NOT LEAVE IN PRODUCTION.'; 