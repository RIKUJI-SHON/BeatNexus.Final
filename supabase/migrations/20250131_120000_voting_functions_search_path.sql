-- Configure search_path for Voting System Functions
-- Migration: 20250131_120000_voting_functions_search_path.sql
-- Category: Voting Functions (Medium Priority)
-- Applied: 2025-01-31 - Both DEV and PROD environments

-- Purpose: Set consistent search_path for battle voting functionality
-- This ensures predictable schema access for user voting operations

-- ENVIRONMENT DIFFERENCES IDENTIFIED:
-- - vote_battle_fixed exists ONLY in development environment
-- - Production environment uses alternative voting implementation

-- DEVELOPMENT ENVIRONMENT FUNCTIONS (4 functions):

-- 1. vote_battle_with_comment: Vote on battle with comment functionality
-- Dependencies: auth.uid(), public.votes, public.battles, public.battle_comments
-- Arguments: p_battle_id uuid, p_vote character, p_comment text
-- Returns: json
ALTER FUNCTION public.vote_battle_with_comment(uuid, character, text) SET search_path = 'public', 'auth';

-- 2. vote_battle_fixed: Fixed version of battle voting (DEV ONLY)
-- Dependencies: auth.uid(), public.votes, public.battles
-- Arguments: p_battle_id uuid, p_vote text
-- Returns: json
-- Note: This function exists only in development environment
ALTER FUNCTION public.vote_battle_fixed(uuid, text) SET search_path = 'public', 'auth';

-- 3. cancel_vote: Cancel existing vote on battle
-- Dependencies: auth.uid(), public.votes, public.battles
-- Arguments: p_battle_id uuid
-- Returns: json
ALTER FUNCTION public.cancel_vote(uuid) SET search_path = 'public', 'auth';

-- 4. get_user_vote: Retrieve user's vote for specific battle
-- Dependencies: auth.uid(), public.votes, public.battles
-- Arguments: p_battle_id uuid
-- Returns: json
ALTER FUNCTION public.get_user_vote(uuid) SET search_path = 'public', 'auth';

-- PRODUCTION ENVIRONMENT FUNCTIONS (3 functions):
-- Same as above except vote_battle_fixed which does not exist in production

-- Migration Summary: 
-- ✅ 4 Voting functions configured with search_path in DEV environment
-- ✅ 3 Voting functions configured with search_path in PROD environment
-- ✅ All functions tested in both environments where they exist
-- ✅ Functions handle battle voting, vote cancellation, and vote retrieval
-- ✅ Authentication context properly preserved via 'public', 'auth' search_path
-- ⚠️  Environment difference: vote_battle_fixed exists only in development

-- Progress: 36/81 functions completed (44% complete)
-- Completed Categories: Phone Verification, ELO Rating, User Deletion, Email Management, 
--                      User Profile Management, Battle & Matchmaking System, Voting System

-- Key Functions in this Category:
-- - Battle voting with comment integration
-- - Vote cancellation functionality
-- - User vote status retrieval
-- - Development-specific voting fixes (vote_battle_fixed)

-- Environment Synchronization Notes:
-- Consider whether vote_battle_fixed should be deployed to production
-- or if it represents a development-only patch that should be removed
