-- 本番DBから取得した不足している関数を追加
-- 24時間投稿制限システム、レーティング関数、アカウント削除v4システム

-- ====================
-- 投稿制限関数群
-- ====================

-- 24時間投稿制限チェック関数
CREATE OR REPLACE FUNCTION public.check_submission_cooldown(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_last_submission_time TIMESTAMPTZ;
  v_hours_since_last NUMERIC;
  v_cooldown_remaining_minutes INTEGER;
  v_can_submit BOOLEAN;
  v_message TEXT;
BEGIN
  -- ユーザーの最新の投稿時刻を取得
  SELECT created_at INTO v_last_submission_time
  FROM submissions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- 最初の投稿の場合は投稿可能
  IF v_last_submission_time IS NULL THEN
    RETURN json_build_object(
      'can_submit', true,
      'last_submission_time', null,
      'hours_since_last', null,
      'cooldown_remaining_minutes', 0,
      'message', '投稿可能です'
    );
  END IF;

  -- 最後の投稿からの経過時間を計算
  v_hours_since_last := EXTRACT(EPOCH FROM (NOW() - v_last_submission_time)) / 3600;
  
  -- 24時間（1440分）経過しているかチェック
  IF v_hours_since_last >= 24 THEN
    v_can_submit := true;
    v_cooldown_remaining_minutes := 0;
    v_message := '投稿可能です';
  ELSE
    v_can_submit := false;
    v_cooldown_remaining_minutes := CEIL((24 - v_hours_since_last) * 60);
    v_message := '24時間以内に投稿できるのは1本までです。残り時間: ' || 
                 FLOOR(v_cooldown_remaining_minutes / 60) || '時間' ||
                 (v_cooldown_remaining_minutes % 60) || '分';
  END IF;

  RETURN json_build_object(
    'can_submit', v_can_submit,
    'last_submission_time', v_last_submission_time,
    'hours_since_last', ROUND(v_hours_since_last, 2),
    'cooldown_remaining_minutes', v_cooldown_remaining_minutes,
    'message', v_message
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'can_submit', false,
      'error', 'クールダウンチェック中にエラーが発生しました: ' || SQLERRM,
      'last_submission_time', null,
      'hours_since_last', null,
      'cooldown_remaining_minutes', 0,
      'message', 'エラーが発生しました'
    );
END;
$function$;

-- 24時間制限チェック付き投稿作成関数
CREATE OR REPLACE FUNCTION public.create_submission_with_cooldown_check(p_user_id uuid, p_video_url text, p_battle_format battle_format)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_cooldown_check JSON;
  v_can_submit BOOLEAN;
  v_submission_id UUID;
  v_current_rating INTEGER;
BEGIN
  -- まず24時間制限をチェック
  SELECT check_submission_cooldown(p_user_id) INTO v_cooldown_check;
  
  -- JSON から can_submit を抽出
  v_can_submit := (v_cooldown_check->>'can_submit')::boolean;
  
  -- 投稿制限に引っかかった場合はエラーを返す
  IF NOT v_can_submit THEN
    RETURN json_build_object(
      'success', false,
      'error', 'cooldown_active',
      'message', v_cooldown_check->>'message',
      'cooldown_info', v_cooldown_check
    );
  END IF;

  -- 現在のレーティングを取得
  SELECT rating INTO v_current_rating
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_current_rating IS NULL THEN
    v_current_rating := 1200; -- デフォルトレーティング
  END IF;

  -- 投稿を作成
  INSERT INTO submissions (
    user_id,
    video_url,
    battle_format,
    status,
    rank_at_submission,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_video_url,
    p_battle_format,
    'WAITING_OPPONENT',
    v_current_rating,
    NOW(),
    NOW()
  ) RETURNING id INTO v_submission_id;

  RETURN json_build_object(
    'success', true,
    'submission_id', v_submission_id,
    'message', '投稿が作成されました',
    'cooldown_info', v_cooldown_check
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'submission_creation_failed',
      'message', '投稿の作成中にエラーが発生しました: ' || SQLERRM
    );
END;
$function$;

-- ====================
-- レーティングシステム関数
-- ====================

-- バトル形式別Kファクター取得関数
CREATE OR REPLACE FUNCTION public.get_k_factor_by_format(battle_format text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
  CASE battle_format
    WHEN 'MAIN_BATTLE' THEN RETURN 32;
    WHEN 'MINI_BATTLE' THEN RETURN 24;
    WHEN 'THEME_CHALLENGE' THEN RETURN 20;
    ELSE RETURN 32; -- Default to MAIN_BATTLE K-factor for unknown formats
  END CASE;
END;
$function$;

-- ====================
-- アカウント削除システム v4
-- ====================

-- v4版アカウント削除関数（完全メール解放システム）
CREATE OR REPLACE FUNCTION public.safe_delete_user_account_v4(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_has_active_battles BOOLEAN := FALSE;
  v_has_archived_battles BOOLEAN := FALSE;
  v_username TEXT;
  v_original_email TEXT;
  v_permanently_anonymized_email TEXT;
  v_timestamp BIGINT;
  v_video_deletion_result JSON;
  v_identities_deleted INTEGER := 0;
BEGIN
  -- 現在のユーザー名とメールアドレスを取得
  SELECT username INTO v_username FROM profiles WHERE id = p_user_id;
  SELECT email INTO v_original_email FROM auth.users WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- タイムスタンプ付きの完全に一意な匿名化メールアドレスを生成
  v_timestamp := EXTRACT(EPOCH FROM NOW())::BIGINT;
  v_permanently_anonymized_email := 'permanently-deleted-' || v_timestamp || '-' || SUBSTRING(p_user_id::text, 1, 8) || '@void.deleted';

  -- 🎬 ユーザーの動画データを全て削除
  BEGIN
    SELECT delete_user_videos_from_storage(p_user_id) INTO v_video_deletion_result;
  EXCEPTION WHEN OTHERS THEN
    -- 動画削除に失敗してもアカウント削除は継続
    v_video_deletion_result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'deleted_count', 0,
      'failed_count', 0
    );
  END;

  -- アクティブバトルの存在確認
  SELECT EXISTS(
    SELECT 1 FROM active_battles 
    WHERE player1_user_id = p_user_id OR player2_user_id = p_user_id
  ) INTO v_has_active_battles;
  
  -- アーカイブバトルの存在確認
  SELECT EXISTS(
    SELECT 1 FROM archived_battles 
    WHERE player1_user_id = p_user_id OR player2_user_id = p_user_id
  ) INTO v_has_archived_battles;
  
  -- 🆕 auth.identitiesテーブルからも完全削除（メール解放の鍵）
  DELETE FROM auth.identities 
  WHERE user_id = p_user_id 
     OR identity_data::text LIKE '%' || v_original_email || '%';
  GET DIAGNOSTICS v_identities_deleted = ROW_COUNT;
  
  -- アクティブバトルまたはアーカイブバトルがある場合はソフト削除（完全メール解放版）
  IF v_has_active_battles OR v_has_archived_battles THEN
    
    -- 進行中のバトルがある場合は強制終了処理
    IF v_has_active_battles THEN
      UPDATE active_battles 
      SET status = 'PROCESSING_RESULTS',
          updated_at = NOW()
      WHERE (player1_user_id = p_user_id OR player2_user_id = p_user_id)
        AND status = 'ACTIVE';
    END IF;
    
    -- profilesテーブルをソフト削除（匿名化）
    UPDATE profiles 
    SET 
      is_deleted = TRUE,
      deleted_at = NOW(),
      username = 'deleted-user-' || SUBSTRING(p_user_id::text, 1, 8),
      email = v_permanently_anonymized_email,
      avatar_url = NULL,
      bio = 'このアカウントは削除されました',
      updated_at = NOW()
    WHERE id = p_user_id;
    
    -- 🆕 auth.usersテーブルのメールアドレスを完全に匿名化（元のメール情報も完全削除）
    UPDATE auth.users
    SET 
      email = v_permanently_anonymized_email,
      raw_user_meta_data = jsonb_build_object(
        'permanently_deleted', true,
        'deletion_timestamp', v_timestamp,
        'original_email_permanently_released', true,
        'deletion_method', 'soft_delete_with_complete_email_release_v4',
        'identities_deleted', v_identities_deleted,
        'videos_deleted', v_video_deletion_result
      ),
      updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN json_build_object(
      'success', true, 
      'method', 'soft_delete_with_complete_email_release_v4',
      'reason', CASE 
        WHEN v_has_active_battles THEN 'User has active battles'
        ELSE 'User has battle history'
      END,
      'original_username', v_username,
      'original_email_completely_released', true,
      'email_available_for_immediate_reuse', true,
      'identities_deleted', v_identities_deleted,
      'timestamp', v_timestamp,
      'video_cleanup', v_video_deletion_result
    );
    
  ELSE
    -- バトル履歴がない場合は物理削除（完全削除版）
    
    -- 関連データを全て削除
    DELETE FROM battle_votes WHERE user_id = p_user_id;
    DELETE FROM notifications WHERE user_id = p_user_id;
    DELETE FROM submissions WHERE user_id = p_user_id;
    DELETE FROM posts WHERE user_id = p_user_id;
    DELETE FROM comments WHERE user_id = p_user_id;
    DELETE FROM profiles WHERE id = p_user_id;
    
    -- auth.usersからも完全削除
    DELETE FROM auth.users WHERE id = p_user_id;
    
    RETURN json_build_object(
      'success', true, 
      'method', 'complete_physical_delete_v4',
      'reason', 'No battle history found',
      'original_username', v_username,
      'original_email_completely_released', true,
      'email_available_for_immediate_reuse', true,
      'identities_deleted', v_identities_deleted,
      'video_cleanup', v_video_deletion_result
    );
  END IF;
END;
$function$;

-- ====================
-- 権限設定
-- ====================

-- 投稿制限関数の権限
GRANT EXECUTE ON FUNCTION check_submission_cooldown(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_submission_with_cooldown_check(uuid, text, battle_format) TO authenticated;

-- レーティング関数の権限
GRANT EXECUTE ON FUNCTION get_k_factor_by_format(text) TO authenticated;

-- アカウント削除関数の権限
GRANT EXECUTE ON FUNCTION safe_delete_user_account_v4(uuid) TO authenticated;

-- ====================
-- コメント
-- ====================

COMMENT ON FUNCTION check_submission_cooldown(uuid) IS '24時間投稿制限チェック関数：ユーザーの最後の投稿から24時間経過したかを確認し、投稿可能性と残り時間を返す';
COMMENT ON FUNCTION create_submission_with_cooldown_check(uuid, text, battle_format) IS '24時間制限チェック付き投稿作成関数：制限チェック後に安全に投稿を作成する';
COMMENT ON FUNCTION get_k_factor_by_format(text) IS 'バトル形式別Kファクター取得関数：MAIN_BATTLE(32), MINI_BATTLE(24), THEME_CHALLENGE(20)を返す';
COMMENT ON FUNCTION safe_delete_user_account_v4(uuid) IS 'v4版アカウント削除関数：動画ファイル物理削除、完全メール解放、バトル履歴に応じたソフト/物理削除を実行'; 