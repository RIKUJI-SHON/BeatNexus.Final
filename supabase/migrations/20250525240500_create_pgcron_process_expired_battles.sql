/*
  # pg_cron scheduled processing of expired active_battles

  1. Enable pg_cron extension
  2. Create process_expired_battles() function
  3. Schedule cron job every 5 minutes
*/

-- 1. Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create function to process expired battles
CREATE OR REPLACE FUNCTION public.process_expired_battles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  v_winner_id UUID;
BEGIN
  FOR rec IN
    SELECT * FROM public.active_battles
    WHERE end_voting_at < now() AND status = 'ACTIVE'
  LOOP
    BEGIN
      -- 2a. Mark as processing to avoid double handling
      UPDATE public.active_battles
      SET status = 'PROCESSING_RESULTS', updated_at = now()
      WHERE id = rec.id;

      -- 2b. Determine winner or tie
      IF rec.votes_a > rec.votes_b THEN
        v_winner_id := rec.player1_user_id;
      ELSIF rec.votes_b > rec.votes_a THEN
        v_winner_id := rec.player2_user_id;
      ELSE
        v_winner_id := NULL; -- tie
      END IF;

      -- 2c. Archive into archived_battles
      INSERT INTO public.archived_battles (
        original_battle_id,
        winner_id,
        final_votes_a,
        final_votes_b,
        battle_format,
        player1_user_id,
        player2_user_id,
        player1_submission_id,
        player2_submission_id,
        archived_at,
        created_at,
        updated_at
      ) VALUES (
        rec.id,
        v_winner_id,
        rec.votes_a,
        rec.votes_b,
        rec.battle_format,
        rec.player1_user_id,
        rec.player2_user_id,
        rec.player1_submission_id,
        rec.player2_submission_id,
        now(),
        now(),
        now()
      );

      -- 2d. Update submissions status to BATTLE_ENDED
      UPDATE public.submissions
      SET status = 'BATTLE_ENDED', updated_at = now()
      WHERE id IN (rec.player1_submission_id, rec.player2_submission_id);

      -- 2e. Remove from active_battles
      DELETE FROM public.active_battles WHERE id = rec.id;

    EXCEPTION WHEN OTHERS THEN
      -- 2f. Log error and continue with next battle
      RAISE NOTICE 'Error processing battle %: %', rec.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- 3. Schedule cron job to run every 5 minutes
SELECT cron.schedule(
  'process_expired_battles',
  '*/5 * * * *',
  $$ SELECT public.process_expired_battles() $$
); 