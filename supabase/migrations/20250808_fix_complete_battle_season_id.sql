-- 20250808_fix_complete_battle_season_id.sql
-- 目的: complete_battle_with_video_archiving関数でseason_idが設定されない問題を修正
-- 対象: 開発環境・本番環境両方

BEGIN;

CREATE OR REPLACE FUNCTION public.complete_battle_with_video_archiving(
  p_battle_id UUID,
  p_winner_id UUID DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
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
  v_current_season_id UUID;  -- 追加: 現在のシーズンID
BEGIN
  -- 1. バトル詳細を取得
  SELECT * INTO v_battle_rec
  FROM public.active_battles
  WHERE id = p_battle_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Battle not found'
    );
  END IF;

  -- 2. 現在のアクティブシーズンIDを取得（追加）
  SELECT id INTO v_current_season_id
  FROM public.seasons
  WHERE status = 'active'
  ORDER BY start_at DESC
  LIMIT 1;

  -- 3. プレイヤーの削除状態を確認
  SELECT COALESCE(is_deleted, FALSE) INTO v_player1_deleted
  FROM public.profiles 
  WHERE id = v_battle_rec.player1_user_id;

  SELECT COALESCE(is_deleted, FALSE) INTO v_player2_deleted
  FROM public.profiles 
  WHERE id = v_battle_rec.player2_user_id;

  -- 4. プレイヤーのユーザー名を取得（通知用）
  SELECT username INTO v_player1_username
  FROM public.profiles 
  WHERE id = v_battle_rec.player1_user_id;

  SELECT username INTO v_player2_username
  FROM public.profiles 
  WHERE id = v_battle_rec.player2_user_id;

  -- 5. 動画URLを取得（永続保存用）
  SELECT video_url INTO v_player1_video_url
  FROM public.submissions
  WHERE id = v_battle_rec.player1_submission_id;

  SELECT video_url INTO v_player2_video_url
  FROM public.submissions
  WHERE id = v_battle_rec.player2_submission_id;

  -- 6. archived_battlesテーブルに挿入（season_id追加）
  INSERT INTO public.archived_battles (
    original_battle_id,
    winner_id,
    final_votes_a,
    final_votes_b,
    battle_format,
    player1_user_id,
    player2_user_id,
    player1_submission_id,
    player2_submission_id,
    player1_video_url,
    player2_video_url,
    season_id,          -- 追加
    archived_at,
    created_at,
    updated_at
  ) VALUES (
    p_battle_id,
    p_winner_id,
    v_battle_rec.votes_a,
    v_battle_rec.votes_b,
    v_battle_rec.battle_format,
    v_battle_rec.player1_user_id,
    v_battle_rec.player2_user_id,
    v_battle_rec.player1_submission_id,
    v_battle_rec.player2_submission_id,
    v_player1_video_url,
    v_player2_video_url,
    v_current_season_id,  -- 追加
    NOW(),
    NOW(),
    NOW()
  ) RETURNING id INTO v_archived_battle_id;

  -- 7. archived_battle_votes に投票データをコピー
  INSERT INTO public.archived_battle_votes (
    archived_battle_id,
    user_id,
    vote,
    comment,
    created_at
  )
  SELECT 
    v_archived_battle_id,
    bv.user_id,
    bv.vote,
    bv.comment,
    bv.created_at
  FROM public.battle_votes bv
  WHERE bv.battle_id = p_battle_id 
    AND bv.comment IS NOT NULL 
    AND bv.comment != '';

  -- 8. submissionsテーブルのステータスを更新
  UPDATE public.submissions
  SET 
    status = 'BATTLE_ENDED',
    updated_at = NOW()
  WHERE id IN (v_battle_rec.player1_submission_id, v_battle_rec.player2_submission_id);

  -- 9. レーティング更新（正しい関数名と引数を使用）
  SELECT update_battle_ratings_safe(
    p_battle_id,
    p_winner_id,
    v_player1_deleted,
    v_player2_deleted
  ) INTO v_rating_result;

  -- 10. シーズンポイント更新（存在する場合のみ）
  BEGIN
    SELECT update_season_points_after_battle(
      p_battle_id,
      p_winner_id
    ) INTO v_season_result;
  EXCEPTION
    WHEN undefined_function THEN
      v_season_result := json_build_object('skipped', true, 'reason', 'function not found');
  END;

  -- 11. バトル結果通知を送信
  -- プレイヤー1への通知
  IF NOT v_player1_deleted THEN
    IF p_winner_id = v_battle_rec.player1_user_id THEN
      -- 勝利通知
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
        v_battle_rec.player1_user_id,
        'バトル勝利！',
        FORMAT('対戦相手 %s さんとのバトルに勝利しました！', COALESCE(v_player2_username, 'Unknown')),
        'battle_win',
        p_battle_id,
        false,
        NOW(),
        NOW()
      );
    ELSIF p_winner_id = v_battle_rec.player2_user_id THEN
      -- 敗北通知
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
        v_battle_rec.player1_user_id,
        'バトル結果',
        FORMAT('対戦相手 %s さんとのバトルは惜敗でした。次回頑張りましょう！', COALESCE(v_player2_username, 'Unknown')),
        'battle_lose',
        p_battle_id,
        false,
        NOW(),
        NOW()
      );
    ELSE
      -- 引き分け通知
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
        v_battle_rec.player1_user_id,
        'バトル結果',
        FORMAT('対戦相手 %s さんとのバトルは引き分けでした。', COALESCE(v_player2_username, 'Unknown')),
        'battle_draw',
        p_battle_id,
        false,
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  -- プレイヤー2への通知
  IF NOT v_player2_deleted THEN
    IF p_winner_id = v_battle_rec.player2_user_id THEN
      -- 勝利通知
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
        v_battle_rec.player2_user_id,
        'バトル勝利！',
        FORMAT('対戦相手 %s さんとのバトルに勝利しました！', COALESCE(v_player1_username, 'Unknown')),
        'battle_win',
        p_battle_id,
        false,
        NOW(),
        NOW()
      );
    ELSIF p_winner_id = v_battle_rec.player1_user_id THEN
      -- 敗北通知
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
        v_battle_rec.player2_user_id,
        'バトル結果',
        FORMAT('対戦相手 %s さんとのバトルは惜敗でした。次回頑張りましょう！', COALESCE(v_player1_username, 'Unknown')),
        'battle_lose',
        p_battle_id,
        false,
        NOW(),
        NOW()
      );
    ELSE
      -- 引き分け通知
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
        v_battle_rec.player2_user_id,
        'バトル結果',
        FORMAT('対戦相手 %s さんとのバトルは引き分けでした。', COALESCE(v_player1_username, 'Unknown')),
        'battle_draw',
        p_battle_id,
        false,
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  -- 12. active_battlesとbattle_votesから削除（CASCADE）
  DELETE FROM public.active_battles WHERE id = p_battle_id;

  -- 13. 成功レスポンスを返す（season_id追加）
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
    'notifications_sent', CASE 
      WHEN v_player1_deleted AND v_player2_deleted THEN 0
      WHEN v_player1_deleted OR v_player2_deleted THEN 1
      ELSE 2
    END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Transaction failed',
      'error_details', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.complete_battle_with_video_archiving(UUID, UUID)
IS 'バトル終了処理：アーカイブ・レーティング更新・動画保存・通知送信・season_id設定を含む包括的処理';

COMMIT;
