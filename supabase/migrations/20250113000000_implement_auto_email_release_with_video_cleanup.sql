-- 🔄 自動メールアドレス解放システム + 動画データ完全削除
-- ソフト削除によるメールアドレス再利用問題の根本的解決 + ストレージクリーンアップ

-- ================================================================
-- 解決方針:
-- 1. 削除時に即座にメールアドレスを一意なタイムスタンプ付きで匿名化
-- 2. 削除されたアカウントに紐づく動画データをSupabase Storageから完全削除
-- 3. バトルアーカイブは動画なしでも閲覧可能に（フロントエンド側でエラーハンドリング）
-- 4. 定期的な自動解放処理でさらに古いメールアドレスをクリーンアップ
-- ================================================================

-- Supabase Storageから動画ファイルを削除する関数
CREATE OR REPLACE FUNCTION delete_user_videos_from_storage(p_user_id uuid)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_video_record RECORD;
  v_deleted_count INTEGER := 0;
  v_failed_count INTEGER := 0;
  v_deleted_urls TEXT[] := '{}';
  v_failed_urls TEXT[] := '{}';
  v_storage_path TEXT;
BEGIN
  -- ユーザーに関連する全ての動画URLを取得
  -- submissions, archived_battlesから動画URLを収集
  FOR v_video_record IN
    -- submissionsテーブルから
    SELECT video_url, 'submissions' as source_table
    FROM submissions 
    WHERE user_id = p_user_id
      AND video_url IS NOT NULL
    UNION
    -- archived_battlesのplayer1_video_url
    SELECT player1_video_url as video_url, 'archived_battles_p1' as source_table
    FROM archived_battles 
    WHERE player1_user_id = p_user_id
      AND player1_video_url IS NOT NULL
    UNION
    -- archived_battlesのplayer2_video_url  
    SELECT player2_video_url as video_url, 'archived_battles_p2' as source_table
    FROM archived_battles 
    WHERE player2_user_id = p_user_id
      AND player2_video_url IS NOT NULL
  LOOP
    BEGIN
      -- Supabase Storage URLからファイルパスを抽出
      -- 例: https://xxx.supabase.co/storage/v1/object/public/videos/path/to/file.mp4
      -- -> videos/path/to/file.mp4
      v_storage_path := regexp_replace(
        v_video_record.video_url, 
        '.*\/storage\/v1\/object\/public\/([^?]+)(\?.*)?$', 
        '\1'
      );
      
      -- Storageから物理削除
      -- storage.objects テーブルから直接削除
      DELETE FROM storage.objects 
      WHERE bucket_id = 'videos' 
        AND name = replace(v_storage_path, 'videos/', '');
      
      IF FOUND THEN
        v_deleted_count := v_deleted_count + 1;
        v_deleted_urls := v_deleted_urls || v_video_record.video_url;
      ELSE
        v_failed_count := v_failed_count + 1;
        v_failed_urls := v_failed_urls || v_video_record.video_url;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      v_failed_count := v_failed_count + 1;
      v_failed_urls := v_failed_urls || v_video_record.video_url;
      -- エラーログは出力するが処理は継続
      RAISE NOTICE 'Failed to delete video: %, Error: %', v_video_record.video_url, SQLERRM;
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'failed_count', v_failed_count,
    'deleted_urls', v_deleted_urls,
    'failed_urls', v_failed_urls,
    'user_id', p_user_id
  );
END;
$$;

