-- FINAL DEBUGGING ATTEMPT
-- This migration creates a dedicated log table and modifies the function to write to it.
-- This bypasses the limitations of the log visibility tools.

-- Step 1: Create a table to store our debug logs
CREATE TABLE IF NOT EXISTS public.debug_log (
  id SERIAL PRIMARY KEY,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
GRANT ALL ON TABLE public.debug_log TO postgres, authenticated, service_role;

-- Step 2: Replace the function with a version that writes to the debug_log table.
-- We are using the "correct" logic from the restored function as the base.
CREATE OR REPLACE FUNCTION public.process_expired_battles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  v_winner_id UUID;
  v_loser_id UUID;
  v_player1_rating INTEGER;
  v_player2_rating INTEGER;
  v_rating_calc JSON;
  v_archived_battle_id UUID;
  v_is_tie BOOLEAN;
BEGIN
  -- Log function start
  INSERT INTO public.debug_log (message) VALUES ('DEBUG_LOG: Starting process_expired_battles.');

  FOR rec IN
    SELECT * FROM public.active_battles
    WHERE end_voting_at < now() AND status = 'ACTIVE'
  LOOP
    BEGIN
      -- Log found battle
      INSERT INTO public.debug_log (message) VALUES ('DEBUG_LOG: Found battle ' || rec.id);

      -- Mark as processing
      UPDATE public.active_battles SET status = 'PROCESSING_RESULTS', updated_at = now() WHERE id = rec.id;
      INSERT INTO public.debug_log (message) VALUES ('DEBUG_LOG: Marked battle ' || rec.id || ' as PROCESSING_RESULTS.');

      -- Determine winner, loser, and tie status
      IF rec.votes_a > rec.votes_b THEN
        v_winner_id := rec.player1_user_id;
        v_loser_id := rec.player2_user_id;
        v_is_tie := FALSE;
      ELSIF rec.votes_b > rec.votes_a THEN
        v_winner_id := rec.player2_user_id;
        v_loser_id := rec.player1_user_id;
        v_is_tie := FALSE;
      ELSE
        v_winner_id := NULL; v_loser_id := NULL; v_is_tie := TRUE;
      END IF;
      INSERT INTO public.debug_log (message) VALUES ('DEBUG_LOG: Determined winner for ' || rec.id || '. Is tie: ' || v_is_tie);

      -- Get current ratings
      SELECT rating INTO v_player1_rating FROM public.profiles WHERE id = rec.player1_user_id;
      SELECT rating INTO v_player2_rating FROM public.profiles WHERE id = rec.player2_user_id;
      INSERT INTO public.debug_log (message) VALUES ('DEBUG_LOG: Fetched ratings for ' || rec.id);
      
      IF v_is_tie THEN
        SELECT calculate_tie_rating_with_format(v_player1_rating, v_player2_rating, rec.battle_format) INTO v_rating_calc;
      ELSE
        SELECT calculate_elo_rating_with_format(
          CASE WHEN v_winner_id = rec.player1_user_id THEN v_player1_rating ELSE v_player2_rating END,
          CASE WHEN v_winner_id = rec.player1_user_id THEN v_player2_rating ELSE v_player1_rating END,
          rec.battle_format
        ) INTO v_rating_calc;
      END IF;
      INSERT INTO public.debug_log (message) VALUES ('DEBUG_LOG: Calculated ratings for ' || rec.id);

      -- Update profiles
      IF v_is_tie THEN
        UPDATE public.profiles SET rating = (v_rating_calc->>'player1_rating')::INTEGER, updated_at = now() WHERE id = rec.player1_user_id;
        UPDATE public.profiles SET rating = (v_rating_calc->>'player2_rating')::INTEGER, updated_at = now() WHERE id = rec.player2_user_id;
      ELSE
        UPDATE public.profiles SET rating = (v_rating_calc->>'winner_rating')::INTEGER, updated_at = now() WHERE id = v_winner_id;
        UPDATE public.profiles SET rating = (v_rating_calc->>'loser_rating')::INTEGER, updated_at = now() WHERE id = v_loser_id;
      END IF;
      INSERT INTO public.debug_log (message) VALUES ('DEBUG_LOG: Updated profile ratings for ' || rec.id);

      -- Archive battle
      INSERT INTO public.archived_battles (original_battle_id, winner_id, final_votes_a, final_votes_b, battle_format, player1_user_id, player2_user_id, player1_submission_id, player2_submission_id, archived_at, created_at, updated_at)
      VALUES (rec.id, v_winner_id, rec.votes_a, rec.votes_b, rec.battle_format, rec.player1_user_id, rec.player2_user_id, rec.player1_submission_id, rec.player2_submission_id, now(), now(), now())
      RETURNING id INTO v_archived_battle_id;
      INSERT INTO public.debug_log (message) VALUES ('DEBUG_LOG: Archived battle ' || rec.id);

      -- Archive comments
      INSERT INTO public.archived_battle_votes (archived_battle_id, user_id, vote, comment, created_at)
      SELECT v_archived_battle_id, bv.user_id, bv.vote, bv.comment, bv.created_at FROM public.battle_votes bv WHERE bv.battle_id = rec.id AND bv.comment IS NOT NULL AND bv.comment != '';
      INSERT INTO public.debug_log (message) VALUES ('DEBUG_LOG: Archived comments for ' || rec.id);

      -- Update submissions
      UPDATE public.submissions SET status = 'BATTLE_ENDED', updated_at = now() WHERE id IN (rec.player1_submission_id, rec.player2_submission_id);
      INSERT INTO public.debug_log (message) VALUES ('DEBUG_LOG: Updated submissions for ' || rec.id);
      
      -- Delete active battle
      DELETE FROM public.active_battles WHERE id = rec.id;
      INSERT INTO public.debug_log (message) VALUES ('DEBUG_LOG: Deleted active battle ' || rec.id);

    EXCEPTION WHEN OTHERS THEN
      -- Log the error
      INSERT INTO public.debug_log (message) VALUES ('DEBUG_LOG: ERROR processing battle ' || rec.id || ' with SQLERRM: ' || SQLERRM);
    END;
  END LOOP;
  INSERT INTO public.debug_log (message) VALUES ('DEBUG_LOG: Finished process_expired_battles.');
END;
$$;

COMMENT ON FUNCTION public.process_expired_battles() IS 'v_debug2: Writes detailed execution steps to debug_log table.'; 