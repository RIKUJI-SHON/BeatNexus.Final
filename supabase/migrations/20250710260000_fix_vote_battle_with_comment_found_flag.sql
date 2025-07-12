-- vote_battle_with_comment関数のFOUNDフラグ問題を修正
-- 既存投票の判定フラグが上書きされる問題を解決

-- 既存関数を削除
DROP FUNCTION IF EXISTS public.vote_battle_with_comment(uuid, char, text) CASCADE;

CREATE FUNCTION public.vote_battle_with_comment(
  p_battle_id uuid, 
  p_vote char(1), 
  p_comment text
)
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
  v_current_season_id UUID;
  v_season_found BOOLEAN := FALSE;
  v_is_new_vote BOOLEAN := FALSE;
  v_has_existing_vote BOOLEAN := FALSE;  -- 既存投票判定用の明示的なフラグ
  v_debug_info JSON;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Validate vote parameter
  IF p_vote NOT IN ('A', 'B') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid vote'
    );
  END IF;

  -- Get battle information
  SELECT * INTO v_battle
  FROM public.active_battles
  WHERE id = p_battle_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Battle not found or not active'
    );
  END IF;

  -- Check if battle is still active
  IF v_battle.status != 'ACTIVE' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Battle not found or not active'
    );
  END IF;

  -- Check if voting period has expired
  IF v_battle.end_voting_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Voting period has ended'
    );
  END IF;

  -- Get player user IDs to prevent self-voting
  v_player1_user_id := v_battle.player1_user_id;
  v_player2_user_id := v_battle.player2_user_id;

  -- Prevent self-voting
  IF v_user_id = v_player1_user_id OR v_user_id = v_player2_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot vote on your own battle'
    );
  END IF;

  -- Check if user has already voted（明示的なフラグを設定）
  SELECT * INTO v_existing_vote
  FROM public.battle_votes
  WHERE battle_id = p_battle_id AND user_id = v_user_id;

  -- 既存投票の判定結果を明示的に保存
  v_has_existing_vote := FOUND;

  -- アクティブシーズンを取得
  BEGIN
    SELECT id INTO v_current_season_id 
    FROM public.seasons 
    WHERE status = 'active'
      AND start_at <= NOW()
      AND end_at >= NOW()
    ORDER BY start_at DESC
    LIMIT 1;
    
    IF FOUND THEN
      v_season_found := TRUE;
    ELSE
      v_current_season_id := NULL;
      v_season_found := FALSE;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    v_current_season_id := NULL;
    v_season_found := FALSE;
  END;

  -- デバッグ情報を作成
  v_debug_info := json_build_object(
    'season_found', v_season_found,
    'season_id', v_current_season_id,
    'has_existing_vote', v_has_existing_vote,
    'current_time', NOW()
  );

  -- 既存投票の判定を明示的なフラグで行う
  IF v_has_existing_vote THEN
    -- 既存の投票を更新（コメントも更新）
    UPDATE public.battle_votes 
    SET 
      vote = p_vote, 
      comment = p_comment, 
      season_id = v_current_season_id,
      created_at = NOW()
    WHERE battle_id = p_battle_id AND user_id = v_user_id;
    
    -- バトルの投票数を更新（古い投票を減算、新しい投票を加算）
    IF v_existing_vote.vote = 'A' AND p_vote = 'B' THEN
      UPDATE public.active_battles SET votes_a = votes_a - 1, votes_b = votes_b + 1 WHERE id = p_battle_id;
    ELSIF v_existing_vote.vote = 'B' AND p_vote = 'A' THEN
      UPDATE public.active_battles SET votes_b = votes_b - 1, votes_a = votes_a + 1 WHERE id = p_battle_id;
    END IF;

    v_is_new_vote := FALSE;

  ELSE
    -- 新しい投票を挿入
    INSERT INTO public.battle_votes (battle_id, user_id, vote, comment, season_id)
    VALUES (p_battle_id, v_user_id, p_vote, p_comment, v_current_season_id);

    -- バトルの投票数を更新
    IF p_vote = 'A' THEN
      UPDATE public.active_battles SET votes_a = votes_a + 1 WHERE id = p_battle_id;
    ELSE
      UPDATE public.active_battles SET votes_b = votes_b + 1 WHERE id = p_battle_id;
    END IF;

    -- ユーザーの投票数を増加（新規投票のみ）
    -- シーズンがアクティブな場合はシーズンポイントも加算
    UPDATE public.profiles
    SET 
      vote_count = vote_count + 1,
      season_vote_points = CASE 
        WHEN v_season_found AND v_current_season_id IS NOT NULL 
        THEN COALESCE(season_vote_points, 0) + 1
        ELSE season_vote_points
      END,
      updated_at = NOW()
    WHERE id = v_user_id;

    v_is_new_vote := TRUE;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Vote with comment recorded successfully',
    'vote', p_vote,
    'comment', p_comment,
    'season_id', v_current_season_id,
    'season_found', v_season_found,
    'is_new_vote', v_is_new_vote,
    'has_existing_vote', v_has_existing_vote,
    'debug', v_debug_info
  );
END;
$$;

COMMENT ON FUNCTION public.vote_battle_with_comment(uuid, char, text) IS 'v3 (Fixed FOUND Flag): Handles voting with comments, fixed existing vote detection logic.';

-- 権限を確実に付与
GRANT EXECUTE ON FUNCTION public.vote_battle_with_comment(uuid, char, text) TO authenticated; 