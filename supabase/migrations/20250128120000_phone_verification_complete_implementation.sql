-- 電話番号認証システム完全実装マイグレーション
-- 作成日: 2025-01-28
-- 目的: 電話番号重複チェック機能と認証記録機能の完全実装
-- 対象: phone_verifications, audit_logs, security_audit_log テーブルと関連関数

-- ============================================================================
-- 1. テーブル作成
-- ============================================================================

-- 1.1 電話番号認証管理テーブル
CREATE TABLE IF NOT EXISTS phone_verifications (
  -- 主キー
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- ユーザー関連（1:1関係を強制）
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 電話番号（正規化済み、重複不可）
  phone_number TEXT NOT NULL UNIQUE,
  
  -- 認証状態
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 管理情報
  verification_method TEXT DEFAULT 'sms' CHECK (verification_method IN ('sms', 'voice')),
  country_code TEXT DEFAULT '+81',
  
  -- 制約
  CONSTRAINT valid_phone_number CHECK (phone_number ~ '^\+[1-9]\d{1,14}$'),
  CONSTRAINT valid_user_id CHECK (user_id IS NOT NULL)
);

-- 1.2 監査ログテーブル
CREATE TABLE IF NOT EXISTS audit_logs (
  -- 主キー
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 操作情報
  table_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT', 'VERIFY', 'SEND_SMS', 'CHECK_AVAILABILITY')),
  
  -- ユーザー情報
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- 操作詳細
  details JSONB,
  old_values JSONB,
  new_values JSONB,
  
  -- セッション情報
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  
  -- システム情報
  function_name TEXT,
  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.3 セキュリティ監査ログテーブル
CREATE TABLE IF NOT EXISTS security_audit_log (
  -- 主キー
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- イベント分類
  event_type TEXT NOT NULL CHECK (event_type IN (
    'PHONE_DUPLICATE_ATTEMPT',    -- 重複電話番号登録試行
    'RATE_LIMIT_EXCEEDED',        -- レート制限違反
    'INVALID_OTP_ATTEMPT',        -- 無効なOTP試行
    'SUSPICIOUS_PATTERN',         -- 疑わしいパターン
    'BRUTE_FORCE_ATTEMPT',        -- ブルートフォース攻撃
    'PHONE_NUMBER_ENUMERATION',   -- 電話番号列挙攻撃
    'API_ABUSE',                  -- API乱用
    'UNAUTHORIZED_ACCESS'         -- 不正アクセス
  )),
  
  -- 対象情報
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone_number_hash TEXT, -- SHA-256ハッシュ（プライバシー保護）
  
  -- イベントデータ
  event_data JSONB NOT NULL,
  severity_level INTEGER DEFAULT 1 CHECK (severity_level BETWEEN 1 AND 10),
  
  -- リクエスト情報
  ip_address INET,
  user_agent TEXT,
  request_id TEXT,
  
  -- 対応状況
  is_blocked BOOLEAN DEFAULT FALSE,
  admin_reviewed BOOLEAN DEFAULT FALSE,
  admin_notes TEXT,
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 2. インデックス作成
-- ============================================================================

-- 2.1 phone_verifications テーブルのインデックス
-- 重複チェック用（最重要）
CREATE UNIQUE INDEX IF NOT EXISTS idx_phone_verifications_phone_number 
ON phone_verifications(phone_number) WHERE is_active = true;

-- ユーザー検索用
CREATE UNIQUE INDEX IF NOT EXISTS idx_phone_verifications_user_id 
ON phone_verifications(user_id) WHERE is_active = true;

-- 認証日時検索用
CREATE INDEX IF NOT EXISTS idx_phone_verifications_verified_at 
ON phone_verifications(verified_at);

-- 国別統計用
CREATE INDEX IF NOT EXISTS idx_phone_verifications_country_code 
ON phone_verifications(country_code);

-- 2.2 audit_logs テーブルのインデックス
-- 時系列検索用（パーティショニング対応）
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
ON audit_logs(created_at DESC);

-- ユーザー別検索用
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
ON audit_logs(user_id) WHERE user_id IS NOT NULL;

-- テーブル・アクション別検索用
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_action 
ON audit_logs(table_name, action);

-- 成功/失敗別検索用
CREATE INDEX IF NOT EXISTS idx_audit_logs_success 
ON audit_logs(success, created_at) WHERE success = false;

-- 2.3 security_audit_log テーブルのインデックス
-- イベントタイプ別検索用
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type 
ON security_audit_log(event_type, created_at DESC);

-- 重要度別検索用
CREATE INDEX IF NOT EXISTS idx_security_audit_log_severity 
ON security_audit_log(severity_level DESC, created_at DESC) WHERE severity_level >= 5;

-- 未レビュー検索用
CREATE INDEX IF NOT EXISTS idx_security_audit_log_unreviewed 
ON security_audit_log(created_at DESC) WHERE admin_reviewed = false;

-- ============================================================================
-- 3. RLS (Row Level Security) 設定
-- ============================================================================

-- 3.1 phone_verifications テーブルのRLS
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（冪等性確保）
DROP POLICY IF EXISTS "Users can view own phone verification" ON phone_verifications;
DROP POLICY IF EXISTS "Service role full access" ON phone_verifications;
DROP POLICY IF EXISTS "Users can update own phone verification" ON phone_verifications;

-- ユーザーは自分の認証記録のみ参照可能
CREATE POLICY "Users can view own phone verification" ON phone_verifications
  FOR SELECT USING (auth.uid() = user_id);

-- サービスロールは全操作可能
CREATE POLICY "Service role full access" ON phone_verifications
  FOR ALL USING (auth.role() = 'service_role');

-- 認証ユーザーは自分の記録のみ更新可能
CREATE POLICY "Users can update own phone verification" ON phone_verifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 3.2 audit_logs テーブルのRLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Service role only access" ON audit_logs;

-- サービスロールのみアクセス可能（監査ログの改ざん防止）
CREATE POLICY "Service role only access" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- 3.3 security_audit_log テーブルのRLS
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Service role only access" ON security_audit_log;

-- サービスロールのみアクセス可能
CREATE POLICY "Service role only access" ON security_audit_log
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 4. 関数作成
-- ============================================================================

-- 4.1 電話番号正規化関数
CREATE OR REPLACE FUNCTION normalize_phone_number(phone_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned_phone TEXT;
  result_phone TEXT;
BEGIN
  -- NULL チェック
  IF phone_input IS NULL OR trim(phone_input) = '' THEN
    RETURN NULL;
  END IF;
  
  -- 数字と+以外を除去
  cleaned_phone := regexp_replace(phone_input, '[^\d+]', '', 'g');
  
  -- 空文字チェック
  IF cleaned_phone = '' THEN
    RETURN NULL;
  END IF;
  
  -- 日本の電話番号正規化
  CASE 
    -- 既に国際形式（+81で始まる）
    WHEN cleaned_phone ~ '^\+81[1-9]\d{8,9}$' THEN
      result_phone := cleaned_phone;
    
    -- 0で始まる日本の番号（090-1234-5678）
    WHEN cleaned_phone ~ '^0[1-9]\d{8,9}$' THEN
      result_phone := '+81' || substring(cleaned_phone from 2);
    
    -- 国番号なしの日本の番号（90-1234-5678）
    WHEN cleaned_phone ~ '^[1-9]\d{8,9}$' THEN
      result_phone := '+81' || cleaned_phone;
    
    -- 81で始まる（国番号+なし）
    WHEN cleaned_phone ~ '^81[1-9]\d{8,9}$' THEN
      result_phone := '+' || cleaned_phone;
    
    -- その他の国際番号（+で始まる）
    WHEN cleaned_phone ~ '^\+[1-9]\d{6,14}$' THEN
      result_phone := cleaned_phone;
    
    -- 無効な形式
    ELSE
      RETURN NULL;
  END CASE;
  
  -- 最終的な形式検証
  IF result_phone !~ '^\+[1-9]\d{6,14}$' THEN
    RETURN NULL;
  END IF;
  
  RETURN result_phone;
END;
$$;

-- 4.2 監査ログ記録関数
CREATE OR REPLACE FUNCTION log_audit_event(
  p_table_name TEXT,
  p_action TEXT,
  p_user_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_success BOOLEAN DEFAULT TRUE,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name,
    action,
    user_id,
    details,
    success,
    error_message,
    created_at
  ) VALUES (
    p_table_name,
    p_action,
    p_user_id,
    p_details,
    p_success,
    p_error_message,
    NOW()
  );
END;
$$;

-- 4.3 セキュリティログ記録関数
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_event_data JSONB DEFAULT NULL,
  p_severity_level INTEGER DEFAULT 3
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO security_audit_log (
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
$$;

-- 4.4 レート制限チェック関数
CREATE OR REPLACE FUNCTION check_rate_limit(phone_number TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  attempt_count INTEGER;
  last_attempt TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 過去1時間の試行回数をカウント
  SELECT COUNT(*), MAX(created_at)
  INTO attempt_count, last_attempt
  FROM audit_logs
  WHERE details->>'phone_number_hash' = encode(digest(phone_number, 'sha256'), 'hex')
    AND action = 'SEND_SMS'
    AND created_at > NOW() - INTERVAL '1 hour';
  
  -- レート制限チェック（1時間に3回まで）
  IF attempt_count >= 3 THEN
    -- セキュリティログ記録
    PERFORM log_security_event(
      'RATE_LIMIT_EXCEEDED',
      NULL,
      phone_number,
      json_build_object(
        'attempt_count', attempt_count,
        'last_attempt', last_attempt,
        'limit_period', '1 hour'
      )
    );
    
    RETURN json_build_object(
      'allowed', false,
      'message', 'SMS送信の制限に達しました。1時間後に再度お試しください。',
      'retry_after', EXTRACT(EPOCH FROM (last_attempt + INTERVAL '1 hour' - NOW()))
    );
  END IF;
  
  RETURN json_build_object(
    'allowed', true,
    'remaining_attempts', 3 - attempt_count
  );
END;
$$;

-- 4.5 電話番号重複チェック関数
CREATE OR REPLACE FUNCTION check_phone_availability(phone_input TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  normalized_phone TEXT;
  existing_count INTEGER;
  rate_limit_result JSON;
BEGIN
  -- 入力値検証
  IF phone_input IS NULL OR trim(phone_input) = '' THEN
    RETURN json_build_object(
      'available', false,
      'error', 'invalid_input',
      'message', '電話番号が入力されていません。'
    );
  END IF;
  
  -- 電話番号正規化
  normalized_phone := normalize_phone_number(phone_input);
  
  -- 正規化エラーチェック
  IF normalized_phone IS NULL THEN
    RETURN json_build_object(
      'available', false,
      'error', 'invalid_format',
      'message', '電話番号の形式が正しくありません。'
    );
  END IF;
  
  -- レート制限チェック
  rate_limit_result := check_rate_limit(normalized_phone);
  IF (rate_limit_result->>'allowed')::boolean = false THEN
    RETURN json_build_object(
      'available', false,
      'error', 'rate_limit_exceeded',
      'message', rate_limit_result->>'message'
    );
  END IF;
  
  -- 重複チェック（phone_verificationsテーブル）
  SELECT COUNT(*) INTO existing_count
  FROM phone_verifications 
  WHERE phone_number = normalized_phone 
    AND is_active = true;
  
  IF existing_count > 0 THEN
    -- セキュリティログ記録
    PERFORM log_security_event(
      'PHONE_DUPLICATE_ATTEMPT',
      NULL,
      normalized_phone,
      json_build_object(
        'phone_number_hash', encode(digest(normalized_phone, 'sha256'), 'hex'),
        'normalized_phone', normalized_phone,
        'attempt_count', existing_count
      )
    );
    
    RETURN json_build_object(
      'available', false,
      'error', 'phone_already_registered',
      'message', 'この電話番号は既に他のアカウントで使用されています。別の電話番号をお試しください。'
    );
  END IF;
  
  -- 監査ログ記録
  PERFORM log_audit_event(
    'phone_verifications',
    'CHECK_AVAILABILITY',
    NULL,
    json_build_object(
      'phone_number_hash', encode(digest(normalized_phone, 'sha256'), 'hex'),
      'result', 'available'
    )
  );
  
  -- 利用可能
  RETURN json_build_object(
    'available', true,
    'message', '電話番号は利用可能です。',
    'normalized_phone', normalized_phone
  );
  
EXCEPTION
  WHEN others THEN
    -- エラーログ記録
    PERFORM log_audit_event(
      'phone_verifications',
      'CHECK_AVAILABILITY',
      NULL,
      json_build_object(
        'error', SQLERRM,
        'sqlstate', SQLSTATE
      ),
      false,
      SQLERRM
    );
    
    RETURN json_build_object(
      'available', false,
      'error', 'system_error',
      'message', 'システムエラーが発生しました。しばらくしてからお試しください。'
    );
END;
$$;

-- 4.6 電話番号認証記録関数
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
  existing_record RECORD;
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
  
  -- 電話番号正規化
  normalized_phone := normalize_phone_number(p_phone_number);
  IF normalized_phone IS NULL THEN
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
  
  IF FOUND THEN
    -- 既存レコードを更新
    UPDATE phone_verifications 
    SET 
      phone_number = normalized_phone,
      verified_at = NOW(),
      updated_at = NOW()
    WHERE user_id = p_user_id AND is_active = true;
    
    -- 監査ログ記録
    PERFORM log_audit_event(
      'phone_verifications',
      'UPDATE',
      p_user_id,
      json_build_object(
        'old_phone_hash', encode(digest(existing_record.phone_number, 'sha256'), 'hex'),
        'new_phone_hash', encode(digest(normalized_phone, 'sha256'), 'hex')
      )
    );
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
    );
    
    -- 監査ログ記録
    PERFORM log_audit_event(
      'phone_verifications',
      'INSERT',
      p_user_id,
      json_build_object(
        'phone_number_hash', encode(digest(normalized_phone, 'sha256'), 'hex')
      )
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'phone_number_hash', encode(digest(normalized_phone, 'sha256'), 'hex'),
    'message', '電話番号認証を記録しました。'
  );
  
EXCEPTION
  WHEN unique_violation THEN
    -- 重複エラー
    PERFORM log_security_event(
      'PHONE_DUPLICATE_ATTEMPT',
      p_user_id,
      normalized_phone,
      json_build_object(
        'context', 'record_verification',
        'error', SQLERRM
      )
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'phone_already_exists',
      'message', 'この電話番号は既に他のアカウントで使用されています。'
    );
  WHEN others THEN
    -- その他のエラー
    PERFORM log_audit_event(
      'phone_verifications',
      'INSERT',
      p_user_id,
      json_build_object(
        'error', SQLERRM,
        'sqlstate', SQLSTATE
      ),
      false,
      SQLERRM
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'system_error',
      'message', 'システムエラーが発生しました。しばらくしてからお試しください。'
    );
END;
$$;

-- ============================================================================
-- 5. 統計・監視用ビュー作成
-- ============================================================================

-- 5.1 認証統計ビュー
CREATE OR REPLACE VIEW phone_verification_stats AS
SELECT 
  COUNT(*) as total_verifications,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT phone_number) as unique_phone_numbers,
  DATE_TRUNC('day', verified_at) as verification_date
FROM phone_verifications
WHERE is_active = true
GROUP BY DATE_TRUNC('day', verified_at)
ORDER BY verification_date DESC;

-- 5.2 セキュリティ統計ビュー
CREATE OR REPLACE VIEW security_event_summary AS
SELECT 
  event_type,
  COUNT(*) as event_count,
  AVG(severity_level) as avg_severity,
  MAX(created_at) as last_occurrence
FROM security_audit_log
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY event_type
ORDER BY event_count DESC;

-- ============================================================================
-- 6. 初期データとテスト
-- ============================================================================

-- テーブル作成確認
DO $$
BEGIN
  -- テーブル存在確認
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'phone_verifications') THEN
    RAISE EXCEPTION 'phone_verifications table was not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    RAISE EXCEPTION 'audit_logs table was not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_audit_log') THEN
    RAISE EXCEPTION 'security_audit_log table was not created';
  END IF;
  
  -- 関数存在確認
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_phone_availability') THEN
    RAISE EXCEPTION 'check_phone_availability function was not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'record_phone_verification') THEN
    RAISE EXCEPTION 'record_phone_verification function was not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'normalize_phone_number') THEN
    RAISE EXCEPTION 'normalize_phone_number function was not created';
  END IF;
  
  RAISE NOTICE 'Phone verification system migration completed successfully!';
END;
$$;

-- テスト用監査ログ挿入
SELECT log_audit_event(
  'phone_verifications',
  'MIGRATION_COMPLETE',
  NULL,
  json_build_object(
    'migration_file', '20250128120000_phone_verification_complete_implementation.sql',
    'migration_date', NOW(),
    'status', 'success'
  ),
  true,
  NULL
);
