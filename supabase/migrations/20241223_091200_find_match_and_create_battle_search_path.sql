-- Set search_path for find_match_and_create_battle function
-- Date: 2024-12-23 09:12:00
-- Category: Battle & Matchmaking Functions - Security Enhancement

-- This migration adds proper search_path configuration to the 
-- find_match_and_create_battle function for security and predictability.

ALTER FUNCTION public.find_match_and_create_battle(p_submission_id uuid) 
SET search_path = 'public', 'auth';

-- Verification: Check that the function has correct search_path configuration
DO $$
DECLARE
    func_config TEXT;
BEGIN
    SELECT array_to_string(proconfig, ', ') INTO func_config
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'find_match_and_create_battle';
    
    IF func_config IS NULL OR func_config NOT LIKE '%search_path=public, auth%' THEN
        RAISE EXCEPTION 'find_match_and_create_battle search_path configuration failed';
    END IF;
    
    RAISE NOTICE 'find_match_and_create_battle search_path configured successfully: %', func_config;
END $$;
