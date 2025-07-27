-- 電話番号認証システム完全実装マイグレーション
-- 作成日: 2025-01-27
-- 説明: 電話番号認証システムの完全実装（管理テーブル方式）

-- =============================================
-- 1. 監査ログテーブルの作成
-- =============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint (nullable for anonymous actions)
  CONSTRAINT fk_audit_logs_user 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- RLSポリシーの設定
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 管理者のみ参照可能
CREATE POLICY "Only admins can view audit logs" 
  ON audit_logs FOR SELECT 
  USING (auth.jwt() ->> 'role' = 'admin');

-- サービスロールのみ挿入可能
CREATE POLICY "Service role can insert audit logs" 
  ON audit_logs FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- 2. 電話番号認証管理テーブルの作成
-- =============================================
CREATE TABLE IF NOT EXISTS phone_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_phone_verifications_user 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE UNIQUE INDEX IF NOT EXISTS idx_phone_verifications_user_id 
  ON phone_verifications(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_phone_verifications_phone_number 
  ON phone_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_verified_at 
  ON phone_verifications(verified_at);

-- RLSポリシーの設定
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の認証記録のみ参照可能
CREATE POLICY "Users can view own phone verifications" 
  ON phone_verifications FOR SELECT 
  USING (auth.uid() = user_id);

-- サービスロールのみ挿入・更新可能
CREATE POLICY "Service role can manage phone verifications" 
  ON phone_verifications FOR ALL 
  USING (auth.role() = 'service_role');

-- updated_atの自動更新トリガー
CREATE OR REPLACE FUNCTION update_phone_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_phone_verifications_updated_at
  BEFORE UPDATE ON phone_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_phone_verifications_updated_at();

-- =============================================
-- 3. セキュリティ監査ログテーブル（phone_verification用）
-- =============================================
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint (nullable for anonymous events)
  CONSTRAINT fk_security_audit_log_user 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log(created_at);

-- RLS設定
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view security audit logs" 
  ON security_audit_log FOR SELECT 
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Service role can insert security audit logs" 
  ON security_audit_log FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- 4. 電話番号正規化関数
-- =============================================
CREATE OR REPLACE FUNCTION normalize_phone_number(phone_input TEXT)
RETURNS TEXT AS $$
DECLARE
  normalized TEXT;
BEGIN
  -- NULL or empty check
  IF phone_input IS NULL OR trim(phone_input) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remove all non-digit characters except +
  normalized := regexp_replace(phone_input, '[^\d+]', '', 'g');
  
  -- Handle Japanese phone numbers
  -- Convert domestic format (0X0-XXXX-XXXX) to international (+81X0-XXXX-XXXX)
  IF normalized ~ '^0[789][0-9]{8,9}$' THEN
    -- Remove leading 0 and add +81
    normalized := '+81' || substring(normalized from 2);
  ELSIF normalized ~ '^[789][0-9]{8,9}$' THEN
    -- Add +81 prefix if missing
    normalized := '+81' || normalized;
  ELSIF NOT normalized ~ '^\+' THEN
    -- If no country code and not starting with +, assume Japan
    normalized := '+81' || normalized;
  END IF;
  
  -- Validate final format
  IF normalized ~ '^\+[1-9]\d{10,14}$' THEN
    RETURN normalized;
  ELSE
    -- Return original if validation fails
    RETURN phone_input;
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return original input on any error
    RETURN phone_input;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- =============================================
-- 5. 電話番号重複チェック関数
-- =============================================
CREATE OR REPLACE FUNCTION check_phone_availability(phone_input TEXT)
RETURNS JSON AS $$
DECLARE
  normalized_phone TEXT;
  existing_count INTEGER;
  result JSON;
BEGIN
  -- 電話番号の正規化
  normalized_phone := normalize_phone_number(phone_input);
  
  -- phone_verificationsテーブルでの重複チェック
  SELECT COUNT(*) INTO existing_count
  FROM phone_verifications 
  WHERE phone_number = normalized_phone;
  
  -- auth.usersテーブルでの重複もチェック（既存データとの整合性のため）
  IF existing_count = 0 THEN
    SELECT COUNT(*) INTO existing_count
    FROM auth.users 
    WHERE phone = normalized_phone 
      AND phone_confirmed_at IS NOT NULL;
  END IF;
  
  -- 結果をJSONで返す
  IF existing_count > 0 THEN
    result := json_build_object(
      'available', false,
      'error', 'phone_already_registered',
      'message', 'この電話番号は既に別のアカウントで使用されています',
      'normalized_phone', normalized_phone
    );
  ELSE
    result := json_build_object(
      'available', true,
      'message', 'この電話番号は利用可能です',
      'normalized_phone', normalized_phone
    );
  END IF;
  
  -- 監査ログの記録
  INSERT INTO audit_logs (
    table_name, 
    action, 
    user_id, 
    details
  ) VALUES (
    'phone_verifications',
    'check_availability',
    auth.uid(),
    json_build_object(
      'phone_input', phone_input,
      'normalized_phone', normalized_phone,
      'available', (existing_count = 0),
      'checked_at', NOW()
    )
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- エラーログの記録
    INSERT INTO audit_logs (
      table_name, 
      action, 
      user_id, 
      details
    ) VALUES (
      'phone_verifications',
      'check_availability_error',
      auth.uid(),
      json_build_object(
        'phone_input', phone_input,
        'error_message', SQLERRM,
        'error_at', NOW()
      )
    );
    
    RETURN json_build_object(
      'available', false,
      'error', 'system_error',
      'message', 'システムエラーが発生しました',
      'details', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. 電話番号認証記録関数
-- =============================================
CREATE OR REPLACE FUNCTION record_phone_verification(
  p_user_id UUID,
  p_phone_number TEXT
) RETURNS JSON AS $$
DECLARE
  normalized_phone TEXT;
  verification_record phone_verifications%ROWTYPE;
BEGIN
  -- 電話番号の正規化
  normalized_phone := normalize_phone_number(p_phone_number);
  
  -- 既存の重複チェック（他のユーザーが使用していないか）
  IF EXISTS (
    SELECT 1 FROM phone_verifications 
    WHERE phone_number = normalized_phone 
      AND user_id != p_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'phone_already_registered',
      'message', 'この電話番号は既に他のユーザーが使用しています'
    );
  END IF;
  
  -- 既存の記録があるかチェック
  IF EXISTS (SELECT 1 FROM phone_verifications WHERE user_id = p_user_id) THEN
    -- 既存記録を更新
    UPDATE phone_verifications 
    SET 
      phone_number = normalized_phone,
      verified_at = NOW(),
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO verification_record;
  ELSE
    -- 新規記録を作成
    INSERT INTO phone_verifications (user_id, phone_number, verified_at)
    VALUES (p_user_id, normalized_phone, NOW())
    RETURNING * INTO verification_record;
  END IF;
  
  -- 念のためauth.usersも更新（既存機能との互換性のため）
  BEGIN
    UPDATE auth.users 
    SET 
      phone = normalized_phone,
      phone_confirmed_at = NOW()
    WHERE id = p_user_id;
  EXCEPTION
    WHEN insufficient_privilege THEN
      -- 権限不足の場合はスキップ（管理テーブルの記録は完了している）
      NULL;
  END;
  
  -- 監査ログの記録
  INSERT INTO audit_logs (
    table_name, 
    action, 
    user_id, 
    details
  ) VALUES (
    'phone_verifications',
    'phone_verified',
    p_user_id,
    json_build_object(
      'phone_number', normalized_phone,
      'verified_at', verification_record.verified_at
    )
  );
  
  RETURN json_build_object(
    'success', true,
    'user_id', verification_record.user_id,
    'phone_number', verification_record.phone_number,
    'verified_at', verification_record.verified_at,
    'message', '電話番号認証が正常に記録されました'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- エラーログの記録
    INSERT INTO audit_logs (
      table_name, 
      action, 
      user_id, 
      details
    ) VALUES (
      'phone_verifications',
      'record_verification_error',
      p_user_id,
      json_build_object(
        'phone_number', p_phone_number,
        'error_message', SQLERRM,
        'error_at', NOW()
      )
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'system_error',
      'message', 'システムエラーが発生しました',
      'details', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. セキュリティ監査用のログ関数
-- =============================================
CREATE OR REPLACE FUNCTION log_phone_verification_attempt(
  p_phone_number TEXT,
  p_user_id UUID DEFAULT NULL,
  p_action TEXT DEFAULT 'verification_attempt',
  p_success BOOLEAN DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO security_audit_log (
    event_type,
    user_id,
    event_data,
    created_at
  ) VALUES (
    'phone_verification',
    p_user_id,
    json_build_object(
      'phone_number_hash', encode(digest(p_phone_number, 'sha256'), 'hex'),
      'action', p_action,
      'success', p_success,
      'error_message', p_error_message,
      'timestamp', NOW()
    ),
    NOW()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- ログ記録に失敗してもメイン処理は継続
    NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. 電話番号認証状況確認用のビュー（管理者用）
-- =============================================
CREATE OR REPLACE VIEW phone_verification_stats AS
SELECT 
  COUNT(*) as total_users_auth,
  COUNT(auth_users.phone) as users_with_phone_auth,
  COUNT(CASE WHEN auth_users.phone_confirmed_at IS NOT NULL THEN 1 END) as verified_phone_users_auth,
  COUNT(pv.user_id) as users_with_phone_verification_table,
  COUNT(DISTINCT pv.phone_number) as unique_verified_phones
FROM auth.users auth_users
FULL OUTER JOIN phone_verifications pv ON auth_users.id = pv.user_id;

-- =============================================
-- 9. 権限設定
-- =============================================
-- audit_logs テーブル
GRANT INSERT ON audit_logs TO service_role;

-- phone_verifications テーブル
GRANT SELECT ON phone_verifications TO authenticated;

-- security_audit_log テーブル
GRANT INSERT ON security_audit_log TO service_role;

-- 関数の権限
GRANT EXECUTE ON FUNCTION normalize_phone_number(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_phone_availability(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_phone_verification(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION log_phone_verification_attempt(TEXT, UUID, TEXT, BOOLEAN, TEXT) TO service_role;

-- ビューの権限
GRANT SELECT ON phone_verification_stats TO authenticated;

-- =============================================
-- 10. 実行完了ログ
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE '電話番号認証システム完全実装マイグレーション完了';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '作成されたテーブル:';
  RAISE NOTICE '- audit_logs: 監査ログテーブル';
  RAISE NOTICE '- phone_verifications: 電話番号認証管理テーブル';
  RAISE NOTICE '- security_audit_log: セキュリティ監査ログテーブル';
  RAISE NOTICE '';
  RAISE NOTICE '作成された関数:';
  RAISE NOTICE '- normalize_phone_number: 電話番号正規化';
  RAISE NOTICE '- check_phone_availability: 電話番号重複チェック';
  RAISE NOTICE '- record_phone_verification: 電話番号認証記録';
  RAISE NOTICE '- log_phone_verification_attempt: セキュリティログ記録';
  RAISE NOTICE '';
  RAISE NOTICE '作成されたビュー:';
  RAISE NOTICE '- phone_verification_stats: 認証状況統計';
  RAISE NOTICE '';
  RAISE NOTICE 'RLSポリシーとインデックスも設定済み';
  RAISE NOTICE '==============================================';
END $$;
