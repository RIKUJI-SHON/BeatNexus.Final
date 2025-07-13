-- コメント付き投票での通算投票カウント修正
-- 問題: vote_battle_with_comment関数でコメント付き投票をしても、
-- season_vote_pointsは+3されるが、vote_countは+1しか増加しない
-- 
-- 修正: コメント付き投票の場合、vote_countも+3増加するように修正

-- 現在の vote_battle_with_comment 関数を修正
CREATE OR REPLACE FUNCTION public.vote_battle_with_comment(
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
  v_has_existing_vote BOOLEAN := FALSE;
  v_vote_points_increment INTEGER := 0;
  v_vote_count_increment INTEGER := 0;  -- 🆕 通算投票カウント用の変数
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
      -- 🔧 修正: コメント付きの投票は通算投票カウントも+3ポイント
      v_vote_points_increment := 3;  -- シーズンポイント: +3
      v_vote_count_increment := 3;   -- 通算投票カウント: +3
    ELSE
      v_current_season_id := NULL;
      v_season_found := FALSE;
      v_vote_points_increment := 0;
      v_vote_count_increment := 0;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    v_current_season_id := NULL;
    v_season_found := FALSE;
    v_vote_points_increment := 0;
    v_vote_count_increment := 0;
  END;

  -- デバッグ情報を作成
  v_debug_info := json_build_object(
    'season_found', v_season_found,
    'season_id', v_current_season_id,
    'has_existing_vote', v_has_existing_vote,
    'vote_points_increment', v_vote_points_increment,
    'vote_count_increment', v_vote_count_increment,  -- 🆕 通算投票カウント増加量
    'vote_type', 'comment_vote',
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

    -- 🔧 修正: ユーザーの投票数を増加（新規投票のみ）
    -- シーズンがアクティブな場合はシーズンポイントも加算
    -- コメント付きの投票: 通算投票カウントも+3ポイント（ボーナス）
    UPDATE public.profiles
    SET 
      vote_count = vote_count + v_vote_count_increment,  -- 🔧 修正: +3ポイント
      season_vote_points = CASE 
        WHEN v_season_found AND v_current_season_id IS NOT NULL 
        THEN COALESCE(season_vote_points, 0) + v_vote_points_increment
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
    'vote_points_added', CASE WHEN v_is_new_vote THEN v_vote_points_increment ELSE 0 END,
    'vote_count_added', CASE WHEN v_is_new_vote THEN v_vote_count_increment ELSE 0 END,  -- 🆕 通算投票カウント増加量
    'vote_type', 'comment_vote',
    'debug', v_debug_info
  );
END;
$$;

-- 関数のコメントを更新
COMMENT ON FUNCTION public.vote_battle_with_comment(uuid, char, text) IS 'v5 (Fixed Vote Count): Vote with comment - both vote_count and season_vote_points get +3 points bonus for new votes';

-- 権限を確実に付与
GRANT EXECUTE ON FUNCTION public.vote_battle_with_comment(uuid, char, text) TO authenticated;

-- 🔍 検証: 修正内容をログ出力
DO $$
BEGIN
  RAISE NOTICE '=== vote_battle_with_comment 修正完了 ===';
  RAISE NOTICE 'コメント付き投票の場合:';
  RAISE NOTICE '  - vote_count: +3ポイント (修正済み)';
  RAISE NOTICE '  - season_vote_points: +3ポイント (既存)';
  RAISE NOTICE '  - 通算投票カウントとシーズンポイントが同じ+3ポイントになります';
  RAISE NOTICE '=== 修正完了 ===';
END $$; 