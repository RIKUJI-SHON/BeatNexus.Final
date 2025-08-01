-- Set search_path for utility and reward system functions
-- Date: 2024-12-23 10:30:00
-- Category: Mixed Utility & Reward Functions - Security Enhancement

-- This migration configures search_path for 3 important functions:
-- 1. call_edge_function - Edge Function integration utility
-- 2. handle_updated_at - Universal updated_at trigger function
-- 3. grant_season_rewards - Season reward distribution system

-- Note: grant_season_rewards was incorrectly marked as "unused" in analysis
-- but is actually a critical reward system function

-- 1. call_edge_function - Edge Function呼び出しユーティリティ
-- Requires auth schema for JWT token access via current_setting
ALTER FUNCTION public.call_edge_function(function_name text, payload jsonb) 
SET search_path = 'public', 'auth';

-- 2. handle_updated_at - 汎用updated_at更新トリガー
-- Simple trigger function, public schema sufficient
ALTER FUNCTION public.handle_updated_at() 
SET search_path = 'public';

-- 3. grant_season_rewards - シーズン報酬付与システム
-- Critical reward function requiring both public and auth schema access
ALTER FUNCTION public.grant_season_rewards(season_id_param uuid) 
SET search_path = 'public', 'auth';

-- Verification: Check that all functions have correct search_path configuration
DO $$
DECLARE
    function_configs RECORD;
    success_count INTEGER := 0;
    expected_configs JSONB := '{"call_edge_function": "public, auth", "handle_updated_at": "public", "grant_season_rewards": "public, auth"}';
BEGIN
    FOR function_configs IN 
        SELECT 
            p.proname,
            pg_get_function_identity_arguments(p.oid) as args,
            array_to_string(p.proconfig, ', ') as config
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname IN ('call_edge_function', 'handle_updated_at', 'grant_season_rewards')
    LOOP
        DECLARE
            expected_config TEXT := expected_configs->>function_configs.proname;
        BEGIN
            IF function_configs.config IS NULL OR function_configs.config NOT LIKE '%search_path=' || expected_config || '%' THEN
                RAISE EXCEPTION 'Function %(%) search_path configuration failed: expected %, got %', 
                    function_configs.proname, 
                    function_configs.args,
                    expected_config,
                    COALESCE(function_configs.config, 'NULL');
            ELSE
                success_count := success_count + 1;
                RAISE NOTICE 'Function %(%) configured successfully: %', 
                    function_configs.proname, 
                    function_configs.args,
                    function_configs.config;
            END IF;
        END;
    END LOOP;
    
    RAISE NOTICE 'Utility and reward functions configured successfully: % functions', success_count;
    RAISE NOTICE 'IMPORTANT: grant_season_rewards is a CRITICAL reward system function, not unused!';
END $$;
