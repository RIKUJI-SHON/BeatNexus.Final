-- Database error saving new user 問題診断・修正マイグレーション
-- 作成日: 2025-08-07
-- 目的: 特定ユーザーに発生する「Database error saving new user」エラーの診断と修正

-- ============================================================================
-- 1. 問題分析
-- ============================================================================
-- 
-- 症状: 一部のユーザーが電話番号認証後にアカウント作成ボタンを押すと
--      「Database error saving new user」エラーが発生
-- 
-- 現在の状況:
-- - handle_new_user 関数は正常に存在し、emailカラム対応済み
-- - トリガー on_auth_user_created は正常に動作
-- - 最近のユーザーは正常に作成されている
-- - record_phone_verification 関数も存在
--
-- 考えられる原因:
-- 1. ユーザー名の重複による UNIQUE 制約違反
-- 2. 言語チェック制約違反 (language NOT IN ('ja', 'en'))
-- 3. record_phone_verification 関数内でのエラー
-- 4. 同時実行によるレースコンディション
-- 5. 一時的なデータベース接続エラー

-- ============================================================================
-- 2. 診断用関数の作成
-- ============================================================================

-- 2.1 詳細なエラーログ記録関数
CREATE OR REPLACE FUNCTION log_user_creation_error(
  p_user_id UUID,
  p_error_code TEXT,
  p_error_message TEXT,
  p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- エラー詳細をログテーブルに記録（存在する場合）
  BEGIN
    INSERT INTO audit_logs (
      table_name,
      action,
      user_id,
      details,
      error_message,
      created_at
    ) VALUES (
      'profiles',
      'user_creation_error',
      p_user_id,
      p_context,
      p_error_code || ': ' || p_error_message,
      NOW()
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- audit_logsテーブルがない場合はRAISE LOGで記録
      RAISE LOG 'USER_CREATION_ERROR: user_id=%, code=%, message=%, context=%', 
        p_user_id, p_error_code, p_error_message, p_context;
  END;
END;
$$;

-- 2.2 改善されたhandle_new_user関数（診断強化版）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = 'public'
LANGUAGE plpgsql
AS $$
DECLARE
  generated_username TEXT;
  username_exists BOOLEAN;
  attempt_count INTEGER := 0;
  max_attempts INTEGER := 10;
  detected_language TEXT := 'en';
  error_context JSONB := '{}';
BEGIN
  -- 入力検証: IDが有効なUUIDかチェック
  IF NEW.id IS NULL THEN
    PERFORM log_user_creation_error(
      NULL, 
      'NULL_USER_ID', 
      'User ID cannot be null',
      jsonb_build_object('email', NEW.email)
    );
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  -- コンテキスト情報の記録
  error_context := jsonb_build_object(
    'user_id', NEW.id,
    'email', NEW.email,
    'has_metadata', (NEW.raw_user_meta_data IS NOT NULL),
    'metadata_keys', CASE WHEN NEW.raw_user_meta_data IS NOT NULL 
                     THEN jsonb_object_keys(NEW.raw_user_meta_data) 
                     ELSE NULL END
  );
  
  -- 入力検証: emailが有効かチェック
  IF NEW.email IS NULL OR NEW.email = '' THEN
    PERFORM log_user_creation_error(
      NEW.id, 
      'INVALID_EMAIL', 
      'User email cannot be null or empty',
      error_context
    );
    RAISE EXCEPTION 'User email cannot be null or empty';
  END IF;
  
  -- メールアドレスの形式チェック（基本的な検証）
  IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    PERFORM log_user_creation_error(
      NEW.id, 
      'INVALID_EMAIL_FORMAT', 
      'Invalid email format: ' || NEW.email,
      error_context
    );
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- 言語設定の処理（メタデータから取得）
  IF NEW.raw_user_meta_data ? 'language' THEN
    detected_language := COALESCE(NEW.raw_user_meta_data->>'language', 'en');
    -- 有効な言語コードかチェック（診断強化）
    IF detected_language NOT IN ('ja', 'en') THEN
      PERFORM log_user_creation_error(
        NEW.id, 
        'INVALID_LANGUAGE', 
        'Invalid language detected: ' || detected_language,
        error_context || jsonb_build_object('detected_language', detected_language)
      );
      detected_language := 'en'; -- デフォルトに修正
    END IF;
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
      
      -- ユーザー名の重複チェック（診断強化）
      SELECT EXISTS(
        SELECT 1 FROM public.profiles 
        WHERE username = generated_username
      ) INTO username_exists;
      
      -- 重複がなければループを抜ける
      EXIT WHEN NOT username_exists;
      
      -- 無限ループ防止
      attempt_count := attempt_count + 1;
      IF attempt_count >= max_attempts THEN
        PERFORM log_user_creation_error(
          NEW.id, 
          'USERNAME_GENERATION_FAILED', 
          'Failed to generate unique username after ' || max_attempts || ' attempts',
          error_context || jsonb_build_object('last_attempt', generated_username)
        );
        RAISE EXCEPTION 'Failed to generate unique username after % attempts', max_attempts;
      END IF;
    END LOOP;
  ELSE
    -- メタデータから取得したユーザー名の検証
    IF LENGTH(generated_username) < 3 OR LENGTH(generated_username) > 30 THEN
      PERFORM log_user_creation_error(
        NEW.id, 
        'USERNAME_LENGTH_INVALID', 
        'Username length invalid: ' || LENGTH(generated_username),
        error_context || jsonb_build_object('username', generated_username)
      );
      RAISE EXCEPTION 'Username must be between 3 and 30 characters';
    END IF;
    
    -- 不適切な文字のチェック
    IF generated_username !~ '^[a-zA-Z0-9_-]+$' THEN
      PERFORM log_user_creation_error(
        NEW.id, 
        'USERNAME_INVALID_CHARS', 
        'Username contains invalid characters: ' || generated_username,
        error_context || jsonb_build_object('username', generated_username)
      );
      RAISE EXCEPTION 'Username contains invalid characters';
    END IF;
    
    -- 重複チェック
    SELECT EXISTS(
      SELECT 1 FROM public.profiles 
      WHERE username = generated_username
    ) INTO username_exists;
    
    IF username_exists THEN
      PERFORM log_user_creation_error(
        NEW.id, 
        'USERNAME_DUPLICATE', 
        'Username already exists: ' || generated_username,
        error_context || jsonb_build_object('username', generated_username)
      );
      RAISE EXCEPTION 'Username already exists: %', generated_username;
    END IF;
  END IF;
  
  -- プロフィールの挿入（トランザクション内で安全に実行）
  BEGIN
    INSERT INTO public.profiles (id, username, email, language, created_at, updated_at)
    VALUES (
      NEW.id,
      generated_username,
      NEW.email,
      detected_language,
      NOW(),
      NOW()
    );
  EXCEPTION
    WHEN unique_violation THEN
      PERFORM log_user_creation_error(
        NEW.id, 
        'PROFILE_UNIQUE_VIOLATION', 
        'Profile creation failed due to duplicate data: ' || SQLERRM,
        error_context || jsonb_build_object(
          'username', generated_username,
          'language', detected_language
        )
      );
      RAISE EXCEPTION 'Profile creation failed due to duplicate data';
    WHEN foreign_key_violation THEN
      PERFORM log_user_creation_error(
        NEW.id, 
        'PROFILE_FK_VIOLATION', 
        'Profile creation failed due to invalid user reference: ' || SQLERRM,
        error_context || jsonb_build_object(
          'username', generated_username,
          'language', detected_language
        )
      );
      RAISE EXCEPTION 'Profile creation failed due to invalid user reference';
    WHEN check_violation THEN
      PERFORM log_user_creation_error(
        NEW.id, 
        'PROFILE_CHECK_VIOLATION', 
        'Profile creation failed due to check constraint: ' || SQLERRM,
        error_context || jsonb_build_object(
          'username', generated_username,
          'language', detected_language,
          'constraint_detail', SQLSTATE
        )
      );
      RAISE EXCEPTION 'Profile creation failed due to check constraint: %', SQLERRM;
    WHEN OTHERS THEN
      PERFORM log_user_creation_error(
        NEW.id, 
        'PROFILE_OTHER_ERROR', 
        'Profile creation failed: ' || SQLERRM,
        error_context || jsonb_build_object(
          'username', generated_username,
          'language', detected_language,
          'sqlstate', SQLSTATE
        )
      );
      RAISE EXCEPTION 'Profile creation failed: %', SQLERRM;
  END;
  
  -- 成功ログ（診断情報も含める）
  RAISE LOG 'New user profile created successfully: % (%) with language: %, email: %', 
    generated_username, NEW.id, detected_language, NEW.email;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 最終的なエラーログの記録
    PERFORM log_user_creation_error(
      NEW.id, 
      'FINAL_EXCEPTION', 
      SQLERRM,
      error_context || jsonb_build_object(
        'sqlstate', SQLSTATE,
        'generated_username', generated_username,
        'detected_language', detected_language
      )
    );
    RAISE LOG 'User profile creation failed for %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
    -- エラーを再発生させて処理を中断
    RAISE;
END;
$$;

-- ============================================================================
-- 3. record_phone_verification関数の強化（エラー処理改善）
-- ============================================================================

-- 既存関数のバックアップ確認
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'record_phone_verification'
  ) THEN
    RAISE NOTICE '✅ record_phone_verification function exists - will enhance error handling';
  ELSE
    RAISE NOTICE '⚠️ record_phone_verification function not found - creating basic version';
  END IF;
END $$;

-- phone_verificationsテーブルの存在確認と基本構造作成
CREATE TABLE IF NOT EXISTS phone_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- 必要なインデックス
CREATE UNIQUE INDEX IF NOT EXISTS idx_phone_verifications_user_id ON phone_verifications(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_phone_verifications_phone_number ON phone_verifications(phone_number) WHERE is_active = TRUE;

-- 強化されたrecord_phone_verification関数
CREATE OR REPLACE FUNCTION record_phone_verification(
  p_user_id UUID,
  p_phone_number TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  normalized_phone TEXT;
  existing_record phone_verifications%ROWTYPE;
  result_record phone_verifications%ROWTYPE;
BEGIN
  -- 入力値検証
  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_user_id',
      'message', 'ユーザーIDが無効です。'
    );
  END IF;
  
  IF p_phone_number IS NULL OR trim(p_phone_number) = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_phone_number',
      'message', '電話番号が入力されていません。'
    );
  END IF;
  
  -- 電話番号正規化（基本的な処理）
  normalized_phone := regexp_replace(p_phone_number, '[^0-9+]', '', 'g');
  
  IF normalized_phone IS NULL OR LENGTH(normalized_phone) < 10 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_phone_format',
      'message', '電話番号の形式が正しくありません。'
    );
  END IF;
  
  -- 既存レコードチェック
  SELECT * INTO existing_record
  FROM phone_verifications
  WHERE user_id = p_user_id AND is_active = true;
  
  BEGIN
    IF FOUND THEN
      -- 既存レコードを更新
      UPDATE phone_verifications 
      SET 
        phone_number = normalized_phone,
        verified_at = NOW(),
        updated_at = NOW()
      WHERE user_id = p_user_id AND is_active = true
      RETURNING * INTO result_record;
    ELSE
      -- 新規レコード作成
      INSERT INTO phone_verifications (
        user_id,
        phone_number,
        verified_at,
        created_at,
        updated_at
      ) VALUES (
        p_user_id,
        normalized_phone,
        NOW(),
        NOW(),
        NOW()
      )
      RETURNING * INTO result_record;
    END IF;
    
    RETURN json_build_object(
      'success', true,
      'user_id', result_record.user_id,
      'phone_number_hash', encode(digest(normalized_phone, 'sha256'), 'hex'),
      'message', '電話番号認証を記録しました。'
    );
    
  EXCEPTION
    WHEN unique_violation THEN
      RETURN json_build_object(
        'success', false,
        'error', 'phone_already_registered',
        'message', 'この電話番号は既に他のアカウントで使用されています。'
      );
    WHEN foreign_key_violation THEN
      RETURN json_build_object(
        'success', false,
        'error', 'invalid_user_id',
        'message', '指定されたユーザーIDが存在しません。'
      );
    WHEN OTHERS THEN
      -- 詳細なエラーログ
      RAISE LOG 'record_phone_verification error: user_id=%, phone_hash=%, error=%, sqlstate=%', 
        p_user_id, encode(digest(normalized_phone, 'sha256'), 'hex'), SQLERRM, SQLSTATE;
      
      RETURN json_build_object(
        'success', false,
        'error', 'system_error',
        'message', 'システムエラーが発生しました。しばらくしてからお試しください。'
      );
  END;
