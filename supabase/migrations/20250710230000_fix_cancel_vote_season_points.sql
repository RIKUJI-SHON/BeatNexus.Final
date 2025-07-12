-- cancel_vote関数にシーズンポイント減算処理を追加
-- 投票取り消し時に season_vote_points も正しく減算されるように修正

CREATE OR REPLACE FUNCTION public.cancel_vote(p_battle_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote CHAR(1);
  v_existing_season_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get existing vote and season_id
  SELECT vote, season_id INTO v_existing_vote, v_existing_season_id
  FROM battle_votes
  WHERE battle_id = p_battle_id AND user_id = v_user_id;

  IF v_existing_vote IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No vote to cancel');
  END IF;

  -- Remove vote
  DELETE FROM battle_votes
  WHERE battle_id = p_battle_id AND user_id = v_user_id;

  -- Update vote counts in active_battles
  IF v_existing_vote = 'A' THEN
    UPDATE active_battles SET votes_a = votes_a - 1 WHERE id = p_battle_id;
  ELSE
    UPDATE active_battles SET votes_b = votes_b - 1 WHERE id = p_battle_id;
  END IF;

  -- Update user's vote counts (both total and seasonal)
  -- If the cancelled vote had a season_id, also decrement season_vote_points
  IF v_existing_season_id IS NOT NULL THEN
    UPDATE profiles 
    SET 
      vote_count = GREATEST(0, vote_count - 1),
      season_vote_points = GREATEST(0, season_vote_points - 1),
      updated_at = NOW()
    WHERE id = v_user_id;
  ELSE
    -- If no season_id, only decrement total vote_count
    UPDATE profiles 
    SET 
      vote_count = GREATEST(0, vote_count - 1),
      updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  RETURN json_build_object(
    'success', true, 
    'cancelled_vote', v_existing_vote,
    'had_season_id', v_existing_season_id IS NOT NULL,
    'season_id', v_existing_season_id
  );
END;
$$;

COMMENT ON FUNCTION public.cancel_vote(uuid) IS 'v2 (Season Points Fixed): Cancels a vote and properly decrements both vote_count and season_vote_points when applicable.';

-- 権限を確実に付与
GRANT EXECUTE ON FUNCTION public.cancel_vote(uuid) TO authenticated; 