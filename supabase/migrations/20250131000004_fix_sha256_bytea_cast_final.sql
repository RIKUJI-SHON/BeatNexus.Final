-- 409エラー修正: digest関数をsha256に変更し、byteaキャストを追加
-- pgcrypto拡張を有効化し、適切な型変換を適用
-- 2025-01-31

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- check_rate_limit関数の修正
CREATE OR REPLACE FUNCTION check_rate_limit(phone_number TEXT)
RETURNS JSON
LANGUAGE plpgsql
SET search_path = 'public', 'auth'
AS $$
DECLARE
  attempt_count INTEGER;
  last_attempt TIMESTAMP WITH TIME ZONE;
  phone_hash TEXT;
BEGIN
  -- 電話番号のハッシュ化を事前に行う（byteaキャスト付き）
  phone_hash := encode(sha256(phone_number::bytea), 'hex');
  
  SELECT COUNT(*), MAX(created_at)
  INTO attempt_count, last_attempt
  FROM audit_logs
  WHERE details->>'phone_number_hash' = phone_hash
    AND action = 'SEND_SMS'
    AND created_at > NOW() - INTERVAL '1 hour';
  
  IF attempt_count >= 3 THEN
    PERFORM log_security_event(
      'RATE_LIMIT_EXCEEDED',
      NULL,
      phone_number,
      json_build_object(
        'attempt_count', attempt_count,
        'last_attempt', last_attempt,
        'limit_period', '1 hour'
      )::jsonb
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

-- log_security_event関数の修正
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
SET search_path = 'public', 'auth'
AS $$
DECLARE
  phone_hash TEXT;
BEGIN
  -- 電話番号のハッシュ化を事前に行う（byteaキャスト付き）
  IF p_phone_number IS NOT NULL THEN
    phone_hash := encode(sha256(p_phone_number::bytea), 'hex');
  ELSE
    phone_hash := NULL;
  END IF;
  
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
    phone_hash,
    p_event_data,
    p_severity_level,
    NOW()
  );
END;
$$;

-- record_phone_verification関数の修正
CREATE OR REPLACE FUNCTION record_phone_verification(p_user_id UUID, p_phone_number TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  normalized_phone TEXT;
  existing_record RECORD;
  old_phone_hash TEXT;
  new_phone_hash TEXT;
BEGIN
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
  
  normalized_phone := normalize_phone_number(p_phone_number);
  IF normalized_phone IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_phone_format',
      'message', '電話番号の形式が正しくありません。'
    );
  END IF;
  
  SELECT * INTO existing_record
  FROM phone_verifications
  WHERE user_id = p_user_id AND is_active = true;
  
  IF FOUND THEN
    -- ハッシュ化を事前に行う（byteaキャスト付き）
    old_phone_hash := encode(sha256(existing_record.phone_number::bytea), 'hex');
    new_phone_hash := encode(sha256(normalized_phone::bytea), 'hex');
    
    UPDATE phone_verifications 
    SET 
      phone_number = normalized_phone,
      verified_at = NOW(),
      updated_at = NOW()
    WHERE user_id = p_user_id AND is_active = true;
    
    PERFORM log_audit_event(
      'phone_verifications',
      'UPDATE',
      p_user_id,
      json_build_object(
        'old_phone_hash', old_phone_hash,
        'new_phone_hash', new_phone_hash
      )::jsonb
    );
  ELSE
    -- ハッシュ化を事前に行う（byteaキャスト付き）
    new_phone_hash := encode(sha256(normalized_phone::bytea), 'hex');
    
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
    
    PERFORM log_audit_event(
      'phone_verifications',
      'INSERT',
      p_user_id,
      json_build_object(
        'phone_number_hash', new_phone_hash
      )::jsonb
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'phone_number_hash', encode(sha256(normalized_phone::bytea), 'hex'),
    'message', '電話番号認証を記録しました。'
  );
  
EXCEPTION
  WHEN unique_violation THEN
    PERFORM log_security_event(
      'PHONE_DUPLICATE_ATTEMPT',
      p_user_id,
      normalized_phone,
      json_build_object(
        'context', 'record_verification',
        'error', SQLERRM
      )::jsonb
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'phone_already_exists',
      'message', 'この電話番号は既に他のアカウントで使用されています。'
    );
  WHEN others THEN
    PERFORM log_audit_event(
      'phone_verifications',
      'INSERT',
      p_user_id,
      json_build_object(
        'error', SQLERRM,
        'sqlstate', SQLSTATE
      )::jsonb,
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

-- check_phone_availability関数の修正
CREATE OR REPLACE FUNCTION check_phone_availability(phone_input TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $$
DECLARE
  normalized_phone TEXT;
  existing_count INTEGER;
  rate_limit_result JSON;
  phone_hash TEXT;
BEGIN
  IF phone_input IS NULL OR trim(phone_input) = '' THEN
    RETURN json_build_object(
      'available', false,
      'error', 'invalid_input',
      'message', '電話番号が入力されていません。'
    );
  END IF;
  
  normalized_phone := normalize_phone_number(phone_input);
  
  IF normalized_phone IS NULL THEN
    RETURN json_build_object(
      'available', false,
      'error', 'invalid_format',
      'message', '電話番号の形式が正しくありません。'
    );
  END IF;
  
  rate_limit_result := check_rate_limit(normalized_phone);
  IF (rate_limit_result->>'allowed')::boolean = false THEN
    RETURN json_build_object(
      'available', false,
      'error', 'rate_limit_exceeded',
      'message', rate_limit_result->>'message'
    );
  END IF;
  
  SELECT COUNT(*) INTO existing_count
  FROM phone_verifications 
  WHERE phone_number = normalized_phone 
    AND is_active = true;
  
  IF existing_count > 0 THEN
    -- ハッシュ化を事前に行う（byteaキャスト付き）
    phone_hash := encode(sha256(normalized_phone::bytea), 'hex');
    
    PERFORM log_security_event(
      'PHONE_DUPLICATE_ATTEMPT',
      NULL,
      normalized_phone,
      json_build_object(
        'phone_number_hash', phone_hash,
        'normalized_phone', normalized_phone,
        'attempt_count', existing_count
      )::jsonb
    );
    
    RETURN json_build_object(
      'available', false,
      'error', 'phone_already_registered',
      'message', 'この電話番号は既に他のアカウントで使用されています。別の電話番号をお試しください。'
    );
  END IF;
  
  -- ハッシュ化を事前に行う（byteaキャスト付き）
  phone_hash := encode(sha256(normalized_phone::bytea), 'hex');
  
  PERFORM log_audit_event(
    'phone_verifications',
    'CHECK_AVAILABILITY',
    NULL,
    json_build_object(
      'phone_number_hash', phone_hash,
      'result', 'available'
    )::jsonb
  );
  
  RETURN json_build_object(
    'available', true,
    'message', '電話番号は利用可能です。',
    'normalized_phone', normalized_phone
  );
  
EXCEPTION
  WHEN others THEN
    PERFORM log_audit_event(
      'phone_verifications',
      'CHECK_AVAILABILITY',
      NULL,
      json_build_object(
        'error', SQLERRM,
        'sqlstate', SQLSTATE
      )::jsonb,
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