-- 改良版削除関数（即座メールアドレス解放 + 動画削除）
CREATE OR REPLACE FUNCTION safe_delete_user_account_v2(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_active_battles BOOLEAN := FALSE;
  v_has_archived_battles BOOLEAN := FALSE;
  v_username TEXT;
  v_original_email TEXT;
  v_anonymized_email TEXT;
  v_timestamp BIGINT;
  v_video_deletion_result JSON;
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

  -- タイムスタンプ付きの一意な匿名化メールアドレスを生成
  v_timestamp := EXTRACT(EPOCH FROM NOW())::BIGINT;
  v_anonymized_email := 'deleted-' || SUBSTRING(p_user_id::text, 1, 8) || '-' || v_timestamp || '@deleted.local';

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
  
  -- アクティブバトルまたはアーカイブバトルがある場合はソフト削除
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
    
    -- 🆕 auth.usersテーブルのメールアドレスを即座に一意な形式で匿名化
    UPDATE auth.users
    SET 
      email = v_anonymized_email,
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
          'deleted_at', NOW()::text,
          'original_email_hash', md5(v_original_email),
          'email_immediately_released', true,
          'deletion_timestamp', v_timestamp,
          'deletion_method', 'soft_delete_with_immediate_email_release',
          'videos_deleted', v_video_deletion_result
        ),
      updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN json_build_object(
      'success', true, 
      'method', 'soft_delete_with_immediate_release',
      'reason', CASE 
        WHEN v_has_active_battles THEN 'User has active battles'
        ELSE 'User has battle history'
      END,
      'original_username', v_username,
      'original_email', v_original_email,
      'anonymized_email', v_anonymized_email,
      'email_freed_for_reuse', true,
      'timestamp', v_timestamp,
      'video_cleanup', v_video_deletion_result
    );
    
  ELSE
    
    -- バトル履歴もない場合は物理削除
    BEGIN
      -- 関連データを安全な順序で削除
      DELETE FROM notifications WHERE user_id = p_user_id;
      DELETE FROM comments WHERE user_id = p_user_id;
      DELETE FROM posts WHERE user_id = p_user_id;
      DELETE FROM battle_votes WHERE user_id = p_user_id;
      DELETE FROM submissions WHERE user_id = p_user_id;
      
      -- プロフィール削除
      DELETE FROM profiles WHERE id = p_user_id;
      
      -- auth.usersも物理削除（メールアドレス完全解放）
      DELETE FROM auth.users WHERE id = p_user_id;
      
      RETURN json_build_object(
        'success', true, 
        'method', 'physical_delete',
        'reason', 'No battle history found',
        'original_username', v_username,
        'original_email', v_original_email,
        'email_freed_for_reuse', true,
        'video_cleanup', v_video_deletion_result
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
      
      -- auth.usersも匿名化（タイムスタンプ付きで一意性確保）
      UPDATE auth.users
      SET 
        email = v_anonymized_email,
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
          jsonb_build_object(
            'deleted_at', NOW()::text,
            'original_email_hash', md5(v_original_email),
            'email_immediately_released', true,
            'deletion_timestamp', v_timestamp,
            'deletion_method', 'soft_delete_fallback_with_immediate_release',
            'videos_deleted', v_video_deletion_result
          ),
        updated_at = NOW()
      WHERE id = p_user_id;
      
      RETURN json_build_object(
        'success', true, 
        'method', 'soft_delete_fallback_with_immediate_release',
        'reason', 'Foreign key constraints detected',
        'original_username', v_username,
        'original_email', v_original_email,
        'anonymized_email', v_anonymized_email,
        'email_freed_for_reuse', true,
        'timestamp', v_timestamp,
        'video_cleanup', v_video_deletion_result
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

-- 方案2: バッチ処理による既存削除済みユーザーの定期的なメールアドレス解放
CREATE OR REPLACE FUNCTION auto_release_deleted_emails()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_record RECORD;
  v_updated_count INTEGER := 0;
  v_new_email TEXT;
  v_timestamp BIGINT;
  v_total_video_cleanup JSON := json_build_object('total_deleted', 0, 'total_failed', 0);
  v_video_result JSON;
BEGIN
  v_timestamp := EXTRACT(EPOCH FROM NOW())::BIGINT;
  
  -- 24時間以上前に削除されたユーザーのメールアドレスを解放
  FOR v_user_record IN
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    JOIN profiles p ON u.id = p.id
    WHERE p.is_deleted = TRUE
      AND p.deleted_at < NOW() - INTERVAL '24 hours'
      AND u.email LIKE '%@deleted.local'
      AND (u.raw_user_meta_data->>'email_immediately_released' IS NULL
           OR u.raw_user_meta_data->>'email_immediately_released' = 'false')
  LOOP
    -- 削除済みユーザーの動画も削除
    BEGIN
      SELECT delete_user_videos_from_storage(v_user_record.id) INTO v_video_result;
    EXCEPTION WHEN OTHERS THEN
      v_video_result := json_build_object('deleted_count', 0, 'failed_count', 0);
    END;
    
    -- 新しいタイムスタンプ付きメールアドレスを生成
    v_new_email := 'auto-released-' || SUBSTRING(v_user_record.id::text, 1, 8) || '-' || v_timestamp || '@deleted.local';
    
    -- auth.usersを更新
    UPDATE auth.users
    SET 
      email = v_new_email,
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
          'email_auto_released_at', NOW()::text,
          'email_immediately_released', true,
          'auto_release_timestamp', v_timestamp,
          'videos_deleted', v_video_result
        ),
      updated_at = NOW()
    WHERE id = v_user_record.id;
    
    -- profilesも更新
    UPDATE profiles
    SET 
      email = v_new_email,
      updated_at = NOW()
    WHERE id = v_user_record.id;
    
    v_updated_count := v_updated_count + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'auto_released_count', v_updated_count,
    'timestamp', v_timestamp,
    'message', 'Automatically released email addresses and cleaned up videos for deleted users'
  );
