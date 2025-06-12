-- 20250112120200_fix_email_reuse.sql
-- メールアドレス再利用問題の修正

-- 1. 削除されたユーザーのauth.usersのメールアドレスも匿名化する関数を修正
CREATE OR REPLACE FUNCTION safe_delete_user_account(p_user_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_has_active_battles BOOLEAN := FALSE;
  v_has_archived_battles BOOLEAN := FALSE;
  v_username TEXT;
  v_original_email TEXT;
  v_anonymized_email TEXT;
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

  -- 匿名化用のメールアドレスを生成
  v_anonymized_email := 'deleted-' || SUBSTRING(p_user_id::text, 1, 8) || '@deleted.local';

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
  
  -- アクティブバトルがある場合、またはアーカイブバトルがある場合はソフト削除
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
      email = v_anonymized_email,
      avatar_url = NULL,
      bio = 'このアカウントは削除されました',
      updated_at = NOW()
    WHERE id = p_user_id;
    
    -- 🆕 auth.usersテーブルのメールアドレスも匿名化（重要！）
    UPDATE auth.users
    SET 
      email = v_anonymized_email,
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
          'deleted_at', NOW()::text,
          'original_email_hash', md5(v_original_email)
        ),
      updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN json_build_object(
      'success', true, 
      'method', 'soft_delete',
      'reason', CASE 
        WHEN v_has_active_battles THEN 'User has active battles'
        ELSE 'User has battle history'
      END,
      'original_username', v_username,
      'original_email', v_original_email,
      'anonymized_email', v_anonymized_email,
      'email_freed_for_reuse', true
    );
    
  ELSE
    
    -- バトル履歴もない場合は物理削除を試行
    BEGIN
      -- 関連データを安全な順序で削除
      DELETE FROM notifications WHERE user_id = p_user_id;
      DELETE FROM comments WHERE user_id = p_user_id;
      DELETE FROM posts WHERE user_id = p_user_id;
      DELETE FROM battle_votes WHERE user_id = p_user_id;
      DELETE FROM submissions WHERE user_id = p_user_id;
      
      -- プロフィール削除
      DELETE FROM profiles WHERE id = p_user_id;
      
      -- 🆕 auth.usersも物理削除（メールアドレス完全解放）
      DELETE FROM auth.users WHERE id = p_user_id;
      
      RETURN json_build_object(
        'success', true, 
        'method', 'physical_delete',
        'reason', 'No battle history found',
        'original_username', v_username,
        'original_email', v_original_email,
        'email_freed_for_reuse', true
      );
      
    EXCEPTION WHEN foreign_key_violation THEN
      -- 外部キー制約エラーの場合はソフト削除にフォールバック
      UPDATE profiles 
      SET 
        is_deleted = TRUE,
        deleted_at = NOW(),
        username = 'deleted-user-' || SUBSTRING(p_user_id::text, 1, 8),
        email = v_anonymized_email,
        avatar_url = NULL,
        bio = 'このアカウントは削除されました',
        updated_at = NOW()
      WHERE id = p_user_id;
      
      -- auth.usersも匿名化
      UPDATE auth.users
      SET 
        email = v_anonymized_email,
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
          jsonb_build_object(
            'deleted_at', NOW()::text,
            'original_email_hash', md5(v_original_email)
          ),
        updated_at = NOW()
      WHERE id = p_user_id;
      
      RETURN json_build_object(
        'success', true, 
        'method', 'soft_delete_fallback',
        'reason', 'Foreign key constraints detected',
        'original_username', v_username,
        'original_email', v_original_email,
        'anonymized_email', v_anonymized_email,
        'email_freed_for_reuse', true
      );
    END;
    
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false, 
    'error', SQLERRM,
    'error_detail', SQLSTATE
  );
END;
$$;

-- 2. 既に削除済みのユーザーのauth.usersメールアドレスを匿名化
UPDATE auth.users 
SET 
  email = 'deleted-' || SUBSTRING(id::text, 1, 8) || '@deleted.local',
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'anonymized_at', NOW()::text,
      'reason', 'retroactive_email_anonymization'
    ),
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM profiles WHERE is_deleted = TRUE
);

-- 3. メールアドレス復旧機能（万が一必要な場合）
CREATE OR REPLACE FUNCTION get_original_email_hint(p_user_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_hash TEXT;
BEGIN
  -- 管理者やサポート用：元メールのハッシュのみ返す
  SELECT raw_user_meta_data->>'original_email_hash' INTO v_hash
  FROM auth.users 
  WHERE id = p_user_id;
  
  RETURN v_hash;
END;
$$;

-- 4. コメント追加
COMMENT ON FUNCTION safe_delete_user_account(UUID) IS '改良版：auth.usersのメールアドレスも匿名化し、メールアドレスの再利用を可能にする安全な削除関数。';
COMMENT ON FUNCTION get_original_email_hint(UUID) IS 'サポート用：削除されたユーザーの元メールアドレスのハッシュを取得（復旧時の確認用）。'; 