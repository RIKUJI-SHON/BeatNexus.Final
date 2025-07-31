-- Fix cleanup_all_deleted_user_videos function: resolve recursive call bug and set search_path
-- Date: 2024-12-23 09:06:00
-- Category: Cleanup Functions - Bug Fix and Security Enhancement

-- This migration fixes a critical bug where cleanup_all_deleted_user_videos 
-- was calling itself recursively instead of delete_user_videos_from_storage,
-- and adds proper search_path configuration for security.

CREATE OR REPLACE FUNCTION public.cleanup_all_deleted_user_videos()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $function$
DECLARE
  v_deleted_user RECORD;
  v_cleanup_result JSON;
  v_total_videos_deleted INTEGER := 0;
  v_total_videos_failed INTEGER := 0;
  v_processed_users INTEGER := 0;
BEGIN
  -- 削除済みユーザーをループ処理
  FOR v_deleted_user IN
    SELECT id 
    FROM profiles 
    WHERE is_deleted = TRUE
    LIMIT 50  -- 一度に処理するユーザー数を制限
  LOOP
    -- 各ユーザーの動画を削除（修正: 適切な関数を呼び出し）
    -- 旧: SELECT cleanup_all_deleted_user_videos() INTO v_cleanup_result; (再帰呼び出し)
    -- 新: SELECT delete_user_videos_from_storage(v_deleted_user.id) INTO v_cleanup_result;
    SELECT delete_user_videos_from_storage(v_deleted_user.id) INTO v_cleanup_result;
    
    -- 結果を集計
    v_total_videos_deleted := v_total_videos_deleted + COALESCE((v_cleanup_result->>'deleted_count')::INTEGER, 0);
    v_total_videos_failed := v_total_videos_failed + COALESCE((v_cleanup_result->>'failed_count')::INTEGER, 0);
    v_processed_users := v_processed_users + 1;
    
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'processed_users', v_processed_users,
    'total_videos_deleted', v_total_videos_deleted,
    'total_videos_failed', v_total_videos_failed,
    'message', 'Bulk video cleanup completed'
  );
END;
$function$;

-- Verification: Check that the function has correct search_path configuration
DO $$
DECLARE
    func_config TEXT;
BEGIN
    SELECT array_to_string(proconfig, ', ') INTO func_config
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'cleanup_all_deleted_user_videos';
    
    IF func_config IS NULL OR func_config NOT LIKE '%search_path=public, auth%' THEN
        RAISE EXCEPTION 'cleanup_all_deleted_user_videos search_path configuration failed';
    END IF;
    
    RAISE NOTICE 'cleanup_all_deleted_user_videos search_path configured successfully: %', func_config;
END $$;
