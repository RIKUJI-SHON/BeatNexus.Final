-- 投票取り消し関数のコメントボーナスポイント対応
-- コメント付き投票の取り消し: -3ポイント
-- 普通の投票の取り消し: -1ポイント

-- cancel_vote関数を修正（コメント有無に応じた適切なポイント減算）
CREATE OR REPLACE FUNCTION public.cancel_vote(p_battle_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote CHAR(1);
  v_existing_season_id UUID;
  v_existing_comment TEXT;
  v_has_comment BOOLEAN := FALSE;
  v_vote_points_decrement INTEGER := 0;
  v_current_season_id UUID;
  v_debug_info JSON;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- 既存の投票情報を取得（コメントの有無も確認）
  SELECT vote, season_id, comment 
  INTO v_existing_vote, v_existing_season_id, v_existing_comment
  FROM battle_votes
  WHERE battle_id = p_battle_id AND user_id = v_user_id;

  IF v_existing_vote IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No vote to cancel');
  END IF;

  -- コメントの有無を判定
  v_has_comment := v_existing_comment IS NOT NULL AND LENGTH(TRIM(v_existing_comment)) > 0;

  -- アクティブシーズンを取得
  BEGIN
    SELECT id INTO v_current_season_id 
    FROM public.seasons 
    WHERE status = 'active'
      AND start_at <= NOW()
      AND end_at >= NOW()
    ORDER BY start_at DESC
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_current_season_id := NULL;
  END;

  -- ポイント減算量を決定
  IF v_existing_season_id IS NOT NULL THEN
    IF v_has_comment THEN
      -- コメント付き投票の取り消し: -3ポイント
      v_vote_points_decrement := 3;
    ELSE
      -- 普通の投票の取り消し: -1ポイント
      v_vote_points_decrement := 1;
    END IF;
  ELSE
    -- シーズンIDがない場合はポイント減算なし
    v_vote_points_decrement := 0;
  END IF;

  -- デバッグ情報を作成
  v_debug_info := json_build_object(
    'has_comment', v_has_comment,
    'comment_length', COALESCE(LENGTH(v_existing_comment), 0),
    'vote_points_decrement', v_vote_points_decrement,
    'existing_season_id', v_existing_season_id,
    'current_season_id', v_current_season_id,
    'vote_type', CASE WHEN v_has_comment THEN 'comment_vote' ELSE 'simple_vote' END,
    'current_time', NOW()
  );

  -- 投票を削除
  DELETE FROM battle_votes
  WHERE battle_id = p_battle_id AND user_id = v_user_id;

  -- バトルの投票数を更新
  IF v_existing_vote = 'A' THEN
    UPDATE active_battles SET votes_a = votes_a - 1 WHERE id = p_battle_id;
  ELSE
    UPDATE active_battles SET votes_b = votes_b - 1 WHERE id = p_battle_id;
  END IF;

  -- ユーザーの投票数を更新（コメント有無に応じた適切なポイント減算）
  IF v_existing_season_id IS NOT NULL THEN
    UPDATE profiles 
    SET 
      vote_count = GREATEST(0, vote_count - 1),
      season_vote_points = GREATEST(0, season_vote_points - v_vote_points_decrement),
      updated_at = NOW()
    WHERE id = v_user_id;
  ELSE
    -- シーズンIDがない場合は通算投票数のみ減算
    UPDATE profiles 
    SET 
      vote_count = GREATEST(0, vote_count - 1),
      updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  RETURN json_build_object(
    'success', true, 
    'cancelled_vote', v_existing_vote,
    'had_comment', v_has_comment,
    'comment_preview', CASE 
      WHEN v_has_comment THEN LEFT(v_existing_comment, 50) || '...'
      ELSE NULL 
    END,
    'vote_points_deducted', v_vote_points_decrement,
    'had_season_id', v_existing_season_id IS NOT NULL,
    'season_id', v_existing_season_id,
    'vote_type', CASE WHEN v_has_comment THEN 'comment_vote' ELSE 'simple_vote' END,
    'debug', v_debug_info
  );
END;
$$;

-- 関数のコメントを更新
COMMENT ON FUNCTION public.cancel_vote(uuid) IS 'v2 (Comment Bonus): Cancel vote with appropriate point deduction (-3 for comment votes, -1 for simple votes)';

-- 権限を確実に付与
GRANT EXECUTE ON FUNCTION public.cancel_vote(uuid) TO authenticated;

-- 🔍 検証: 関数が正しく更新されたことを確認
DO $$
DECLARE
  func_exists BOOLEAN;
  func_comment TEXT;
BEGIN
  -- 関数の存在確認
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'cancel_vote' 
    AND pg_get_function_arguments(oid) = 'p_battle_id uuid'
  ) INTO func_exists;
  
  -- 関数のコメント取得
  SELECT obj_description(oid) INTO func_comment
  FROM pg_proc 
  WHERE proname = 'cancel_vote' 
  AND pg_get_function_arguments(oid) = 'p_battle_id uuid';
  
  RAISE NOTICE '=== cancel_vote関数更新検証 ===';
  RAISE NOTICE 'Function exists: %', func_exists;
  RAISE NOTICE 'Function comment: %', COALESCE(func_comment, 'No comment');
  
  IF func_exists THEN
    RAISE NOTICE '✅ SUCCESS: cancel_vote関数が正常に更新されました';
  ELSE
    RAISE WARNING '⚠️ WARNING: cancel_vote関数の更新に問題があります';
  END IF;
  
  RAISE NOTICE '=== 検証完了 ===';
END $$; 