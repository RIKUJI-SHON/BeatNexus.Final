-- This migration fixes the `process_expired_battles` function, which was broken by a previous migration.
-- A faulty migration (20250621140000) overwrote a working version of this function,
-- re-introducing a call to a non-existent function and removing tie-handling logic.
-- This file restores the function to its last known good state from migration 20250619180000,
-- which correctly handles wins, losses, and ties, and properly preserves vote comments.

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
  FOR rec IN
    SELECT * FROM public.active_battles
    WHERE end_voting_at < now() AND status = 'ACTIVE'
  LOOP
    BEGIN
      -- Mark as processing to avoid double handling
      UPDATE public.active_battles
      SET status = 'PROCESSING_RESULTS', updated_at = now()
      WHERE id = rec.id;

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
        v_winner_id := NULL; -- tie
        v_loser_id := NULL;
        v_is_tie := TRUE;
      END IF;

      -- Get current ratings for both players
      SELECT rating INTO v_player1_rating 
      FROM public.profiles WHERE id = rec.player1_user_id;
      
      SELECT rating INTO v_player2_rating 
      FROM public.profiles WHERE id = rec.player2_user_id;

      IF v_is_tie THEN
        -- Handle tie rating calculation
        SELECT calculate_tie_rating_with_format(v_player1_rating, v_player2_rating, rec.battle_format) INTO v_rating_calc;
        
        UPDATE public.profiles 
        SET rating = (v_rating_calc->>'player1_rating')::INTEGER, updated_at = now()
        WHERE id = rec.player1_user_id;
        
        UPDATE public.profiles 
        SET rating = (v_rating_calc->>'player2_rating')::INTEGER, updated_at = now()
        WHERE id = rec.player2_user_id;
        
      ELSE
        -- Handle win/loss rating calculation
        SELECT calculate_elo_rating_with_format(
          CASE WHEN v_winner_id = rec.player1_user_id THEN v_player1_rating ELSE v_player2_rating END,
          CASE WHEN v_winner_id = rec.player1_user_id THEN v_player2_rating ELSE v_player1_rating END,
          rec.battle_format
        ) INTO v_rating_calc;
        
        UPDATE public.profiles 
        SET rating = (v_rating_calc->>'winner_rating')::INTEGER, updated_at = now()
        WHERE id = v_winner_id;
        
        UPDATE public.profiles 
        SET rating = (v_rating_calc->>'loser_rating')::INTEGER, updated_at = now()
        WHERE id = v_loser_id;
      END IF;

      -- Archive into archived_battles
      INSERT INTO public.archived_battles (
        original_battle_id, winner_id, final_votes_a, final_votes_b, battle_format,
        player1_user_id, player2_user_id, player1_submission_id, player2_submission_id,
        archived_at, created_at, updated_at
      ) VALUES (
        rec.id, v_winner_id, rec.votes_a, rec.votes_b, rec.battle_format,
        rec.player1_user_id, rec.player2_user_id, rec.player1_submission_id, rec.player2_submission_id,
        now(), now(), now()
      ) RETURNING id INTO v_archived_battle_id;

      -- Copy vote comments to archived_battle_votes
      INSERT INTO public.archived_battle_votes (
        archived_battle_id, user_id, vote, comment, created_at
      )
      SELECT 
        v_archived_battle_id, bv.user_id, bv.vote, bv.comment, bv.created_at
      FROM public.battle_votes bv
      WHERE bv.battle_id = rec.id AND bv.comment IS NOT NULL AND bv.comment != '';

      -- Update submissions status to BATTLE_ENDED
      UPDATE public.submissions
      SET status = 'BATTLE_ENDED', updated_at = now()
      WHERE id IN (rec.player1_submission_id, rec.player2_submission_id);

      -- Remove from active_battles
      DELETE FROM public.active_battles WHERE id = rec.id;

    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error processing battle %: %', rec.id, SQLERRM;
      -- If something goes wrong, set status back to ACTIVE to retry later
      UPDATE public.active_battles SET status = 'ACTIVE' WHERE id = rec.id AND status = 'PROCESSING_RESULTS';
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.process_expired_battles() IS 'v3 RESTORED: Processes expired battles, correctly handles wins, losses, and ties. Restored from migration 20250619180000 after being broken by a later migration.'; 