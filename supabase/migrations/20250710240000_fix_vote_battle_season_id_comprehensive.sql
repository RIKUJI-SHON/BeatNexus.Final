-- vote_battle関数の包括的修正
-- season_idの設定とシーズンポイント加算の問題を完全に解決

-- まず get_active_season 関数を確実に動作するように修正
DROP FUNCTION IF EXISTS public.get_active_season();

CREATE FUNCTION public.get_active_season()
RETURNS seasons
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_season seasons;
BEGIN
  SELECT * INTO v_season
  FROM public.seasons
  WHERE status = 'active'
    AND start_at <= NOW()
    AND end_at >= NOW()
  ORDER BY start_at DESC
  LIMIT 1;
  
  RETURN v_season;
END;
$$;

-- vote_battle関数を完全に修正
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
    'debug', v_debug_info
  );
END;
$$;

COMMENT ON FUNCTION public.vote_battle(uuid, char) IS 'v5 (Comprehensive Season Fix): Handles voting with proper season_id assignment and season points increment.';

-- 権限を確実に付与
GRANT EXECUTE ON FUNCTION public.get_active_season() TO authenticated;
GRANT EXECUTE ON FUNCTION public.vote_battle(uuid, char) TO authenticated; 