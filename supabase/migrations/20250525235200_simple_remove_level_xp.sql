/*
  # Remove LEVEL and XP system - Simple fix

  1. Drop existing rankings_view
  2. Drop level and xp columns from profiles table  
  3. Recreate rankings_view without level/xp (based on existing structure)
*/

-- Step 1: Drop existing rankings_view
DROP VIEW IF EXISTS rankings_view CASCADE;

-- Step 2: Drop level and xp columns from profiles table
ALTER TABLE profiles 
DROP COLUMN IF EXISTS level CASCADE,
DROP COLUMN IF EXISTS xp CASCADE;

-- Step 3: Recreate rankings_view without level and xp
-- Based on the existing structure you provided
CREATE VIEW rankings_view AS
SELECT 
  p.id as user_id,
  p.username,
  p.avatar_url,
  0 as season_points,  -- Default to 0 for now
  0 as battles_won,    -- Default to 0 for now  
  0 as battles_lost,   -- Default to 0 for now
  ROW_NUMBER() OVER (ORDER BY p.username) as position
FROM profiles p
ORDER BY p.username; 