END;
$$;

-- 既存削除済みユーザーの動画を一括削除する関数
CREATE OR REPLACE FUNCTION cleanup_all_deleted_user_videos()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_record RECORD;
  v_cleaned_count INTEGER := 0;
  v_total_deleted INTEGER := 0;
  v_total_failed INTEGER := 0;
  v_video_result JSON;
BEGIN
  -- 削除済みの全ユーザーを対象
  FOR v_user_record IN
    SELECT p.id, p.username, p.deleted_at
    FROM profiles p
    WHERE p.is_deleted = TRUE
  LOOP
    BEGIN
      SELECT delete_user_videos_from_storage(v_user_record.id) INTO v_video_result;
      
      v_total_deleted := v_total_deleted + (v_video_result->>'deleted_count')::INTEGER;
      v_total_failed := v_total_failed + (v_video_result->>'failed_count')::INTEGER;
      v_cleaned_count := v_cleaned_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to cleanup videos for user %: %', v_user_record.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'cleaned_users_count', v_cleaned_count,
    'total_videos_deleted', v_total_deleted,
    'total_videos_failed', v_total_failed,
    'message', 'Cleaned up videos for all deleted users'
  );
END;
$$;

-- pg_cronジョブ: 毎日午前2時に自動メールアドレス解放を実行（動画クリーンアップ付き）
SELECT cron.schedule(
  'auto-release-deleted-emails',
  '0 2 * * *', -- 毎日午前2時に実行
  'SELECT auto_release_deleted_emails();'
);

-- 古いv1関数を新しいv2関数に置き換える包装関数
CREATE OR REPLACE FUNCTION safe_delete_user_account(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 新しいv2関数を呼び出し
  RETURN safe_delete_user_account_v2(p_user_id);
END;
$$;

-- 関数の実行権限を設定
GRANT EXECUTE ON FUNCTION delete_user_videos_from_storage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_delete_user_account_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_release_deleted_emails() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_all_deleted_user_videos() TO authenticated;
GRANT EXECUTE ON FUNCTION safe_delete_user_account(uuid) TO authenticated;

-- 🧹 既存の削除済みユーザーのメールアドレス解放 + 動画削除を一括実行
SELECT auto_release_deleted_emails();

-- 🎬 既存の削除済みユーザーの動画を一括削除
SELECT cleanup_all_deleted_user_videos(); 