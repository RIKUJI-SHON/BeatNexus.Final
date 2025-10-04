-- Migration: Update update_user_profile_details function to support instagram_id
-- Date: 2025-10-04
-- Description: Adds p_instagram_id parameter to allow updating Instagram handle

CREATE OR REPLACE FUNCTION public.update_user_profile_details(
  p_user_id uuid, 
  p_username text, 
  p_bio text,
  p_instagram_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_result JSON;
  v_current_username TEXT;
  v_normalized_instagram_id TEXT;
BEGIN
  -- Check if user exists and is the authenticated user
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Can only update own profile';
  END IF;

  -- Check if username is being changed and if it already exists
  SELECT username INTO v_current_username FROM profiles WHERE id = p_user_id;
  IF p_username IS DISTINCT FROM v_current_username THEN
    IF EXISTS (SELECT 1 FROM profiles WHERE username = p_username AND id != p_user_id) THEN
      RAISE EXCEPTION 'Username already taken: %', p_username;
    END IF;
  END IF;

  -- Normalize Instagram ID: trim whitespace and convert empty string to NULL
  v_normalized_instagram_id := NULLIF(TRIM(p_instagram_id), '');

  -- Validate Instagram ID format if provided
  IF v_normalized_instagram_id IS NOT NULL THEN
    -- Remove @ prefix if present
    IF v_normalized_instagram_id LIKE '@%' THEN
      v_normalized_instagram_id := SUBSTRING(v_normalized_instagram_id FROM 2);
    END IF;
    
    -- Extract username from URL if full Instagram URL is provided
    IF v_normalized_instagram_id LIKE '%instagram.com/%' THEN
      v_normalized_instagram_id := REGEXP_REPLACE(v_normalized_instagram_id, '^.*instagram\.com/', '');
      v_normalized_instagram_id := SPLIT_PART(v_normalized_instagram_id, '/', 1);
      v_normalized_instagram_id := SPLIT_PART(v_normalized_instagram_id, '?', 1);
    END IF;
    
    -- Final trim after extraction
    v_normalized_instagram_id := TRIM(v_normalized_instagram_id);
    
    -- Convert to NULL if empty after normalization
    v_normalized_instagram_id := NULLIF(v_normalized_instagram_id, '');
    
    -- Validate format and length
    IF v_normalized_instagram_id IS NOT NULL THEN
      IF NOT (v_normalized_instagram_id ~ '^[a-zA-Z0-9._]+$') THEN
        RAISE EXCEPTION 'Invalid Instagram username format. Only letters, numbers, periods, and underscores are allowed.';
      END IF;
      
      IF char_length(v_normalized_instagram_id) > 30 THEN
        RAISE EXCEPTION 'Instagram username too long. Maximum 30 characters allowed.';
      END IF;
    END IF;
  END IF;

  -- Update the profile details in profiles table
  UPDATE profiles 
  SET 
    username = COALESCE(p_username, profiles.username),
    bio = COALESCE(p_bio, profiles.bio),
    instagram_id = v_normalized_instagram_id,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user ID: %', p_user_id;
  END IF;

  -- Return success response with updated data
  SELECT json_build_object(
    'success', true,
    'message', 'Profile details updated successfully',
    'profile', (SELECT row_to_json(p) FROM profiles p WHERE p.id = p_user_id)
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error response
    SELECT json_build_object(
      'success', false,
      'error', SQLERRM
    ) INTO v_result;
    
    RETURN v_result;
END;
$function$;

-- Grant permissions to roles
GRANT ALL ON FUNCTION public.update_user_profile_details(uuid, text, text, text) TO anon;
GRANT ALL ON FUNCTION public.update_user_profile_details(uuid, text, text, text) TO authenticated;
GRANT ALL ON FUNCTION public.update_user_profile_details(uuid, text, text, text) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.update_user_profile_details(uuid, text, text, text) IS 
'Updates user profile details including username, bio, and Instagram ID. Instagram ID is normalized to handle @username or full URL formats.';
