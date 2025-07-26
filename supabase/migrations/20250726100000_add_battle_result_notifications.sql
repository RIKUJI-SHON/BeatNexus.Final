-- 🎯 バトル結果通知システム実装
-- バトル完了時に勝者・敗者双方に通知を送信

-- complete_battle_with_video_archiving 関数を更新してバトル結果通知を追加
CREATE OR REPLACE FUNCTION complete_battle_with_video_archiving(
  p_battle_id UUID,
  p_winner_id UUID DEFAULT NULL
)
RETURNS JSON
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

  -- 2. プレイヤーの削除状態を確認
  SELECT COALESCE(is_deleted, FALSE) INTO v_player1_deleted
  FROM public.profiles 
  WHERE id = v_battle_rec.player1_user_id;

  SELECT COALESCE(is_deleted, FALSE) INTO v_player2_deleted
  FROM public.profiles 
  WHERE id = v_battle_rec.player2_user_id;

  -- 3. プレイヤーのユーザー名を取得（通知用）
  SELECT username INTO v_player1_username
  FROM public.profiles 
  WHERE id = v_battle_rec.player1_user_id;

  SELECT username INTO v_player2_username
  FROM public.profiles 
  WHERE id = v_battle_rec.player2_user_id;

  -- 4. 動画URLを取得（永続保存用）
  SELECT video_url INTO v_player1_video_url
  FROM public.submissions
  WHERE id = v_battle_rec.player1_submission_id;

  SELECT video_url INTO v_player2_video_url
  FROM public.submissions
  WHERE id = v_battle_rec.player2_submission_id;

  -- 5. archived_battlesテーブルに挿入
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
    NOW(),
    NOW(),
    NOW()
  ) RETURNING id INTO v_archived_battle_id;

  -- 6. archived_battle_votes に投票データをコピー
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

  -- 7. submissionsテーブルのステータスを更新
  UPDATE public.submissions
  SET 
    status = 'BATTLE_ENDED',
    updated_at = NOW()
  WHERE id IN (v_battle_rec.player1_submission_id, v_battle_rec.player2_submission_id);

  -- 8. レーティング更新（削除ユーザー考慮）
  SELECT update_battle_ratings_safe(
    p_battle_id,
    p_winner_id,
    v_battle_rec.battle_format
  ) INTO v_rating_result;

  -- 9. シーズンポイント更新
  SELECT update_season_points_after_battle(
    p_battle_id,
    p_winner_id
  ) INTO v_season_result;

  -- 🆕 10. バトル結果通知を送信
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

  -- 11. active_battlesとbattle_votesから削除（CASCADE）
  DELETE FROM public.active_battles WHERE id = p_battle_id;

  -- 12. 成功レスポンスを返す
  RETURN json_build_object(
    'success', true,
    'archived_battle_id', v_archived_battle_id,
    'winner_id', p_winner_id,
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

-- 権限設定
GRANT EXECUTE ON FUNCTION complete_battle_with_video_archiving(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_battle_with_video_archiving(UUID, UUID) TO service_role;

-- コメント
COMMENT ON FUNCTION complete_battle_with_video_archiving(UUID, UUID) IS 'バトル完了処理：アーカイブ、レーティング更新、シーズンポイント更新、バトル結果通知送信を包括的に実行';
