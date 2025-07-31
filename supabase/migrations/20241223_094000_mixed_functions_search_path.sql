-- Set search_path for phone verification, video submission, and voting functions
-- Date: 2024-12-23 09:40:00
-- Category: Mixed Category Functions - Security Enhancement

-- This migration adds proper search_path configuration to 3 functions:
-- 1. record_phone_verification - Phone verification system
-- 2. submit_video - Video submission system  
-- 3. vote_battle - Battle voting system

-- Note: handle_new_user already has search_path=public (sufficient for trigger)
-- Note: start_new_season already has search_path=public,auth

-- 1. record_phone_verification - 電話番号認証記録
ALTER FUNCTION public.record_phone_verification(p_user_id uuid, p_phone_number text) 
SET search_path = 'public', 'auth';

-- 2. submit_video - 動画投稿機能（バトル形式対応）
ALTER FUNCTION public.submit_video(p_video_url text, p_battle_format battle_format) 
SET search_path = 'public', 'auth';

-- 3. vote_battle - バトル投票機能
ALTER FUNCTION public.vote_battle(p_battle_id uuid, p_vote character) 
SET search_path = 'public', 'auth';

-- Verification: Check that all functions have correct search_path configuration
DO $$
DECLARE
    function_configs RECORD;
    success_count INTEGER := 0;
BEGIN
    FOR function_configs IN 
        SELECT 
            p.proname,
            pg_get_function_identity_arguments(p.oid) as args,
            array_to_string(p.proconfig, ', ') as config
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname IN ('record_phone_verification', 'submit_video', 'vote_battle')
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
    
    RAISE NOTICE 'Mixed category functions configured successfully: % functions', success_count;
END $$;
