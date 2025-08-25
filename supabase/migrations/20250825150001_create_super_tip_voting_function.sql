-- SuperTip付き投票機能のSQL関数
-- 通常の投票にSuperTip（有料コメント）を追加する機能

-- 1. SuperTip付き投票関数
CREATE OR REPLACE FUNCTION public.vote_battle_with_super_tip(
  p_battle_id uuid,
  p_vote character,
  p_comment text,
  p_super_tip_amount integer DEFAULT 0,
  p_stripe_payment_intent_id text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
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
  v_season_vote_points_increment INTEGER := 0;
  v_vote_count_increment INTEGER := 3; -- コメント付き投票は+3ポイント
  v_payment_status TEXT := 'none';
  v_voted_player_id UUID;
  v_debug_info JSON;
BEGIN
  -- 現在のユーザーを取得
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- 投票の検証
  IF p_vote NOT IN ('A', 'B') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid vote'
    );
  END IF;

  -- SuperTip金額の検証
  IF p_super_tip_amount < 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid super tip amount'
    );
  END IF;

  -- コメントの検証
  IF p_comment IS NULL OR LENGTH(TRIM(p_comment)) = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Comment is required for super tip votes'
    );
  END IF;

  -- バトル情報を取得
  SELECT * INTO v_battle
  FROM public.active_battles
  WHERE id = p_battle_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Battle not found or not active'
    );
  END IF;

  -- バトルがアクティブかチェック
  IF v_battle.status != 'ACTIVE' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Battle not found or not active'
    );
  END IF;

  -- 投票期間をチェック
  IF v_battle.end_voting_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Voting period has ended'
    );
  END IF;

  -- プレイヤーIDを取得
  v_player1_user_id := v_battle.player1_user_id;
  v_player2_user_id := v_battle.player2_user_id;

  -- 自己投票を防止
  IF v_user_id = v_player1_user_id OR v_user_id = v_player2_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot vote on your own battle'
    );
  END IF;

  -- 既存投票をチェック
  SELECT * INTO v_existing_vote
  FROM public.battle_votes
  WHERE battle_id = p_battle_id AND user_id = v_user_id;

  -- アクティブなシーズンを確認
  SELECT id INTO v_current_season_id 
  FROM public.seasons 
  WHERE status = 'active'
    AND start_at <= NOW()
    AND end_at >= NOW()
  ORDER BY start_at DESC
  LIMIT 1;

  v_season_found := (v_current_season_id IS NOT NULL);

  -- SuperTip用の決済状態を設定
  IF p_super_tip_amount > 0 THEN
    v_payment_status := CASE 
      WHEN p_stripe_payment_intent_id IS NOT NULL THEN 'completed'
      ELSE 'pending'
    END;
  END IF;

  -- 投票されたプレイヤーのIDを取得（通知用）
  IF p_vote = 'A' THEN
    v_voted_player_id := v_player1_user_id;
  ELSE
    v_voted_player_id := v_player2_user_id;
  END IF;

  IF FOUND THEN
    -- 既存投票を更新
    UPDATE public.battle_votes
    SET 
      vote = p_vote,
      comment = p_comment,
      super_tip_amount = p_super_tip_amount,
      stripe_payment_intent_id = p_stripe_payment_intent_id,
      payment_status = v_payment_status,
      season_id = v_current_season_id,
      created_at = NOW()
    WHERE battle_id = p_battle_id AND user_id = v_user_id;

    -- バトルの投票数を更新（変更時）
    IF v_existing_vote.vote = 'A' AND p_vote = 'B' THEN
      UPDATE public.active_battles SET votes_a = votes_a - 1, votes_b = votes_b + 1 WHERE id = p_battle_id;
    ELSIF v_existing_vote.vote = 'B' AND p_vote = 'A' THEN
      UPDATE public.active_battles SET votes_b = votes_b - 1, votes_a = votes_a + 1 WHERE id = p_battle_id;
    END IF;

    v_is_new_vote := FALSE;

  ELSE
    -- 新しい投票を挿入
    INSERT INTO public.battle_votes (
      battle_id, user_id, vote, comment, 
      super_tip_amount, stripe_payment_intent_id, payment_status,
      season_id
    )
    VALUES (
      p_battle_id, v_user_id, p_vote, p_comment,
      p_super_tip_amount, p_stripe_payment_intent_id, v_payment_status,
      v_current_season_id
    );

    -- バトルの投票数を更新
    IF p_vote = 'A' THEN
      UPDATE public.active_battles SET votes_a = votes_a + 1 WHERE id = p_battle_id;
    ELSE
      UPDATE public.active_battles SET votes_b = votes_b + 1 WHERE id = p_battle_id;
    END IF;

    v_is_new_vote := TRUE;
  END IF;

  -- ユーザーのポイントを更新（新規投票時のみ）
  IF v_is_new_vote THEN
    IF v_season_found THEN
      v_season_vote_points_increment := v_vote_count_increment;
      UPDATE public.profiles
      SET 
        vote_count = vote_count + v_vote_count_increment,
        season_vote_points = COALESCE(season_vote_points, 0) + v_season_vote_points_increment,
        updated_at = NOW()
      WHERE id = v_user_id;
    ELSE
      UPDATE public.profiles
      SET 
        vote_count = vote_count + v_vote_count_increment,
        updated_at = NOW()
      WHERE id = v_user_id;
    END IF;
  END IF;

  -- SuperTip通知の作成（金額が0より大きい場合のみ）
  IF p_super_tip_amount > 0 AND v_voted_player_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      related_battle_id,
      is_read,
      created_at,
      updated_at
    ) VALUES (
      v_voted_player_id,
      'SuperTipを受け取りました！',
      FORMAT('¥%s のSuperTipとコメントが届きました：「%s」', 
        p_super_tip_amount, 
        LEFT(p_comment, 100) || CASE WHEN LENGTH(p_comment) > 100 THEN '...' ELSE '' END
      ),
      'super_tip',
      p_battle_id,
      false,
      NOW(),
      NOW()
    );
  END IF;

  -- デバッグ情報作成
  v_debug_info := json_build_object(
    'season_found', v_season_found,
    'is_new_vote', v_is_new_vote,
    'super_tip_amount', p_super_tip_amount,
    'payment_status', v_payment_status,
    'voted_player_id', v_voted_player_id,
    'notification_created', (p_super_tip_amount > 0)
  );

  -- 成功レスポンス
  RETURN json_build_object(
    'success', true,
    'vote', p_vote,
    'comment', p_comment,
    'super_tip_amount', p_super_tip_amount,
    'payment_status', v_payment_status,
    'season_found', v_season_found,
    'is_new_vote', v_is_new_vote,
    'season_vote_points_added', CASE WHEN v_is_new_vote THEN v_season_vote_points_increment ELSE 0 END,
    'vote_count_added', CASE WHEN v_is_new_vote THEN v_vote_count_increment ELSE 0 END,
    'vote_type', 'super_tip_vote',
    'debug', v_debug_info
  );
END;
$$;

-- 関数にコメントを追加
COMMENT ON FUNCTION public.vote_battle_with_super_tip(uuid, character, text, integer, text) 
IS 'SuperTip付き投票機能。通常投票にスーパーチャット風の有料コメントを追加。投票結果には影響せず、金額に応じてコメントが目立つ表示になり、プレイヤーに通知が送信される。';

-- 権限設定
GRANT EXECUTE ON FUNCTION public.vote_battle_with_super_tip TO authenticated;
