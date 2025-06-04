/*
  # Add Rating System to BeatNexus

  1. Add rating column to profiles table
  2. Create ELO rating calculation function
  3. Update process_expired_battles() to include rating updates
  4. Create updated rankings_view for rating-based rankings
*/

-- Step 1: Add rating column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 1200 NOT NULL;

-- Add index for rating queries
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON public.profiles(rating);

-- Update existing profiles to have default rating 1200
UPDATE public.profiles SET rating = 1200 WHERE rating IS NULL;

-- Step 2: Create ELO rating calculation function
CREATE OR REPLACE FUNCTION calculate_elo_rating(
  winner_rating INTEGER,
  loser_rating INTEGER,
  k_factor INTEGER DEFAULT 32
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  expected_winner NUMERIC;
  expected_loser NUMERIC;
  new_winner_rating INTEGER;
  new_loser_rating INTEGER;
BEGIN
  -- Calculate expected scores (probability of winning)
  expected_winner := 1.0 / (1.0 + power(10.0, (loser_rating - winner_rating) / 400.0));
  expected_loser := 1.0 / (1.0 + power(10.0, (winner_rating - loser_rating) / 400.0));
  
  -- Calculate new ratings
  new_winner_rating := winner_rating + k_factor * (1.0 - expected_winner);
  new_loser_rating := loser_rating + k_factor * (0.0 - expected_loser);
  
  -- Ensure ratings don't go below minimum (800)
  new_winner_rating := GREATEST(new_winner_rating, 800);
  new_loser_rating := GREATEST(new_loser_rating, 800);
  
  RETURN json_build_object(
    'winner_rating', new_winner_rating,
    'loser_rating', new_loser_rating,
    'rating_change_winner', new_winner_rating - winner_rating,
    'rating_change_loser', new_loser_rating - loser_rating
  );
END;
$$;

-- Step 3: Update process_expired_battles() function to include rating updates
CREATE OR REPLACE FUNCTION public.process_expired_battles()
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
      );

      -- 2e. Update submissions status to BATTLE_ENDED
      UPDATE public.submissions
      SET status = 'BATTLE_ENDED', updated_at = now()
      WHERE id IN (rec.player1_submission_id, rec.player2_submission_id);

      -- 2f. Remove from active_battles
      DELETE FROM public.active_battles WHERE id = rec.id;

    EXCEPTION WHEN OTHERS THEN
      -- 2g. Log error and continue with next battle
      RAISE NOTICE 'Error processing battle %: %', rec.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Step 4: Create updated rankings_view based on rating
DROP VIEW IF EXISTS public.rankings_view CASCADE;

CREATE VIEW public.rankings_view AS
WITH battle_stats AS (
  SELECT 
    winner_id as user_id,
    COUNT(*) as battles_won
  FROM public.archived_battles 
  WHERE winner_id IS NOT NULL
  GROUP BY winner_id
  
  UNION ALL
  
  SELECT 
    player1_user_id as user_id,
    0 as battles_won
  FROM public.archived_battles 
  WHERE winner_id != player1_user_id OR winner_id IS NULL
  
  UNION ALL
  
  SELECT 
    player2_user_id as user_id,
    0 as battles_won
  FROM public.archived_battles 
  WHERE winner_id != player2_user_id OR winner_id IS NULL
),
aggregated_stats AS (
  SELECT 
    user_id,
    SUM(battles_won) as battles_won,
    COUNT(*) - SUM(battles_won) as battles_lost
  FROM battle_stats
  GROUP BY user_id
)
SELECT 
  p.id as user_id,
  p.username,
  p.avatar_url,
  p.rating,
  p.rating as season_points, -- Use rating as season points
  COALESCE(s.battles_won, 0) as battles_won,
  COALESCE(s.battles_lost, 0) as battles_lost,
  ROW_NUMBER() OVER (ORDER BY p.rating DESC) as position
FROM public.profiles p
LEFT JOIN aggregated_stats s ON p.id = s.user_id
ORDER BY p.rating DESC;

-- Step 5: Enable RLS and permissions for the view
ALTER VIEW public.rankings_view OWNER TO postgres;
GRANT SELECT ON public.rankings_view TO authenticated, anon; 