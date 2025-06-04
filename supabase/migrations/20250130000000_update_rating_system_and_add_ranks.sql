/*
  # Update Rating System and Add Rank System

  1. Update minimum rating from 800 to 1100
  2. Update default rating from 1200 to 1200 (keep same)
  3. Add rank calculation function
  4. Update existing ratings below 1100 to 1100
*/

-- Step 1: Update existing users with rating below 1100 to 1100
UPDATE public.profiles SET rating = 1100 WHERE rating < 1100;

-- Step 2: Update ELO rating calculation function with new minimum rating
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
  
  -- Ensure ratings don't go below minimum (1100) - Updated from 800
  new_winner_rating := GREATEST(new_winner_rating, 1100);
  new_loser_rating := GREATEST(new_loser_rating, 1100);
  
  RETURN json_build_object(
    'winner_rating', new_winner_rating,
    'loser_rating', new_loser_rating,
    'rating_change_winner', new_winner_rating - winner_rating,
    'rating_change_loser', new_loser_rating - loser_rating
  );
END;
$$;

-- Step 3: Create rank calculation function
CREATE OR REPLACE FUNCTION get_rank_from_rating(rating INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  CASE 
    WHEN rating >= 1800 THEN RETURN 'Grandmaster';
    WHEN rating >= 1600 THEN RETURN 'Master';
    WHEN rating >= 1400 THEN RETURN 'Expert';
    WHEN rating >= 1300 THEN RETURN 'Advanced';
    WHEN rating >= 1200 THEN RETURN 'Intermediate';
    WHEN rating >= 1100 THEN RETURN 'Beginner';
    ELSE RETURN 'Unranked';
  END CASE;
END;
$$;

-- Step 4: Create rank color function for UI
CREATE OR REPLACE FUNCTION get_rank_color_from_rating(rating INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  CASE 
    WHEN rating >= 1800 THEN RETURN 'rainbow'; -- Grandmaster: Rainbow/Multicolor
    WHEN rating >= 1600 THEN RETURN 'purple';  -- Master: Purple
    WHEN rating >= 1400 THEN RETURN 'blue';    -- Expert: Blue
    WHEN rating >= 1300 THEN RETURN 'green';   -- Advanced: Green
    WHEN rating >= 1200 THEN RETURN 'yellow';  -- Intermediate: Yellow
    WHEN rating >= 1100 THEN RETURN 'gray';    -- Beginner: Gray
    ELSE RETURN 'unranked';                     -- Unranked: Default
  END CASE;
END;
$$;

-- Step 5: Update rankings_view to include rank information
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
  p.rating as season_points,
  get_rank_from_rating(p.rating) as rank_name,
  get_rank_color_from_rating(p.rating) as rank_color,
  COALESCE(s.battles_won, 0) as battles_won,
  COALESCE(s.battles_lost, 0) as battles_lost,
  CASE 
    WHEN COALESCE(s.battles_won, 0) + COALESCE(s.battles_lost, 0) > 0 
    THEN ROUND((COALESCE(s.battles_won, 0)::NUMERIC / (COALESCE(s.battles_won, 0) + COALESCE(s.battles_lost, 0))) * 100, 1)
    ELSE 0 
  END as win_rate,
  ROW_NUMBER() OVER (ORDER BY p.rating DESC) as position
FROM public.profiles p
LEFT JOIN aggregated_stats s ON p.id = s.user_id
ORDER BY p.rating DESC;

-- Step 6: Enable RLS and permissions for the updated view
ALTER VIEW public.rankings_view OWNER TO postgres;
GRANT SELECT ON public.rankings_view TO authenticated, anon;

-- Step 7: Add helpful comments about the rank system
COMMENT ON FUNCTION get_rank_from_rating(INTEGER) IS 'Returns rank name based on rating: Grandmaster(1800+), Master(1600+), Expert(1400+), Advanced(1300+), Intermediate(1200+), Beginner(1100+)';
COMMENT ON FUNCTION get_rank_color_from_rating(INTEGER) IS 'Returns rank color for UI styling based on rating'; 