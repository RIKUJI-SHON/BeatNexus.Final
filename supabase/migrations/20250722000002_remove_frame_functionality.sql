-- Remove frame functionality from BeatNexus
-- 1. Remove frame-related data from rewards table
-- 2. Remove equipped_frame_id column from profiles table
-- 3. Drop frame-related indexes and policies

BEGIN;

-- Remove all frame-type rewards from user_rewards table first
DELETE FROM user_rewards 
WHERE reward_id IN (
  SELECT id FROM rewards WHERE type = 'frame'
);

-- Remove frame rewards from rewards table
DELETE FROM rewards WHERE type = 'frame';

-- Remove equipped_frame_id column from profiles table
ALTER TABLE profiles DROP COLUMN IF EXISTS equipped_frame_id;

-- Drop the index on equipped_frame_id (if it exists)
DROP INDEX IF EXISTS idx_profiles_equipped_frame;

-- Drop the policy for equipped_frame_id updates (if it exists)
DROP POLICY IF EXISTS "Users can update own equipped frame" ON profiles;

-- Since all frame records are now deleted, we can safely recreate the enum
-- Add a temporary column with the new type
ALTER TABLE rewards ADD COLUMN type_new reward_type_new;

-- This should work since only 'badge' records remain
UPDATE rewards SET type_new = 'badge'::reward_type_new WHERE type = 'badge';

-- Drop the old column
ALTER TABLE rewards DROP COLUMN type;

-- Rename the new column
ALTER TABLE rewards RENAME COLUMN type_new TO type;

-- Now we can safely drop and recreate the enum
DROP TYPE reward_type;
ALTER TYPE reward_type_new RENAME TO reward_type;

COMMIT;
