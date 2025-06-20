/*
  # Update process_expired_battles() to preserve vote comments

  This migration updates the process_expired_battles() function to copy 
  vote comments from battle_votes to archived_battle_votes before 
  the active battle is deleted.

  Changes:
  1. Add archived_battle_votes INSERT after archived_battles INSERT
  2. Ensure proper transaction handling
  3. Maintain referential integrity
*/

-- Drop and recreate process_expired_battles() function to include comment preservation
DROP FUNCTION IF EXISTS public.process_expired_battles();

CREATE FUNCTION public.process_expired_battles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  v_winner_id UUID;
  v_loser_id UUID;
  v_winner_rating INTEGER;
  v_loser_rating INTEGER;
  v_rating_calc JSON;
  v_archived_battle_id UUID;
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

      -- 2b. Determine winner and loser
      IF rec.votes_a > rec.votes_b THEN
        v_winner_id := rec.player1_user_id;
        v_loser_id := rec.player2_user_id;
      ELSIF rec.votes_b > rec.votes_a THEN
        v_winner_id := rec.player2_user_id;
        v_loser_id := rec.player1_user_id;
      ELSE
        v_winner_id := NULL; -- tie
        v_loser_id := NULL;
      END IF;

      -- 2c. Update ratings if there's a winner (not a tie)
      IF v_winner_id IS NOT NULL AND v_loser_id IS NOT NULL THEN
        -- Get current ratings
        SELECT rating INTO v_winner_rating 
        FROM public.profiles WHERE id = v_winner_id;
        
        SELECT rating INTO v_loser_rating 
        FROM public.profiles WHERE id = v_loser_id;
        
        -- Calculate new ratings using ELO system
        SELECT calculate_elo_rating(v_winner_rating, v_loser_rating) INTO v_rating_calc;
        
        -- Update ratings in profiles table
        UPDATE public.profiles 
        SET rating = (v_rating_calc->>'winner_rating')::INTEGER,
            updated_at = now()
        WHERE id = v_winner_id;
        
        UPDATE public.profiles 
        SET rating = (v_rating_calc->>'loser_rating')::INTEGER,
            updated_at = now()
        WHERE id = v_loser_id;
        
        -- Log rating changes
        RAISE NOTICE 'Rating updated for battle %: Winner % (% -> %), Loser % (% -> %)', 
          rec.id, 
          v_winner_id, v_winner_rating, (v_rating_calc->>'winner_rating')::INTEGER,
          v_loser_id, v_loser_rating, (v_rating_calc->>'loser_rating')::INTEGER;
      END IF;

      -- 2d. Archive into archived_battles
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
      ) RETURNING id INTO v_archived_battle_id;

      -- 🆕 2d-2. Copy vote comments to archived_battle_votes
      -- This preserves all vote comments before the active battle is deleted
      INSERT INTO public.archived_battle_votes (
        archived_battle_id,
        user_id,
        vote,
        comment,
        created_at
      )
      SELECT 
        v_archived_battle_id,
        bv.user_id,
        bv.vote,
        bv.comment,
        bv.created_at
      FROM public.battle_votes bv
      WHERE bv.battle_id = rec.id
        AND bv.comment IS NOT NULL  -- Only copy votes that have comments
        AND bv.comment != '';       -- Exclude empty comments

      -- Log comment copying
      RAISE NOTICE 'Copied % vote comments for archived battle %', 
        (SELECT COUNT(*) FROM public.battle_votes 
         WHERE battle_id = rec.id 
           AND comment IS NOT NULL 
           AND comment != ''), 
        v_archived_battle_id;

      -- 2e. Update submissions status to BATTLE_ENDED
      UPDATE public.submissions
      SET status = 'BATTLE_ENDED', updated_at = now()
      WHERE id IN (rec.player1_submission_id, rec.player2_submission_id);

      -- 2f. Remove from active_battles (this will CASCADE delete battle_votes)
      DELETE FROM public.active_battles WHERE id = rec.id;

    EXCEPTION WHEN OTHERS THEN
      -- 2g. Log error and continue with next battle
      RAISE NOTICE 'Error processing battle %: %', rec.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.process_expired_battles() TO postgres;

-- Add comment to document this update
COMMENT ON FUNCTION public.process_expired_battles() IS 'Processes expired battles, calculates ratings, and preserves vote comments in archived_battle_votes table'; 