-- Migration: Add instagram_id column to profiles table
-- Date: 2025-10-04
-- Description: Adds instagram_id field to allow users to link their Instagram profile

-- Step 1: Add instagram_id column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS instagram_id VARCHAR(30);

-- Step 2: Add comment for documentation
COMMENT ON COLUMN profiles.instagram_id IS 'Instagram username (handle only, without @ or URL). Max 30 characters.';

-- Step 3: Add check constraint for valid Instagram username format
-- Instagram usernames can only contain letters, numbers, periods, and underscores
ALTER TABLE profiles
ADD CONSTRAINT instagram_id_format_check
CHECK (
  instagram_id IS NULL OR
  (
    instagram_id ~ '^[a-zA-Z0-9._]+$' AND
    char_length(instagram_id) <= 30 AND
    char_length(instagram_id) > 0
  )
);

-- Step 4: Create index for potential future searches
CREATE INDEX IF NOT EXISTS idx_profiles_instagram_id ON profiles(instagram_id) WHERE instagram_id IS NOT NULL;
