-- Configure search_path for Battle & Matchmaking System Functions
-- Migration: 20250131_110000_battle_matchmaking_functions_search_path.sql
-- Category: Battle & Matchmaking Functions (High Priority)
-- Applied: 2025-01-31 - Both DEV and PROD environments

-- Purpose: Set consistent search_path for all battle and matchmaking functions
-- This ensures predictable schema access for complex battle management operations

-- 1. complete_battle_with_video_archiving: Battle completion with video archiving
-- Dependencies: auth.uid(), public.battles, public.battle_videos, public.profiles, ratings calculations
-- Arguments: p_battle_id uuid, p_winner_id uuid DEFAULT NULL::uuid
-- Returns: json
ALTER FUNCTION public.complete_battle_with_video_archiving(uuid, uuid) SET search_path = 'public', 'auth';

-- 2. progressive_matchmaking: Intelligent matchmaking algorithm with progressive rating ranges
-- Dependencies: auth.uid(), public.waiting_submissions, public.profiles, public.battles, rating calculations
-- Arguments: none
-- Returns: json
ALTER FUNCTION public.progressive_matchmaking() SET search_path = 'public', 'auth';

-- 3. process_expired_battles: Cleanup expired battles and submissions
-- Dependencies: public.battles, public.waiting_submissions, timestamp operations, automatic cleanup
-- Arguments: none
-- Returns: json
ALTER FUNCTION public.process_expired_battles() SET search_path = 'public', 'auth';

-- 4. can_submit_video: Video submission eligibility check based on season status
-- Dependencies: auth.uid(), public.waiting_submissions, public.battles, season management
-- Arguments: none
-- Returns: boolean
ALTER FUNCTION public.can_submit_video() SET search_path = 'public', 'auth';

-- 5. check_submission_cooldown: Cooldown period validation for submissions
-- Dependencies: public.waiting_submissions, timestamp calculations, cooldown policy
-- Arguments: p_user_id uuid
-- Returns: json
ALTER FUNCTION public.check_submission_cooldown(uuid) SET search_path = 'public', 'auth';

-- 6. create_submission_with_cooldown_check: Submission creation with validation and cooldown
-- Dependencies: auth.uid(), public.waiting_submissions, public.profiles, validation logic
-- Arguments: p_user_id uuid, p_video_url text, p_battle_format text
-- Returns: json
ALTER FUNCTION public.create_submission_with_cooldown_check(uuid, text, text) SET search_path = 'public', 'auth';

-- 7. withdraw_submission: Submission withdrawal functionality
-- Dependencies: auth.uid(), public.waiting_submissions, authorization checks
-- Arguments: p_submission_id uuid
-- Returns: boolean
ALTER FUNCTION public.withdraw_submission(uuid) SET search_path = 'public', 'auth';

-- 8. get_submission_status: Current user submission status and season information
-- Dependencies: auth.uid(), public.waiting_submissions, season management
-- Arguments: none
-- Returns: json
ALTER FUNCTION public.get_submission_status() SET search_path = 'public', 'auth';

-- 9. get_waiting_submissions: Retrieve all waiting submissions with user details
-- Dependencies: public.waiting_submissions, public.profiles, user data aggregation
-- Arguments: none
-- Returns: TABLE with submission and user data
ALTER FUNCTION public.get_waiting_submissions() SET search_path = 'public', 'auth';

-- Migration Summary: 
-- ✅ 9 Battle & Matchmaking functions configured with search_path
-- ✅ All functions tested in both DEV and PROD environments
-- ✅ Functions handle season management, video submissions, and matchmaking logic
-- ✅ Authentication context properly preserved via 'public', 'auth' search_path
-- ✅ Complex battle workflow functions now have consistent schema access

-- Progress: 32/81 functions completed (40% complete)
-- Completed Categories: Phone Verification, ELO Rating, User Deletion, Email Management, User Profile Management, Battle & Matchmaking System

-- Key Functions in this Category:
-- - Video submission workflow management
-- - Progressive matchmaking algorithm
-- - Battle completion and archiving
-- - Cooldown and validation systems
-- - Season-aware submission controls
