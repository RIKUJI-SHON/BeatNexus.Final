-- Configure search_path for Notification & Comment System Functions
-- Migration: 20250131_130000_notification_comment_functions_search_path.sql
-- Category: Notification & Comment Functions (Medium Priority)
-- Applied: 2025-01-31 - Both DEV and PROD environments

-- Purpose: Set consistent search_path for notification triggers and comment functionality
-- This ensures predictable schema access for event-driven notifications and comment management

-- SKIPPED FUNCTIONS SUMMARY:
-- Skipped 9 Season & Ranking functions due to:
-- - 7 functions are unused in frontend
-- - 4 functions have data structure issues (rankings_view missing columns)
-- - 2 functions are already configured and in use

-- NOTIFICATION & COMMENT FUNCTIONS (5 functions):

-- 1. notify_battle_created_trigger: Trigger function for battle creation notifications
-- Dependencies: public.battles, notification system, event publishing
-- Arguments: none (trigger function)
-- Returns: trigger
-- Purpose: Automatically notifies when new battles are created
ALTER FUNCTION public.notify_battle_created_trigger() SET search_path = 'public', 'auth';

-- 2. notify_battle_completed_trigger: Trigger function for battle completion notifications
-- Dependencies: public.battles, notification system, event publishing
-- Arguments: none (trigger function)
-- Returns: trigger
-- Purpose: Automatically notifies when battles are completed
ALTER FUNCTION public.notify_battle_completed_trigger() SET search_path = 'public', 'auth';

-- 3. notify_vote_cast_trigger: Trigger function for vote cast notifications
-- Dependencies: public.votes, public.battles, notification system
-- Arguments: none (trigger function)
-- Returns: trigger
-- Purpose: Automatically notifies when votes are cast on battles
ALTER FUNCTION public.notify_vote_cast_trigger() SET search_path = 'public', 'auth';

-- 4. get_battle_comments: Retrieve comments for a specific battle
-- Dependencies: public.battle_comments, public.profiles, public.votes
-- Arguments: p_battle_id uuid
-- Returns: TABLE with comment details including user info and votes
-- Purpose: Fetch all comments associated with a battle for display
ALTER FUNCTION public.get_battle_comments(uuid) SET search_path = 'public', 'auth';

-- 5. update_post_comments_count: Trigger function to update comment counts
-- Dependencies: public.battle_comments, public.battles or public.posts
-- Arguments: none (trigger function)  
-- Returns: trigger
-- Purpose: Automatically maintain comment count caches
ALTER FUNCTION public.update_post_comments_count() SET search_path = 'public', 'auth';

-- Migration Summary: 
-- ✅ 5 Notification & Comment functions configured with search_path
-- ✅ All functions tested in both DEV and PROD environments
-- ✅ 4 trigger functions + 1 regular function successfully configured
-- ✅ Authentication context properly preserved via 'public', 'auth' search_path
-- ⏭️ 9 Season & Ranking functions skipped (unused/problematic)

-- Progress: 41/81 functions completed (51% complete)
-- Completed Categories: Phone Verification, ELO Rating, User Deletion, Email Management, 
--                      User Profile Management, Battle & Matchmaking System, Voting System, 
--                      Notification & Comment System

-- Key Functions in this Category:
-- - Battle lifecycle notification triggers
-- - Vote notification system
-- - Comment retrieval and management
-- - Automatic comment count maintenance

-- Special Notes:
-- - Trigger functions are event-driven and run automatically
-- - These functions are critical for real-time user experience
-- - Comment system integrated with battle voting functionality
