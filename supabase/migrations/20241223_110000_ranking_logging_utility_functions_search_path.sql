-- Set search_path for ranking, logging, and utility functions
-- Date: 2024-12-23 11:00:00
-- Category: Mixed Functions - Rankings, Logging, and Utilities

-- This migration addresses several important function categories:
-- 1. Ranking functions (previously marked as "skip" but actually important)
-- 2. New logging functions not in original analysis
-- 3. get_k_factor_by_format overload completion

-- IMPORTANT CORRECTIONS:
-- - get_user_rank and get_user_voter_rank were incorrectly marked as "skip/unused" 
--   but are actually important ranking functions
-- - log_api_access and get_user_season_rank are new functions not in original analysis
-- - log_security_event has multiple overloads with different configurations

-- 1. get_k_factor_by_format (text版) - K-factor計算関数のtext版オーバーロード
ALTER FUNCTION public.get_k_factor_by_format(battle_format text) 
SET search_path = 'public', 'auth';

-- 2. get_user_season_rank - 新規: ユーザーのシーズン内ランキング取得
ALTER FUNCTION public.get_user_season_rank(user_id_input uuid) 
SET search_path = 'public', 'auth';

-- 3. get_user_rank - 重要: ユーザー全体ランキング取得（スキップ対象ではない）
ALTER FUNCTION public.get_user_rank(p_user_id uuid) 
SET search_path = 'public', 'auth';

-- 4. get_user_voter_rank - 重要: ユーザー投票者ランキング取得（スキップ対象ではない）
ALTER FUNCTION public.get_user_voter_rank(p_user_id uuid) 
SET search_path = 'public', 'auth';

-- 5. log_api_access - 新規: API アクセスログ記録機能
ALTER FUNCTION public.log_api_access(table_name text, operation text, user_id uuid, query_params jsonb) 
SET search_path = 'public', 'auth';

-- 6. log_security_event (中間バージョン) - セキュリティイベントログの中間オーバーロード
ALTER FUNCTION public.log_security_event(p_event_type text, p_user_id uuid, p_phone_number text, p_event_data jsonb) 
SET search_path = 'public', 'auth';

-- Verification: Check that all functions have correct search_path configuration
DO $$
DECLARE
    function_configs RECORD;
    success_count INTEGER := 0;
    function_names TEXT[] := ARRAY[
        'get_k_factor_by_format', 
        'get_user_season_rank',
        'get_user_rank',
        'get_user_voter_rank', 
        'log_api_access'
    ];
    func_name TEXT;
BEGIN
    -- Check main functions
    FOREACH func_name IN ARRAY function_names
    LOOP
        FOR function_configs IN 
            SELECT 
                p.proname,
                pg_get_function_identity_arguments(p.oid) as args,
                array_to_string(p.proconfig, ', ') as config
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = func_name
        LOOP
            IF function_configs.config IS NULL OR function_configs.config NOT LIKE '%search_path=public, auth%' THEN
                RAISE EXCEPTION 'Function %(%) search_path configuration failed: %', 
                    function_configs.proname, 
                    function_configs.args,
                    COALESCE(function_configs.config, 'NULL');
            ELSE
                success_count := success_count + 1;
                RAISE NOTICE 'Function %(%) configured successfully', 
                    function_configs.proname, 
                    function_configs.args;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Mixed function categories configured successfully: % function instances', success_count;
    RAISE NOTICE 'ANALYSIS CORRECTIONS APPLIED:';
    RAISE NOTICE '- get_user_rank: NOT unused - important ranking function';
    RAISE NOTICE '- get_user_voter_rank: NOT unused - important voting ranking function';  
    RAISE NOTICE '- New functions added: log_api_access, get_user_season_rank';
END $$;
