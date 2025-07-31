-- Migration: Add search_path to check_phone_availability function
-- Date: 2025-01-31
-- Purpose: Set proper search_path for check_phone_availability function to ensure correct schema resolution
-- Fixed: Explicitly specify log_security_event function with correct parameters

CREATE OR REPLACE FUNCTION public.check_phone_availability(phone_input text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $function$
DECLARE
  normalized_phone TEXT;
  existing_count INTEGER;
  rate_limit_result JSON;
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
    PERFORM public.log_security_event(
      'PHONE_DUPLICATE_ATTEMPT',
      NULL,
      normalized_phone,
      json_build_object(
        'phone_number_hash', encode(digest(normalized_phone, 'sha256'), 'hex'),
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
  
    PERFORM public.log_audit_event(
      'phone_verifications',
      'CHECK_AVAILABILITY',
      NULL,
      json_build_object(
        'phone_number_hash', encode(digest(normalized_phone, 'sha256'), 'hex'),
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
    PERFORM public.log_audit_event(
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
$function$;
