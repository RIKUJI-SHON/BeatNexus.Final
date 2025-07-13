-- 投票取り消し関数の通算投票カウント修正
-- 問題: cancel_vote関数でコメント付き投票を取り消しても、
-- season_vote_pointsは-3されるが、vote_countは-1しか減算されない
-- 
-- 修正: コメント付き投票の取り消しの場合、vote_countも-3減算するように修正

-- cancel_vote関数を修正（コメント有無に応じた適切な通算投票カウント減算）
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
  v_vote_count_decrement INTEGER := 0;  -- 🆕 通算投票カウント減算用の変数
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
      -- 🔧 修正: コメント付き投票の取り消し: シーズンポイント-3、通算投票カウント-3
      v_vote_points_decrement := 3;
      v_vote_count_decrement := 3;
    ELSE
      -- 普通の投票の取り消し: シーズンポイント-1、通算投票カウント-1
      v_vote_points_decrement := 1;
      v_vote_count_decrement := 1;
    END IF;
  ELSE
    -- シーズンIDがない場合はシーズンポイント減算なし、通算投票カウントのみ-1
    v_vote_points_decrement := 0;
    v_vote_count_decrement := 1;
  END IF;

  -- デバッグ情報を作成
  v_debug_info := json_build_object(
    'has_comment', v_has_comment,
    'comment_length', COALESCE(LENGTH(v_existing_comment), 0),
    'vote_points_decrement', v_vote_points_decrement,
    'vote_count_decrement', v_vote_count_decrement,  -- 🆕 通算投票カウント減算量
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

  -- 🔧 修正: ユーザーの投票数を更新（コメント有無に応じた適切なポイント減算）
  IF v_existing_season_id IS NOT NULL THEN
    UPDATE profiles 
    SET 
      vote_count = GREATEST(0, vote_count - v_vote_count_decrement),  -- 🔧 修正: コメント有無に応じた減算
      season_vote_points = GREATEST(0, season_vote_points - v_vote_points_decrement),
      updated_at = NOW()
    WHERE id = v_user_id;
  ELSE
    -- シーズンIDがない場合は通算投票数のみ減算
    UPDATE profiles 
    SET 
      vote_count = GREATEST(0, vote_count - v_vote_count_decrement),  -- 🔧 修正: コメント有無に応じた減算
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
    'vote_count_deducted', v_vote_count_decrement,  -- 🆕 通算投票カウント減算量
    'had_season_id', v_existing_season_id IS NOT NULL,
    'season_id', v_existing_season_id,
    'vote_type', CASE WHEN v_has_comment THEN 'comment_vote' ELSE 'simple_vote' END,
    'debug', v_debug_info
  );
END;
$$;

-- 関数のコメントを更新
COMMENT ON FUNCTION public.cancel_vote(uuid) IS 'v3 (Fixed Vote Count): Cancel vote with appropriate point deduction - both vote_count and season_vote_points follow comment bonus rules (-3 for comment votes, -1 for simple votes)';

-- 権限を確実に付与
GRANT EXECUTE ON FUNCTION public.cancel_vote(uuid) TO authenticated;

-- 🔍 検証: 修正内容をログ出力
DO $$
BEGIN
  RAISE NOTICE '=== cancel_vote 修正完了 ===';
  RAISE NOTICE 'コメント付き投票の取り消しの場合:';
  RAISE NOTICE '  - vote_count: -3ポイント (修正済み)';
  RAISE NOTICE '  - season_vote_points: -3ポイント (既存)';
  RAISE NOTICE '普通の投票の取り消しの場合:';
  RAISE NOTICE '  - vote_count: -1ポイント (既存)';
  RAISE NOTICE '  - season_vote_points: -1ポイント (既存)';
  RAISE NOTICE '  - 通算投票カウントとシーズンポイントが同じ減算量になります';
  RAISE NOTICE '=== 修正完了 ===';
END $$; 