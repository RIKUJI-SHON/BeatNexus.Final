-- Add is_active column to rewards table for better data management
-- Created: 2025-07-22

-- 1. Add is_active column to rewards table
ALTER TABLE rewards 
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- 2. Create index for better query performance
CREATE INDEX idx_rewards_is_active ON rewards(is_active);

-- 3. Update existing rewards to be active
UPDATE rewards SET is_active = true WHERE is_active IS NULL;

-- 4. Update RLS policy to include is_active filter
DROP POLICY IF EXISTS "Anyone can read rewards" ON rewards;
CREATE POLICY "Anyone can read active rewards" ON rewards
  FOR SELECT USING (is_active = true);

-- 5. Add comment
COMMENT ON COLUMN rewards.is_active IS 'Whether the reward is currently active and available for display';
