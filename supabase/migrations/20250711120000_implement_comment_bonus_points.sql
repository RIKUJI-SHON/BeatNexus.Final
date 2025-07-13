-- コメントボーナスポイントシステム実装
-- コメントなしの投票: +1ポイント
-- コメント付きの投票: +3ポイント (ボーナス)

-- 🚨 関数オーバーロード競合の防止
-- 既存の古い vote_battle 関数を削除して、新しい関数との競合を防ぐ
-- エラー対策: PGRST203 "Could not choose the best candidate function"

-- 古い vote_battle(p_battle_id uuid, p_vote text) 関数を削除
DROP FUNCTION IF EXISTS public.vote_battle(p_battle_id uuid, p_vote text);

-- 確認: vote_battle 関数の既存バージョンをログ出力
DO $$
DECLARE
  func_count INTEGER;
BEGIN
  -- 関数の数を確認
  SELECT COUNT(*) INTO func_count
  FROM pg_proc 
  WHERE proname = 'vote_battle';
  
  RAISE NOTICE 'vote_battle functions found before recreation: %', func_count;
  
  -- 関数の詳細をログ出力
  FOR func_count IN 
    SELECT oid FROM pg_proc WHERE proname = 'vote_battle'
  LOOP
    RAISE NOTICE 'Existing vote_battle function: %', 
      (SELECT pg_get_function_arguments(func_count) FROM pg_proc WHERE oid = func_count);
  END LOOP;
END $$;

-- vote_battle関数を修正（コメントなしの投票: +1ポイント）
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
  v_vote_points_increment INTEGER := 0;
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
      -- コメントなしの投票: +1ポイント
      v_vote_points_increment := 1;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- シーズン取得エラーでも投票は続行（season_idはNULLのまま）
    v_season_id := NULL;
    v_vote_points_increment := 0;
  END;

  -- デバッグ情報を作成
  v_debug_info := json_build_object(
    'season_found', v_season_id IS NOT NULL,
    'season_id', v_season_id,
    'season_name', COALESCE(v_current_season.name, 'No active season'),
    'vote_points_increment', v_vote_points_increment,
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

    -- ユーザーの投票数を増加（新規投票のみ）
    -- シーズンがアクティブな場合はシーズンポイントも加算
    -- コメントなしの投票: +1ポイント
    UPDATE profiles 
    SET 
      vote_count = vote_count + 1,
      season_vote_points = season_vote_points + v_vote_points_increment,
      updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  RETURN json_build_object(
    'success', true, 
    'vote', p_vote, 
    'existing_vote', v_existing_vote,
    'season_id', v_season_id,
    'vote_points_added', CASE WHEN v_existing_vote IS NULL THEN v_vote_points_increment ELSE 0 END,
    'vote_type', 'simple_vote',
    'debug', v_debug_info
  );
END;
$$;

-- vote_battle_with_comment関数を修正（コメント付きの投票: +3ポイント）
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
      -- コメント付きの投票: +3ポイント（ボーナス）
      v_vote_points_increment := 3;
    ELSE
      v_current_season_id := NULL;
      v_season_found := FALSE;
      v_vote_points_increment := 0;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    v_current_season_id := NULL;
    v_season_found := FALSE;
    v_vote_points_increment := 0;
  END;

  -- デバッグ情報を作成
  v_debug_info := json_build_object(
    'season_found', v_season_found,
    'season_id', v_current_season_id,
    'has_existing_vote', v_has_existing_vote,
    'vote_points_increment', v_vote_points_increment,
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

    -- ユーザーの投票数を増加（新規投票のみ）
    -- シーズンがアクティブな場合はシーズンポイントも加算
    -- コメント付きの投票: +3ポイント（ボーナス）
    UPDATE public.profiles
    SET 
      vote_count = vote_count + 1,
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
    'vote_type', 'comment_vote',
    'debug', v_debug_info
  );
END;
$$;

-- 関数のコメントを更新
COMMENT ON FUNCTION public.vote_battle(uuid, char) IS 'v6 (Comment Bonus): Simple vote without comment (+1 point for new votes)';
COMMENT ON FUNCTION public.vote_battle_with_comment(uuid, char, text) IS 'v4 (Comment Bonus): Vote with comment (+3 points bonus for new votes)';

-- 権限を確実に付与
GRANT EXECUTE ON FUNCTION public.vote_battle(uuid, char) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vote_battle_with_comment(uuid, char, text) TO authenticated;

-- 🔍 最終検証: 関数オーバーロード競合が解決されたことを確認
DO $$
DECLARE
  func_count INTEGER;
  func_record RECORD;
BEGIN
  -- vote_battle 関数の数を確認
  SELECT COUNT(*) INTO func_count
  FROM pg_proc 
  WHERE proname = 'vote_battle';
  
  RAISE NOTICE '=== 最終検証結果 ===';
  RAISE NOTICE 'vote_battle functions count: %', func_count;
  
  -- 各関数の詳細を表示
  FOR func_record IN 
    SELECT 
      proname,
      pg_get_function_arguments(oid) as arguments,
      pg_get_function_result(oid) as return_type
    FROM pg_proc 
    WHERE proname = 'vote_battle'
    ORDER BY oid
  LOOP
    RAISE NOTICE 'Function: %(%) -> %', 
      func_record.proname, 
      func_record.arguments, 
      func_record.return_type;
  END LOOP;
  
  -- 期待される関数が1つのみであることを確認
  IF func_count = 1 THEN
    RAISE NOTICE '✅ SUCCESS: 関数オーバーロード競合が解決されました';
  ELSE
    RAISE WARNING '⚠️ WARNING: vote_battle関数が%個見つかりました。1個である必要があります。', func_count;
  END IF;
  
  RAISE NOTICE '=== 検証完了 ===';
END $$; 