END;
$$;

-- ============================================================================
-- 4. 権限設定
-- ============================================================================

-- 関数の権限設定
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

REVOKE ALL ON FUNCTION log_user_creation_error(UUID, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION log_user_creation_error(UUID, TEXT, TEXT, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION record_phone_verification(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_phone_verification(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_phone_verification(UUID, TEXT) TO service_role;

-- テーブルのRLS設定
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除してから再作成
DROP POLICY IF EXISTS "Users can view own phone verification" ON phone_verifications;
DROP POLICY IF EXISTS "Users can insert own phone verification" ON phone_verifications;
DROP POLICY IF EXISTS "Service role full access" ON phone_verifications;

-- ユーザーは自分の認証記録のみ参照可能
CREATE POLICY "Users can view own phone verification" 
  ON phone_verifications FOR SELECT 
  USING (auth.uid() = user_id);

-- ユーザーは自分の認証記録のみ挿入可能
CREATE POLICY "Users can insert own phone verification" 
  ON phone_verifications FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- サービスロールは全操作可能
CREATE POLICY "Service role full access" 
  ON phone_verifications FOR ALL 
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 5. 実行ログとテスト
-- ============================================================================

DO $$
BEGIN
  -- 関数の存在確認
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
  ) THEN
    RAISE NOTICE '✅ Enhanced handle_new_user function created successfully';
  ELSE
    RAISE EXCEPTION '❌ handle_new_user function creation failed';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'record_phone_verification'
  ) THEN
    RAISE NOTICE '✅ Enhanced record_phone_verification function ready';
  ELSE
    RAISE EXCEPTION '❌ record_phone_verification function creation failed';
  END IF;
  
  RAISE NOTICE '✅ Database error saving new user - diagnostic migration completed';
  RAISE NOTICE 'ℹ️ Enhanced error logging is now active';
  RAISE NOTICE 'ℹ️ Monitor logs for detailed error information on next signup attempt';
END $$;
