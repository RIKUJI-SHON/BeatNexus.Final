-- 電話番号認証システム改善のためのマイグレーション
-- 電話番号の重複防止機能を追加

-- 1. 電話番号重複チェック関数を作成
CREATE OR REPLACE FUNCTION check_phone_availability(p_phone_number TEXT)
RETURNS JSON AS $$
DECLARE
  existing_user_id UUID;
BEGIN
  -- 認証済み電話番号の重複チェック
  SELECT id INTO existing_user_id
  FROM auth.users 
  WHERE phone = p_phone_number 
    AND phone_confirmed_at IS NOT NULL
  LIMIT 1;

  IF existing_user_id IS NOT NULL THEN
    RETURN json_build_object(
      'available', false,
      'error', 'phone_already_registered',
      'message', 'この電話番号は既に別のアカウントで使用されています'
    );
  END IF;

  RETURN json_build_object(
    'available', true,
    'message', 'この電話番号は利用可能です'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 電話番号の一意性制約を追加（部分インデックス）
-- 認証済みの電話番号のみ一意性を保証
CREATE UNIQUE INDEX IF NOT EXISTS unique_phone_confirmed 
ON auth.users (phone) 
WHERE phone IS NOT NULL AND phone_confirmed_at IS NOT NULL;

-- 3. パフォーマンス向上のための追加インデックス
CREATE INDEX IF NOT EXISTS idx_auth_users_phone_confirmed 
ON auth.users (phone, phone_confirmed_at) 
WHERE phone IS NOT NULL AND phone_confirmed_at IS NOT NULL;

-- 4. 電話番号形式正規化関数（将来の拡張用）
CREATE OR REPLACE FUNCTION normalize_phone_number(p_phone_number TEXT)
RETURNS TEXT AS $$
BEGIN
  -- 基本的な正規化（スペース、ハイフン除去）
  RETURN regexp_replace(p_phone_number, '[^0-9+]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. セキュリティ監査用のログ関数
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

-- 6. 電話番号認証状況確認用のビュー（管理者用）
CREATE OR REPLACE VIEW phone_verification_stats AS
SELECT 
  COUNT(*) as total_users,
  COUNT(phone) as users_with_phone,
  COUNT(CASE WHEN phone_confirmed_at IS NOT NULL THEN 1 END) as verified_phone_users,
  COUNT(CASE WHEN phone IS NOT NULL AND phone_confirmed_at IS NULL THEN 1 END) as unverified_phone_users
FROM auth.users;

-- 実行ログ
DO $$
BEGIN
  RAISE NOTICE 'Phone verification system migration completed successfully';
  RAISE NOTICE 'Created functions: check_phone_availability, normalize_phone_number, log_phone_verification_attempt';
  RAISE NOTICE 'Created indexes: unique_phone_confirmed, idx_auth_users_phone_confirmed';
  RAISE NOTICE 'Created view: phone_verification_stats';
END $$;
