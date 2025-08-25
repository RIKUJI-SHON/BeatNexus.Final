-- アーカイブ処理でSuperTip情報を正しく保存するよう修正

-- 1. archived_battle_votes テーブルにhas_super_tipカラムを追加（既に存在する場合はスキップ）
ALTER TABLE public.archived_battle_votes 
ADD COLUMN IF NOT EXISTS has_super_tip BOOLEAN DEFAULT FALSE;

-- 2. complete_battle_with_video_archiving関数を修正してSuperTip情報を保存
CREATE OR REPLACE FUNCTION public.complete_battle_with_video_archiving(
  p_battle_id UUID, 
  p_winner_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_battle_rec active_battles;
  v_archived_battle_id UUID;
  v_player1_video_url TEXT;  
  v_player2_video_url TEXT;
  v_player1_deleted BOOLEAN := FALSE;
  v_player2_deleted BOOLEAN := FALSE;
  v_rating_result JSON;
  v_season_result JSON;
  v_player1_username TEXT;
  v_player2_username TEXT;
  v_player1_language TEXT;
  v_player2_language TEXT;
  v_current_season_id UUID;
  v_json_msg JSON;
  v_player1_outcome TEXT;
  v_player2_outcome TEXT;
BEGIN
  -- バトル情報取得
  SELECT * INTO v_battle_rec FROM public.active_battles WHERE id = p_battle_id;
  IF NOT FOUND THEN 
    RETURN json_build_object('success', false, 'error', 'Battle not found'); 
  END IF;
  
  -- アクティブシーズン取得
  SELECT id INTO v_current_season_id 
  FROM public.seasons 
  WHERE status='active' 
  ORDER BY start_at DESC 
  LIMIT 1;
  
  -- プレイヤー情報取得
  SELECT COALESCE(is_deleted,FALSE), username, language 
  INTO v_player1_deleted, v_player1_username, v_player1_language 
  FROM public.profiles 
  WHERE id = v_battle_rec.player1_user_id;
  
  SELECT COALESCE(is_deleted,FALSE), username, language 
  INTO v_player2_deleted, v_player2_username, v_player2_language 
  FROM public.profiles 
  WHERE id = v_battle_rec.player2_user_id;
  
  -- 動画URL取得
  SELECT video_url INTO v_player1_video_url 
  FROM public.submissions 
  WHERE id = v_battle_rec.player1_submission_id;
  
  SELECT video_url INTO v_player2_video_url 
  FROM public.submissions 
  WHERE id = v_battle_rec.player2_submission_id;
  
  -- アーカイブバトル作成
  INSERT INTO public.archived_battles (
    original_battle_id, winner_id, final_votes_a, final_votes_b, battle_format, 
    player1_user_id, player2_user_id, player1_submission_id, player2_submission_id, 
    player1_video_url, player2_video_url, season_id, archived_at, created_at, updated_at
  )
  VALUES (
    p_battle_id, p_winner_id, v_battle_rec.votes_a, v_battle_rec.votes_b, v_battle_rec.battle_format, 
    v_battle_rec.player1_user_id, v_battle_rec.player2_user_id, v_battle_rec.player1_submission_id, 
    v_battle_rec.player2_submission_id, v_player1_video_url, v_player2_video_url, v_current_season_id, 
    NOW(), NOW(), NOW()
  ) 
  RETURNING id INTO v_archived_battle_id;
  
  -- 🔧 修正: 投票データアーカイブ（SuperTip情報を含む）
  -- 従来の条件（コメントがある投票）に加えて、SuperTipがある投票も保存
  INSERT INTO public.archived_battle_votes (
    archived_battle_id, user_id, vote, comment, created_at,
    super_tip_amount, stripe_payment_intent_id, payment_status, has_super_tip
  )
  SELECT 
    v_archived_battle_id, 
    bv.user_id, 
    bv.vote, 
    bv.comment, 
    bv.created_at,
    bv.super_tip_amount,
    bv.stripe_payment_intent_id,
    bv.payment_status,
    CASE WHEN bv.super_tip_amount IS NOT NULL AND bv.super_tip_amount > 0 THEN TRUE ELSE FALSE END
  FROM public.battle_votes bv 
  WHERE bv.battle_id = p_battle_id 
    AND (
      (bv.comment IS NOT NULL AND bv.comment != '') OR 
      (bv.super_tip_amount IS NOT NULL AND bv.super_tip_amount > 0)
    );
  
  -- submissions ステータス更新
  UPDATE public.submissions 
  SET status='BATTLE_ENDED', updated_at=NOW() 
  WHERE id IN (v_battle_rec.player1_submission_id, v_battle_rec.player2_submission_id);
  
  -- レーティング更新（既存システム）
  SELECT update_battle_ratings_safe(p_battle_id, p_winner_id, v_player1_deleted, v_player2_deleted) 
  INTO v_rating_result;
  
  -- シーズンポイント更新（既存システム）
  BEGIN 
    SELECT update_season_points_after_battle(p_battle_id, p_winner_id) INTO v_season_result; 
  EXCEPTION WHEN undefined_function THEN 
    v_season_result := json_build_object('skipped', true, 'reason', 'function not found'); 
  END;
  
  -- 勝敗結果通知の準備
  IF p_winner_id IS NULL THEN 
    v_player1_outcome:='draw'; v_player2_outcome:='draw';
  ELSIF p_winner_id = v_battle_rec.player1_user_id THEN 
    v_player1_outcome:='win'; v_player2_outcome:='lose';
  ELSIF p_winner_id = v_battle_rec.player2_user_id THEN 
    v_player1_outcome:='lose'; v_player2_outcome:='win';
  ELSE 
    v_player1_outcome:='draw'; v_player2_outcome:='draw'; 
  END IF;
  
  -- バトル結果通知送信
  IF NOT v_player1_deleted THEN
    v_json_msg := public.get_battle_result_notification_text(v_player1_outcome, v_player2_username, v_player1_language);
    INSERT INTO public.notifications (user_id, title, message, type, related_battle_id, is_read, created_at, updated_at)
    VALUES (v_battle_rec.player1_user_id, v_json_msg->>'title', v_json_msg->>'message', 
            CASE v_player1_outcome WHEN 'win' THEN 'battle_win' WHEN 'lose' THEN 'battle_lose' ELSE 'battle_draw' END, 
            p_battle_id, false, NOW(), NOW());
  END IF;
  
  IF NOT v_player2_deleted THEN
    v_json_msg := public.get_battle_result_notification_text(v_player2_outcome, v_player1_username, v_player2_language);
    INSERT INTO public.notifications (user_id, title, message, type, related_battle_id, is_read, created_at, updated_at)
    VALUES (v_battle_rec.player2_user_id, v_json_msg->>'title', v_json_msg->>'message', 
            CASE v_player2_outcome WHEN 'win' THEN 'battle_win' WHEN 'lose' THEN 'battle_lose' ELSE 'battle_draw' END, 
            p_battle_id, false, NOW(), NOW());
  END IF;
  
  -- アクティブバトル削除
  DELETE FROM public.active_battles WHERE id = p_battle_id;
  
  RETURN json_build_object(
    'success', true,
    'archived_battle_id', v_archived_battle_id,
    'winner_id', p_winner_id,
    'season_id', v_current_season_id,
    'final_votes_a', v_battle_rec.votes_a,
    'final_votes_b', v_battle_rec.votes_b,
    'player1_video_url', v_player1_video_url,
    'player2_video_url', v_player2_video_url,
    'player1_deleted', v_player1_deleted,
    'player2_deleted', v_player2_deleted,
    'rating_update', v_rating_result,
    'season_points_update', v_season_result,
    'notifications_sent', CASE WHEN v_player1_deleted AND v_player2_deleted THEN 0 WHEN v_player1_deleted OR v_player2_deleted THEN 1 ELSE 2 END,
    'multilang', true,
    'super_tip_support', true
  );
  
EXCEPTION WHEN OTHERS THEN 
  RETURN json_build_object('success', false, 'error', 'Transaction failed', 'error_details', SQLERRM); 
END;
$$;

-- 3. get_archived_battle_comments_with_super_tips関数を確認・改良
CREATE OR REPLACE FUNCTION public.get_archived_battle_comments_with_super_tips(
  p_archived_battle_id UUID
) RETURNS TABLE (
  id UUID,
  username TEXT,
  avatar_url TEXT,
  comment TEXT,
  vote CHAR(1),
  created_at TIMESTAMPTZ,
  has_super_tip BOOLEAN,
  super_tip_amount INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    abv.id,
    p.username,
    p.avatar_url,
    abv.comment,
    abv.vote,
    abv.created_at,
    COALESCE(abv.has_super_tip, FALSE) as has_super_tip,
    abv.super_tip_amount
  FROM public.archived_battle_votes abv
  JOIN public.profiles p ON p.id = abv.user_id
  WHERE abv.archived_battle_id = p_archived_battle_id
    AND p.is_deleted = FALSE
  ORDER BY 
    abv.super_tip_amount DESC NULLS LAST,  -- SuperTipを金額順で上位表示
    abv.created_at ASC;
END;
$$;

COMMENT ON FUNCTION public.complete_battle_with_video_archiving IS 'バトル完了時のアーカイブ処理（SuperTip対応版）';
COMMENT ON FUNCTION public.get_archived_battle_comments_with_super_tips IS 'アーカイブバトルのコメント取得（SuperTip対応版）';
