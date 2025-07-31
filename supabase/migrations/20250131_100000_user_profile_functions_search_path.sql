-- Configure search_path for User Profile Management Functions
-- Migration: 20250131_100000_user_profile_functions_search_path.sql
-- Category: User Account Management Functions (High Priority)
-- Applied: 2025-01-31 - Both DEV and PROD environments

-- Purpose: Set consistent search_path for all user profile management functions
-- This ensures predictable schema access for functions that depend on auth.uid()

-- 1. set_user_language_from_browser: Browser language detection with automatic profile updates
-- Dependencies: auth.uid(), public.profiles table
ALTER FUNCTION public.set_user_language_from_browser(uuid, text) SET search_path = 'public', 'auth';

-- 2. update_user_language: Language preference updates with validation  
-- Dependencies: auth.uid(), public.profiles table
ALTER FUNCTION public.update_user_language(uuid, text) SET search_path = 'public', 'auth';

-- 3. update_user_avatar: Avatar URL updates with authentication validation
-- Dependencies: auth.uid(), public.profiles table
ALTER FUNCTION public.update_user_avatar(uuid, text) SET search_path = 'public', 'auth';

-- 4. update_user_profile_details: Username and bio updates with uniqueness validation
-- Dependencies: auth.uid(), public.profiles table, uniqueness constraints
ALTER FUNCTION public.update_user_profile_details(uuid, text, text) SET search_path = 'public', 'auth';

-- 5. get_user_profile: Profile data retrieval with error handling
-- Dependencies: public.profiles table, public.communities table
ALTER FUNCTION public.get_user_profile(uuid) SET search_path = 'public', 'auth';

-- 6. get_user_email_language: Language preference retrieval with defaults
-- Dependencies: public.profiles table, language fallback logic
ALTER FUNCTION public.get_user_email_language(uuid) SET search_path = 'public', 'auth';

-- 7. update_onboarding_status: Onboarding completion tracking
-- Dependencies: auth.uid(), public.profiles table
ALTER FUNCTION public.update_onboarding_status(uuid, boolean) SET search_path = 'public', 'auth';

-- Migration Summary: 
-- ✅ 7 User Profile Management functions configured with search_path
-- ✅ All functions tested in both DEV and PROD environments
-- ✅ Functions return appropriate error messages for invalid inputs
-- ✅ Authentication context properly preserved via 'public', 'auth' search_path

-- Progress: 23/81 functions completed (28% complete)
-- Completed Categories: Phone Verification, ELO Rating, User Deletion, Email Management, User Profile Management
