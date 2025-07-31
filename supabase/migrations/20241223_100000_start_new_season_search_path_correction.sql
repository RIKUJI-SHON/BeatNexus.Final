-- Sync search_path for start_new_season function from development to production
-- Date: 2024-12-23 10:00:00
-- Category: Season Management Functions - Environment Synchronization

-- This migration corrects the status of start_new_season function which was
-- mistakenly marked as "unused" in analysis but is actually a critical
-- season management function that requires proper search_path configuration.

-- Function purpose: Activates upcoming seasons and sends notifications to all users
-- Dependencies: Requires access to both 'public' and 'auth' schemas
-- - public.seasons, public.profiles, public.notifications
-- - auth.users (for notification distribution)

ALTER FUNCTION public.start_new_season() 
SET search_path = 'public', 'auth';

-- Verification: Check that the function has correct search_path configuration
DO $$
DECLARE
    func_config TEXT;
BEGIN
    SELECT array_to_string(proconfig, ', ') INTO func_config
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'start_new_season';
    
    IF func_config IS NULL OR func_config NOT LIKE '%search_path=public, auth%' THEN
        RAISE EXCEPTION 'start_new_season search_path configuration failed: %', COALESCE(func_config, 'NULL');
    END IF;
    
    RAISE NOTICE 'start_new_season search_path configured successfully: %', func_config;
    RAISE NOTICE 'Function status: CRITICAL SEASON MANAGEMENT FUNCTION - NOT UNUSED';
END $$;
