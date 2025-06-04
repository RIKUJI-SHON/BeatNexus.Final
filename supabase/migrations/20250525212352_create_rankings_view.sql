/*
  # Create rankings view for BeatNexus

  1. New view `rankings_view`
    - Calculate Battle Points (BP) for each user
    - Show wins, losses, total battles
    - Rank users by season points
    - Include user profile information

  2. Battle Points calculation:
    - Win: +3 BP
    - Loss: +1 BP (participation bonus)
    - Draw: +2 BP each
*/

-- Create rankings view with Battle Points calculation
CREATE OR REPLACE VIEW public.rankings_view AS
WITH battle_results AS (
  -- Get all completed battles with winners
  SELECT 
    b.id as battle_id,
    b.player1_submission_id,
    b.player2_submission_id,
    s1.user_id as player1_id,
    s2.user_id as player2_id,
    b.votes_a,
    b.votes_b,
    CASE 
      WHEN b.votes_a > b.votes_b THEN s1.user_id  -- Player 1 wins
      WHEN b.votes_b > b.votes_a THEN s2.user_id  -- Player 2 wins
      ELSE NULL  -- Draw
    END as winner_id,
    CASE 
      WHEN b.votes_a > b.votes_b THEN s2.user_id  -- Player 2 loses
      WHEN b.votes_b > b.votes_a THEN s1.user_id  -- Player 1 loses
      ELSE NULL  -- Draw
    END as loser_id,
    b.created_at
  FROM public.active_battles b
  JOIN public.submissions s1 ON b.player1_submission_id = s1.id
  JOIN public.submissions s2 ON b.player2_submission_id = s2.id
  WHERE b.status = 'COMPLETED'
),
user_stats AS (
  -- Calculate wins and losses for each user
  SELECT 
    p.id as user_id,
    p.username,
    p.avatar_url,
    -- Count wins
    COALESCE(wins.win_count, 0) as wins,
    -- Count losses
    COALESCE(losses.loss_count, 0) as losses,
    -- Count draws (count each user twice since both get points)
    COALESCE(draws.draw_count, 0) as draws,
    -- Calculate total battles
    COALESCE(wins.win_count, 0) + COALESCE(losses.loss_count, 0) + COALESCE(draws.draw_count, 0) as total_battles,
    -- Calculate Battle Points (BP)
    (COALESCE(wins.win_count, 0) * 3) + 
    (COALESCE(losses.loss_count, 0) * 1) + 
    (COALESCE(draws.draw_count, 0) * 2) as season_points
  FROM public.profiles p
  LEFT JOIN (
    SELECT winner_id as user_id, COUNT(*) as win_count
    FROM battle_results 
    WHERE winner_id IS NOT NULL
    GROUP BY winner_id
  ) wins ON p.id = wins.user_id
  LEFT JOIN (
    SELECT loser_id as user_id, COUNT(*) as loss_count
    FROM battle_results 
    WHERE loser_id IS NOT NULL
    GROUP BY loser_id
  ) losses ON p.id = losses.user_id
  LEFT JOIN (
    -- Count draws for each participant
    SELECT player1_id as user_id, COUNT(*) as draw_count
    FROM battle_results 
    WHERE winner_id IS NULL
    GROUP BY player1_id
    UNION ALL
    SELECT player2_id as user_id, COUNT(*) as draw_count
    FROM battle_results 
    WHERE winner_id IS NULL
    GROUP BY player2_id
  ) draws ON p.id = draws.user_id
)
SELECT 
  user_id,
  username,
  avatar_url,
  wins,
  losses,
  draws,
  total_battles,
  season_points,
  -- Calculate win rate (avoid division by zero)
  CASE 
    WHEN total_battles > 0 THEN ROUND((wins::DECIMAL / total_battles) * 100, 1)
    ELSE 0
  END as win_rate,
  -- Rank users by season points
  RANK() OVER (ORDER BY season_points DESC, wins DESC, total_battles DESC) as rank
FROM user_stats
ORDER BY season_points DESC, wins DESC, total_battles DESC;

-- Create function to get user rank
CREATE OR REPLACE FUNCTION public.get_user_rank(target_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT rank 
    FROM public.rankings_view 
    WHERE user_id = target_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get top rankings
CREATE OR REPLACE FUNCTION public.get_top_rankings(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  wins INTEGER,
  losses INTEGER,
  draws INTEGER,
  total_battles INTEGER,
  season_points INTEGER,
  win_rate NUMERIC,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.*
  FROM public.rankings_view r
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the view
GRANT SELECT ON public.rankings_view TO authenticated, anon;
