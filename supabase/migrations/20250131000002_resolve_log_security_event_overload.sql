-- Migration: Resolve log_security_event function overload conflict
-- Date: 2025-01-31
-- Purpose: Remove 2-parameter version of log_security_event to resolve function resolution conflict
-- This allows proper search_path setting for check_phone_availability function

-- 1. 2パラメータ版のlog_security_event関数を削除
DROP FUNCTION IF EXISTS public.log_security_event(text, jsonb);

-- 2. 5パラメータ版のlog_security_event関数にsearch_pathを設定
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text, 
  p_user_id uuid DEFAULT NULL::uuid, 
  p_phone_number text DEFAULT NULL::text, 
  p_event_data jsonb DEFAULT NULL::jsonb, 
  p_severity_level integer DEFAULT 3
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $function$
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
$function$;
