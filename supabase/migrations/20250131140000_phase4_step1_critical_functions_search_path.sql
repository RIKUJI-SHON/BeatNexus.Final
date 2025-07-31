-- Phase 4 Step 1: 最高優先度関数のsearch_path設定
-- 対象: 管理・認証系関数 (7関数)
-- 実行環境: 開発環境 → 本番環境
-- 作成日: 2025-01-31

-- 1. 管理者メール解放機能の強化（既存の実装に合わせてsearch_pathのみ追加）
CREATE OR REPLACE FUNCTION public.admin_force_release_email(p_email text)
RETURNS json
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $function$
DECLARE
  v_user_count INTEGER;
  v_timestamp BIGINT;
BEGIN
  -- 指定されたメールアドレスを使用しているユーザー数を確認
  SELECT COUNT(*) INTO v_user_count
  FROM auth.users 
  WHERE email = p_email;
  
  IF v_user_count = 0 THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Email address is already available',
      'email', p_email
    );
  END IF;
  
  v_timestamp := EXTRACT(EPOCH FROM NOW())::BIGINT;
  
  -- 該当するauth.usersレコードを完全に匿名化
  UPDATE auth.users
  SET 
    email = 'force-released-' || v_timestamp || '-' || SUBSTRING(id::text, 1, 8) || '@admin.released',
    raw_user_meta_data = jsonb_build_object(
      'admin_force_released', true,
      'release_timestamp', v_timestamp,
      'original_email_force_released', p_email,
      'release_method', 'admin_force_release'
    ),
    updated_at = NOW()
  WHERE email = p_email;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Email address forcefully released',
    'email', p_email,
    'affected_users', v_user_count,
    'timestamp', v_timestamp
  );
END;
$function$;

-- 2. 管理者メール解放機能v2の強化（既存の実装に合わせてsearch_pathのみ追加）
CREATE OR REPLACE FUNCTION public.admin_force_release_email_v2(p_email text)
RETURNS json
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $function$
DECLARE
  v_user_count INTEGER;
  v_identity_count INTEGER;
  v_timestamp BIGINT;
BEGIN
  -- 指定されたメールアドレスを使用しているユーザー数を確認
  SELECT COUNT(*) INTO v_user_count
  FROM auth.users 
  WHERE email = p_email;
  
  -- identitiesテーブルの該当データ数も確認
  SELECT COUNT(*) INTO v_identity_count
  FROM auth.identities 
  WHERE provider_id = p_email 
     OR identity_data::text LIKE '%' || p_email || '%';
  
  IF v_user_count = 0 AND v_identity_count = 0 THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Email address is already completely available',
      'email', p_email
    );
  END IF;
  
  v_timestamp := EXTRACT(EPOCH FROM NOW())::BIGINT;
  
  -- 該当するauth.usersレコードを完全に匿名化
  UPDATE auth.users
  SET 
    email = 'force-released-' || v_timestamp || '-' || SUBSTRING(id::text, 1, 8) || '@admin.released',
    raw_user_meta_data = jsonb_build_object(
      'admin_force_released', true,
      'release_timestamp', v_timestamp,
      'original_email_force_released', p_email,
      'release_method', 'admin_force_release_v2'
    ),
    updated_at = NOW()
  WHERE email = p_email;
  
  -- 🆕 auth.identitiesからも完全削除
  DELETE FROM auth.identities 
  WHERE provider_id = p_email 
     OR identity_data::text LIKE '%' || p_email || '%';
  
  RETURN json_build_object(
    'success', true,
    'message', 'Email address forcefully released (including identities)',
    'email', p_email,
    'affected_users', v_user_count,
    'affected_identities', v_identity_count,
    'timestamp', v_timestamp
  );
END;
$function$;

-- 3. 新規ユーザー処理トリガー関数の強化（既存の実装に合わせてsearch_pathを public, auth に変更）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $function$
DECLARE
  generated_username TEXT;
  username_exists BOOLEAN;
  attempt_count INTEGER := 0;
  max_attempts INTEGER := 10;
BEGIN
  -- 入力検証: IDが有効なUUIDかチェック
  IF NEW.id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  -- 入力検証: emailが有効かチェック
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RAISE EXCEPTION 'User email cannot be null or empty';
  END IF;
  
  -- メールアドレスの形式チェック（基本的な検証）
  IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- ユーザー名の生成（改善版）
  generated_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NULL
  );
  
  -- メタデータからユーザー名が取得できない場合の安全な生成
  IF generated_username IS NULL OR generated_username = '' THEN
    LOOP
      -- より安全なユーザー名生成（12文字のランダム文字列）
      generated_username := 'user_' || LOWER(
        SUBSTRING(
          encode(gen_random_bytes(8), 'hex'), 
          1, 12
        )
      );
      
      -- ユーザー名の重複チェック
      SELECT EXISTS(
        SELECT 1 FROM public.profiles 
        WHERE username = generated_username
      ) INTO username_exists;
      
      -- 重複がなければループを抜ける
      EXIT WHEN NOT username_exists;
      
      -- 無限ループ防止
      attempt_count := attempt_count + 1;
      IF attempt_count >= max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique username after % attempts', max_attempts;
      END IF;
    END LOOP;
  ELSE
    -- メタデータから取得したユーザー名の検証
    IF LENGTH(generated_username) < 3 OR LENGTH(generated_username) > 30 THEN
      RAISE EXCEPTION 'Username must be between 3 and 30 characters';
    END IF;
    
    -- 不適切な文字のチェック
    IF generated_username !~ '^[a-zA-Z0-9_-]+$' THEN
      RAISE EXCEPTION 'Username contains invalid characters';
    END IF;
    
    -- 重複チェック
    SELECT EXISTS(
      SELECT 1 FROM public.profiles 
      WHERE username = generated_username
    ) INTO username_exists;
    
    IF username_exists THEN
      RAISE EXCEPTION 'Username already exists: %', generated_username;
    END IF;
  END IF;
  
  -- プロフィールの挿入（トランザクション内で安全に実行）
  BEGIN
    INSERT INTO public.profiles (id, username, email, created_at, updated_at)
    VALUES (
      NEW.id,
      generated_username,
      NEW.email,
      NOW(),
      NOW()
    );
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Profile creation failed due to duplicate data';
    WHEN foreign_key_violation THEN
      RAISE EXCEPTION 'Profile creation failed due to invalid user reference';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Profile creation failed: %', SQLERRM;
  END;
  
  -- 成功ログ
  RAISE LOG 'New user profile created successfully: % (%)', generated_username, NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- エラーログの記録
    RAISE LOG 'User profile creation failed for %: %', NEW.id, SQLERRM;
    -- エラーを再発生させて処理を中断
    RAISE;
