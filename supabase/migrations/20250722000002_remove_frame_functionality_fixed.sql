-- Remove frame functionality from BeatNexus (PRODUCTION FIXED VERSION)
-- 1. Remove frame-related data from rewards table
-- 2. Remove equipped_frame_id column from profiles table (if exists)
-- 3. Update type constraint to only allow 'badge'

BEGIN;

-- First, check if equipped_frame_id column exists and remove it if it does
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'equipped_frame_id'
        AND table_schema = 'public'
    ) THEN
        -- Remove all frame-type rewards from user_rewards table first
        DELETE FROM user_rewards 
        WHERE reward_id IN (
          SELECT id FROM rewards WHERE type = 'frame'
        );

        -- Remove frame rewards from rewards table
        DELETE FROM rewards WHERE type = 'frame';

        -- Remove equipped_frame_id column from profiles table
        ALTER TABLE profiles DROP COLUMN equipped_frame_id;

        -- Drop the index on equipped_frame_id (if it exists)
        DROP INDEX IF EXISTS idx_profiles_equipped_frame;

        -- Drop the policy for equipped_frame_id updates (if it exists)
        DROP POLICY IF EXISTS "Users can update own equipped frame" ON profiles;

        RAISE NOTICE 'Frame functionality removed successfully';
    ELSE
        -- Still remove frame records if they exist
        DELETE FROM user_rewards 
        WHERE reward_id IN (
          SELECT id FROM rewards WHERE type = 'frame'
        );

        DELETE FROM rewards WHERE type = 'frame';

        RAISE NOTICE 'Frame records removed, no equipped_frame_id column found';
    END IF;
END $$;

-- Update the type constraint to only allow 'badge'
-- First drop existing constraint if it exists
ALTER TABLE rewards DROP CONSTRAINT IF EXISTS rewards_type_check;

-- Add new constraint that only allows 'badge'
ALTER TABLE rewards ADD CONSTRAINT rewards_type_check CHECK (type = 'badge');

COMMIT;
