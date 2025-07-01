-- This migration updates the vote_battle function to increment
-- the season_vote_points for the user who cast the vote.
-- This ensures that voting activity is tracked for seasonal voter rankings.

CREATE OR REPLACE FUNCTION public.vote_battle(p_battle_id uuid, p_vote text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_battle public.active_battles;
  v_existing_vote public.battle_votes;
  v_player1_user_id UUID;
  v_player2_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'authentication_required',
      'message', 'ログインが必要です'
    );
  END IF;

  -- Validate vote parameter
  IF p_vote NOT IN ('A', 'B') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_vote',
      'message', '投票は A または B である必要があります'
    );
  END IF;

  -- Get battle information
  SELECT * INTO v_battle
  FROM public.active_battles
  WHERE id = p_battle_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'battle_not_found',
      'message', 'バトルが見つかりません'
    );
  END IF;

  -- Check if battle is still active
  IF v_battle.status != 'ACTIVE' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'voting_closed',
      'message', 'このバトルの投票は終了しています'
    );
  END IF;

  -- Check if voting period has expired
  IF v_battle.end_voting_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'voting_expired',
      'message', '投票期間が終了しています'
    );
  END IF;

  -- Get player user IDs to prevent self-voting
  v_player1_user_id := v_battle.player1_user_id;
  v_player2_user_id := v_battle.player2_user_id;

  -- Prevent self-voting
  IF v_user_id = v_player1_user_id OR v_user_id = v_player2_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'self_voting_not_allowed',
      'message', '自分のバトルには投票できません'
    );
  END IF;

  -- Check if user has already voted
  SELECT * INTO v_existing_vote
  FROM public.battle_votes
  WHERE battle_id = p_battle_id AND user_id = v_user_id;

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'already_voted',
      'message', 'このバトルにはすでに投票済みです'
    );
  END IF;

  -- Insert vote
  INSERT INTO public.battle_votes (battle_id, user_id, vote)
  VALUES (p_battle_id, v_user_id, p_vote::"char");

  -- Update vote counts in active_battles
  IF p_vote = 'A' THEN
    UPDATE public.active_battles
    SET votes_a = votes_a + 1
    WHERE id = p_battle_id;
  ELSE
    UPDATE public.active_battles
    SET votes_b = votes_b + 1
    WHERE id = p_battle_id;
  END IF;

  -- Increment user's season vote points
  PERFORM public.increment_season_vote_points(v_user_id);

  -- Increment user's total vote count
  UPDATE public.profiles
  SET vote_count = vote_count + 1
  WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'message', '投票が完了しました',
    'vote', p_vote
  );
END;
$$;

COMMENT ON FUNCTION public.vote_battle(uuid, text) IS 'v2 (Season Ready): Casts a vote and increments the user''s season_vote_points.'; 