END;
$function$;

-- 4. セキュアなアカウント削除機能の強化（既存の実装に合わせてsearch_pathのみ追加）
CREATE OR REPLACE FUNCTION public.safe_delete_user_account(p_user_id uuid)
RETURNS json
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $function$
BEGIN
  -- 新しいv4関数を呼び出し
  RETURN safe_delete_user_account_v4(p_user_id);
END;
$function$;

-- 5. セキュアなアカウント削除機能v4の強化（既存の実装に合わせてsearch_pathのみ追加）
CREATE OR REPLACE FUNCTION public.safe_delete_user_account_v4(p_user_id uuid)
RETURNS json
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
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
  SELECT username INTO v_username FROM public.profiles WHERE id = p_user_id;
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
    SELECT 1 FROM public.active_battles 
    WHERE player1_user_id = p_user_id OR player2_user_id = p_user_id
  ) INTO v_has_active_battles;
  
  -- アーカイブバトルの存在確認
  SELECT EXISTS(
    SELECT 1 FROM public.archived_battles 
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
      UPDATE public.active_battles 
      SET status = 'PROCESSING_RESULTS',
          updated_at = NOW()
      WHERE (player1_user_id = p_user_id OR player2_user_id = p_user_id)
        AND status = 'ACTIVE';
    END IF;
    
    -- profilesテーブルをソフト削除（匿名化）
    UPDATE public.profiles 
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
    DELETE FROM public.battle_votes WHERE user_id = p_user_id;
    DELETE FROM public.notifications WHERE user_id = p_user_id;
    DELETE FROM public.submissions WHERE user_id = p_user_id;
    DELETE FROM public.posts WHERE user_id = p_user_id;
    DELETE FROM public.comments WHERE user_id = p_user_id;
    DELETE FROM public.profiles WHERE id = p_user_id;
    
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

-- 6. レート制限チェック機能の強化（正確な引数名とデフォルト値に修正）
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_action text, p_limit_count integer DEFAULT 10, p_time_window interval DEFAULT '01:00:00'::interval)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $function$
DECLARE
  v_current_count INTEGER;
  v_time_threshold TIMESTAMP WITH TIME ZONE;
  v_user_id UUID;
BEGIN
  -- 現在のユーザーIDを取得
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE; -- 未認証ユーザーは制限
  END IF;
  
  -- 時間窓の開始点を計算
  v_time_threshold := NOW() - p_time_window;
  
  -- 指定された時間窓内でのアクション回数をカウント
  SELECT COUNT(*)
  INTO v_current_count
  FROM public.security_audit_log
  WHERE user_id = v_user_id
    AND event_type = p_action
    AND created_at >= v_time_threshold;
    
  -- 制限を超えているかチェック
  IF v_current_count >= p_limit_count THEN
    -- レート制限違反をログに記録
    INSERT INTO public.security_audit_log (
      user_id,
      event_type,
      event_data,
      ip_address,
      user_agent,
      created_at
    ) VALUES (
      v_user_id,
      'rate_limit_exceeded',
      json_build_object(
        'original_action', p_action,
        'limit_count', p_limit_count,
        'time_window_minutes', EXTRACT(EPOCH FROM p_time_window) / 60,
        'actual_count', v_current_count
      ),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent',
      NOW()
    );
    
    RETURN FALSE; -- レート制限に引っかかった
  END IF;
  
  RETURN TRUE; -- 制限内
END;
$function$;

-- 7. セキュリティイベントログ機能の強化（詳細版のみ修正 - search_path未設定版）
CREATE OR REPLACE FUNCTION public.log_security_event(p_event_type text, p_user_id uuid DEFAULT NULL::uuid, p_phone_number text DEFAULT NULL::text, p_event_data jsonb DEFAULT NULL::jsonb, p_severity_level integer DEFAULT 3)
RETURNS void
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (
    event_type,
    user_id,
    phone_number_hash,
    event_data,
    severity_level,
    created_at
  ) VALUES (
    p_event_type,
    p_user_id,
    CASE 
      WHEN p_phone_number IS NOT NULL THEN 
        encode(digest(p_phone_number, 'sha256'), 'hex')
      ELSE NULL 
    END,
    p_event_data,
    p_severity_level,
    NOW()
  );
END;
$function$;

-- マイグレーション完了
-- 7つの重要関数のsearch_path設定が完了しました
-- Phase 4 Step 1 完了
