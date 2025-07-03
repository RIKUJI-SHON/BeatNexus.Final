-- HOTFIX: This migration ensures the process_expired_battles function is the latest version.
-- The production environment was running an outdated version that did not correctly call
-- the video archiving battle completion logic (complete_battle_with_video_archiving).
-- This caused expired battles to not update user ratings, season points, and video URLs.
-- Applying this migration will overwrite the outdated function with the correct,
-- video-archiving ready version, resolving the critical issue.

CREATE OR REPLACE FUNCTION public.process_expired_battles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  v_winner_id UUID;
  v_is_tie BOOLEAN;
BEGIN
  -- Loop through active battles that have passed their voting end time
  FOR rec IN
    SELECT id, player1_user_id, player2_user_id, votes_a, votes_b
    FROM public.active_battles
    WHERE end_voting_at < now() AND status = 'ACTIVE'
  LOOP
    BEGIN
      -- Mark the battle as 'PROCESSING_RESULTS' to prevent double-processing
      UPDATE public.active_battles
      SET status = 'PROCESSING_RESULTS', updated_at = now()
      WHERE id = rec.id;

      -- Determine the winner or if it's a tie
      IF rec.votes_a > rec.votes_b THEN
        v_winner_id := rec.player1_user_id;
        v_is_tie := FALSE;
      ELSIF rec.votes_b > rec.votes_a THEN
        v_winner_id := rec.player2_user_id;
        v_is_tie := FALSE;
      ELSE
        v_winner_id := NULL; -- It's a tie
        v_is_tie := TRUE;
      END IF;

      -- Call the unified battle completion function with video archiving
      -- This function handles rating, season points, video archiving, and cleanup.
      -- The `p_winner_id` is NULL in case of a tie.
      PERFORM public.complete_battle_with_video_archiving(rec.id, v_winner_id);

    EXCEPTION WHEN OTHERS THEN
      -- If any error occurs, log it and revert the status to 'ACTIVE' for a retry
      RAISE NOTICE 'Error processing battle %: %', rec.id, SQLERRM;
      UPDATE public.active_battles
      SET status = 'ACTIVE'
      WHERE id = rec.id AND status = 'PROCESSING_RESULTS';
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.process_expired_battles() IS 'v6 (Hotfix): Ensures expired battles call complete_battle_with_video_archiving for rating, season points, and video URL updates.'; 