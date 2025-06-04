/*
  # Add level column to profiles table

  1. Changes to `profiles` table
    - Add `level` (integer, default 1)
    - Add index for performance

  2. Update existing data
    - Set default level to 1 for all existing users
*/

-- Add level column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1 NOT NULL;

-- Add index for level queries
CREATE INDEX IF NOT EXISTS idx_profiles_level ON public.profiles(level);

-- Update existing profiles to have level 1
UPDATE public.profiles SET level = 1 WHERE level IS NULL; 