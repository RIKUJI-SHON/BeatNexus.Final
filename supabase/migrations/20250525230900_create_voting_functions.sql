/*
  # Create voting functions for battle system

  1. vote_battle function - cast a vote for a battle
  2. cancel_vote function - cancel an existing vote
  3. get_user_vote function - get user's current vote status

  All functions return JSON responses matching battleStore expectations
*/

-- Function 1: vote_battle
CREATE OR REPLACE FUNCTION vote_battle(p_battle_id UUID, p_vote TEXT)
RETURNS JSON
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
  VALUES (p_battle_id, v_user_id, p_vote);

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

  RETURN json_build_object(
    'success', true,
    'message', '投票が完了しました',
    'vote', p_vote
  );
END;
$$;

-- Function 2: cancel_vote
CREATE OR REPLACE FUNCTION cancel_vote(p_battle_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_battle public.active_battles;
  v_existing_vote public.battle_votes;
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
      'message', 'このバトルの投票は終了しており、取り消しできません'
    );
  END IF;

  -- Check if voting period has expired
  IF v_battle.end_voting_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'voting_expired',
      'message', '投票期間が終了しており、取り消しできません'
    );
  END IF;

  -- Check if user has voted
  SELECT * INTO v_existing_vote
  FROM public.battle_votes
  WHERE battle_id = p_battle_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_vote_found',
      'message', 'このバトルには投票していません'
    );
  END IF;

  -- Remove vote
  DELETE FROM public.battle_votes
  WHERE battle_id = p_battle_id AND user_id = v_user_id;

  -- Update vote counts in active_battles
  IF v_existing_vote.vote = 'A' THEN
    UPDATE public.active_battles
    SET votes_a = votes_a - 1
    WHERE id = p_battle_id;
  ELSE
    UPDATE public.active_battles
    SET votes_b = votes_b - 1
    WHERE id = p_battle_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', '投票を取り消しました',
    'cancelled_vote', v_existing_vote.vote
  );
END;
$$;

-- Function 3: get_user_vote
CREATE OR REPLACE FUNCTION get_user_vote(p_battle_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote public.battle_votes;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', true,
      'has_voted', false,
      'vote', null
    );
  END IF;

  -- Check if user has voted
  SELECT * INTO v_existing_vote
  FROM public.battle_votes
  WHERE battle_id = p_battle_id AND user_id = v_user_id;

  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'has_voted', true,
      'vote', v_existing_vote.vote
    );
  ELSE
    RETURN json_build_object(
      'success', true,
      'has_voted', false,
      'vote', null
    );
  END IF;
END;
$$; 