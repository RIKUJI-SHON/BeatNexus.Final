-- Sync search_path settings from development to production environment
-- Date: 2024-12-23 09:25:00
-- Category: Environment Synchronization - Batch Search Path Configuration

-- This migration applies search_path configuration to 8 functions that were
-- already configured in development environment but missing in production.
-- This ensures environment parity and proper security configuration.

-- Functions being synchronized:
-- 1. Season Management Functions
-- 2. Ranking Functions  
-- 3. Audit and Utility Functions

-- 1. end_current_season - シーズン終了処理
ALTER FUNCTION public.end_current_season() 
SET search_path = 'public', 'auth';

-- 2. get_active_season - アクティブシーズン取得
ALTER FUNCTION public.get_active_season() 
SET search_path = 'public', 'auth';

-- 3. get_all_seasons - 全シーズン一覧取得
ALTER FUNCTION public.get_all_seasons() 
SET search_path = 'public', 'auth';

-- 4. get_season_voter_rankings_by_id - シーズン別投票者ランキング
ALTER FUNCTION public.get_season_voter_rankings_by_id(p_season_id uuid) 
SET search_path = 'public', 'auth';

-- 5. get_top_rankings - トップランキング取得
ALTER FUNCTION public.get_top_rankings(p_limit integer) 
SET search_path = 'public', 'auth';

-- 6. get_top_voter_rankings - トップ投票者ランキング取得
ALTER FUNCTION public.get_top_voter_rankings(p_limit integer) 
SET search_path = 'public', 'auth';

-- 7. log_audit_event - 監査ログ記録
ALTER FUNCTION public.log_audit_event(
    p_table_name text, 
    p_action text, 
    p_user_id uuid, 
    p_details jsonb, 
    p_success boolean, 
    p_error_message text
) SET search_path = 'public', 'auth';

-- 8. normalize_phone_number - 電話番号正規化
ALTER FUNCTION public.normalize_phone_number(phone_input text) 
SET search_path = 'public', 'auth';

-- Verification: Check that all functions have correct search_path configuration
DO $$
DECLARE
    function_names TEXT[] := ARRAY[
        'end_current_season',
        'get_active_season', 
        'get_all_seasons',
        'get_season_voter_rankings_by_id',
        'get_top_rankings',
        'get_top_voter_rankings',
        'log_audit_event',
        'normalize_phone_number'
    ];
    func_name TEXT;
    func_config TEXT;
    success_count INTEGER := 0;
BEGIN
    FOREACH func_name IN ARRAY function_names
    LOOP
        SELECT array_to_string(proconfig, ', ') INTO func_config
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = func_name;
        
        IF func_config IS NULL OR func_config NOT LIKE '%search_path=public, auth%' THEN
            RAISE EXCEPTION 'Function % search_path configuration failed: %', func_name, COALESCE(func_config, 'NULL');
        ELSE
            success_count := success_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Environment synchronization completed successfully: % functions configured', success_count;
END $$;
