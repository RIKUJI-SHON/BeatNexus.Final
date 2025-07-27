-- 電話番号認証システム改善のためのマイグレーション（代替案）
-- auth.usersテーブルに直接制約を追加できないため、管理テーブルを作成

-- 1. 電話番号管理テーブルを作成
CREATE TABLE IF NOT EXISTS phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone_number ON phone_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_id ON phone_verifications(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_phone_verifications_user_phone ON phone_verifications(user_id, phone_number);

-- RLSを有効化
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- RLSポリシーを作成
CREATE POLICY "Users can view their own phone verifications" ON phone_verifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own phone verifications" ON phone_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own phone verifications" ON phone_verifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 2. 電話番号重複チェック関数を作成
CREATE OR REPLACE FUNCTION check_phone_availability(p_phone_number TEXT)
RETURNS JSON AS $$
DECLARE
  existing_user_id UUID;
  existing_in_auth UUID;
BEGIN
  -- まずphone_verificationsテーブルで重複チェック
  SELECT user_id INTO existing_user_id
  FROM phone_verifications 
  WHERE phone_number = p_phone_number
  LIMIT 1;

  -- auth.usersテーブルでも確認（既存データ対応）
  IF existing_user_id IS NULL THEN
    SELECT id INTO existing_in_auth
    FROM auth.users 
    WHERE phone = p_phone_number 
      AND phone_confirmed_at IS NOT NULL
    LIMIT 1;
    
    IF existing_in_auth IS NOT NULL THEN
      existing_user_id := existing_in_auth;
    END IF;
  END IF;

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

-- 3. 電話番号認証記録関数
CREATE OR REPLACE FUNCTION record_phone_verification(
  p_user_id UUID,
  p_phone_number TEXT
)
RETURNS JSON AS $$
DECLARE
  verification_record phone_verifications%ROWTYPE;
BEGIN
  -- 既存のレコードをチェック
  SELECT * INTO verification_record
  FROM phone_verifications
  WHERE user_id = p_user_id;

  IF verification_record.id IS NOT NULL THEN
    -- 既存レコードを更新
    UPDATE phone_verifications
    SET 
      phone_number = p_phone_number,
      verified_at = NOW(),
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO verification_record;
  ELSE
    -- 新規レコードを挿入
    INSERT INTO phone_verifications (user_id, phone_number)
    VALUES (p_user_id, p_phone_number)
    RETURNING * INTO verification_record;
  END IF;

  -- auth.usersテーブルも更新を試行（権限があればなければスキップ）
  BEGIN
    UPDATE auth.users
    SET 
      phone = p_phone_number,
      phone_confirmed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_user_id;
  EXCEPTION
    WHEN insufficient_privilege THEN
      -- 権限不足の場合はスキップ
      NULL;
  END;

  RETURN json_build_object(
    'success', true,
    'user_id', verification_record.user_id,
    'phone_number', verification_record.phone_number,
    'verified_at', verification_record.verified_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 電話番号形式正規化関数
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
  COUNT(*) as total_users_auth,
  COUNT(auth_users.phone) as users_with_phone_auth,
  COUNT(CASE WHEN auth_users.phone_confirmed_at IS NOT NULL THEN 1 END) as verified_phone_users_auth,
  COUNT(pv.user_id) as users_with_phone_verification_table,
  COUNT(DISTINCT pv.phone_number) as unique_verified_phones
FROM auth.users auth_users
FULL OUTER JOIN phone_verifications pv ON auth_users.id = pv.user_id;

-- 実行ログ
DO $$
BEGIN
  RAISE NOTICE 'Phone verification system migration completed successfully';
  RAISE NOTICE 'Created table: phone_verifications with RLS policies';
  RAISE NOTICE 'Created functions: check_phone_availability, record_phone_verification, normalize_phone_number, log_phone_verification_attempt';
  RAISE NOTICE 'Created view: phone_verification_stats';
END $$;
