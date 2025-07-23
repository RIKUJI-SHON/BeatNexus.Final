-- 投票関数修正: シーズンの有無に関係なく通算投票カウントを更新
-- 問題: シーズンがアクティブでない場合、vote_countが増加しない
-- 修正: 通算投票カウントは常に増加、シーズンポイントはシーズンがある場合のみ増加

-- vote_battle関数を修正
CREATE OR REPLACE FUNCTION public.vote_battle(p_battle_id uuid, p_vote char(1))
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote CHAR(1);
  v_current_season seasons;
  v_season_id UUID := NULL;
  v_season_vote_points_increment INTEGER := 0;  -- シーズンポイント増加量
  v_debug_info JSON;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_vote NOT IN ('A', 'B') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid vote');
  END IF;

  -- アクティブシーズンを取得（より堅牢なアプローチ）
  BEGIN
    SELECT * INTO v_current_season
    FROM public.seasons
    WHERE status = 'active'
      AND start_at <= NOW()
      AND end_at >= NOW()
    ORDER BY start_at DESC
    LIMIT 1;
    
    IF FOUND THEN
      v_season_id := v_current_season.id;
      v_season_vote_points_increment := 1;  -- シーズンがアクティブな場合のみ+1ポイント
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- シーズン取得エラーでも投票は続行（season_idはNULLのまま）
    v_season_id := NULL;
    v_season_vote_points_increment := 0;
  END;

  -- デバッグ情報を作成
  v_debug_info := json_build_object(
    'season_found', v_season_id IS NOT NULL,
    'season_id', v_season_id,
    'season_name', COALESCE(v_current_season.name, 'No active season'),
    'season_vote_points_increment', v_season_vote_points_increment,
    'vote_type', 'simple_vote',
    'current_time', NOW()
  );

  -- 既存の投票をチェック
  SELECT vote INTO v_existing_vote
  FROM battle_votes
  WHERE battle_id = p_battle_id AND user_id = v_user_id;

  IF v_existing_vote IS NOT NULL THEN
    -- 既存の投票を更新
    UPDATE battle_votes
    SET vote = p_vote, 
        season_id = v_season_id,
        created_at = NOW()
    WHERE battle_id = p_battle_id AND user_id = v_user_id;

    -- バトルの投票数を更新（古い投票を減算、新しい投票を加算）
    IF v_existing_vote = 'A' AND p_vote = 'B' THEN
      UPDATE active_battles SET votes_a = votes_a - 1, votes_b = votes_b + 1 WHERE id = p_battle_id;
    ELSIF v_existing_vote = 'B' AND p_vote = 'A' THEN
      UPDATE active_battles SET votes_b = votes_b - 1, votes_a = votes_a + 1 WHERE id = p_battle_id;
    END IF;

  ELSE
    -- 新しい投票を挿入
    INSERT INTO battle_votes (battle_id, user_id, vote, season_id, created_at)
    VALUES (p_battle_id, v_user_id, p_vote, v_season_id, NOW());

    -- バトルの投票数を更新
    IF p_vote = 'A' THEN
      UPDATE active_battles SET votes_a = votes_a + 1 WHERE id = p_battle_id;
    ELSE
      UPDATE active_battles SET votes_b = votes_b + 1 WHERE id = p_battle_id;
    END IF;

    -- 🔧 修正: ユーザーの投票数を増加（新規投票のみ）
    -- vote_count は常に+1、season_vote_points はシーズンがアクティブな場合のみ増加
    UPDATE profiles 
    SET 
      vote_count = vote_count + 1,  -- 🔧 常に+1（シーズンの有無に関係なく）
      season_vote_points = season_vote_points + v_season_vote_points_increment,  -- シーズンがある場合のみ+1
      updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  RETURN json_build_object(
    'success', true, 
    'vote', p_vote, 
    'existing_vote', v_existing_vote,
    'season_id', v_season_id,
    'season_vote_points_added', CASE WHEN v_existing_vote IS NULL THEN v_season_vote_points_increment ELSE 0 END,
    'vote_count_added', CASE WHEN v_existing_vote IS NULL THEN 1 ELSE 0 END,  -- 🔧 常に+1
    'vote_type', 'simple_vote',
    'debug', v_debug_info
  );
END;
$$;

-- vote_battle_with_comment関数を修正
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
  v_season_vote_points_increment INTEGER := 0;  -- シーズンポイント増加量
  v_vote_count_increment INTEGER := 3;  -- 🔧 通算投票カウント（常に+3）
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
      v_season_vote_points_increment := 3;  -- シーズンがアクティブな場合のみ+3ポイント
    ELSE
      v_current_season_id := NULL;
      v_season_found := FALSE;
      v_season_vote_points_increment := 0;  -- シーズンがない場合は0
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    v_current_season_id := NULL;
    v_season_found := FALSE;
    v_season_vote_points_increment := 0;
  END;

  -- デバッグ情報を作成
  v_debug_info := json_build_object(
    'season_found', v_season_found,
    'season_id', v_current_season_id,
    'has_existing_vote', v_has_existing_vote,
    'season_vote_points_increment', v_season_vote_points_increment,
    'vote_count_increment', v_vote_count_increment,  -- 常に+3
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
    -- vote_count は常に+3、season_vote_points はシーズンがアクティブな場合のみ+3
    UPDATE public.profiles
    SET 
      vote_count = vote_count + v_vote_count_increment,  -- 🔧 常に+3（コメントボーナス）
      season_vote_points = CASE 
        WHEN v_season_found AND v_current_season_id IS NOT NULL 
        THEN COALESCE(season_vote_points, 0) + v_season_vote_points_increment
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
    'season_vote_points_added', CASE WHEN v_is_new_vote THEN v_season_vote_points_increment ELSE 0 END,
    'vote_count_added', CASE WHEN v_is_new_vote THEN v_vote_count_increment ELSE 0 END,  -- 常に+3
    'vote_type', 'comment_vote',
    'debug', v_debug_info
  );
END;
$$;

-- 関数のコメントを更新
COMMENT ON FUNCTION public.vote_battle(uuid, char) IS 'v6 (Fixed Vote Count): Always increments vote_count regardless of season status. Season points only increment when season is active.';

COMMENT ON FUNCTION public.vote_battle_with_comment(uuid, char, text) IS 'v6 (Fixed Vote Count): Always increments vote_count (+3) regardless of season status. Season points (+3) only increment when season is active.';

-- 権限を確実に付与
GRANT EXECUTE ON FUNCTION public.vote_battle(uuid, char) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vote_battle_with_comment(uuid, char, text) TO authenticated;

-- 🔍 検証ログ
DO $$
BEGIN
  RAISE NOTICE '=== 投票関数修正完了 ===';
  RAISE NOTICE '修正内容:';
  RAISE NOTICE '1. vote_battle: vote_count は常に+1（シーズンの有無に関係なく）';
  RAISE NOTICE '2. vote_battle_with_comment: vote_count は常に+3（シーズンの有無に関係なく）';
  RAISE NOTICE '3. season_vote_points: シーズンがアクティブな場合のみ増加';
  RAISE NOTICE '4. 通算ランキングは常に正しく更新される';
  RAISE NOTICE '=== 修正完了 ===';
END $$;
