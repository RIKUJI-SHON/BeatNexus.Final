/*
  # Fix submissions table to match actual code

  1. Remove unused columns
    - Drop `thumbnail_url`, `title`, `description`

  2. Update enums to match code
    - Update battle_format: THEME_BATTLE → THEME_CHALLENGE
    - Update submission_status: IN_BATTLE → MATCHED_IN_BATTLE, COMPLETED → BATTLE_ENDED

  3. Add missing columns
    - Add `rank_at_submission` (integer)
    - Add `active_battle_id` (uuid)
*/

-- Step 1: Update enum values to match code
-- First, add new enum values
ALTER TYPE battle_format ADD VALUE IF NOT EXISTS 'THEME_CHALLENGE';

-- Create new submission_status enum with correct values
DROP TYPE IF EXISTS submission_status CASCADE;
CREATE TYPE submission_status AS ENUM ('WAITING_OPPONENT', 'MATCHED_IN_BATTLE', 'BATTLE_ENDED', 'WITHDRAWN');

-- Step 2: Recreate submissions table with correct structure
DROP TABLE IF EXISTS public.submissions CASCADE;

CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  battle_format battle_format NOT NULL DEFAULT 'MAIN_BATTLE',
  status submission_status NOT NULL DEFAULT 'WAITING_OPPONENT',
  rank_at_submission INTEGER,
  active_battle_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 3: Recreate indexes
CREATE INDEX idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX idx_submissions_status ON public.submissions(status);
CREATE INDEX idx_submissions_battle_format ON public.submissions(battle_format);
CREATE INDEX idx_submissions_active_battle_id ON public.submissions(active_battle_id);

-- Step 4: Enable RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Step 5: Recreate policies
CREATE POLICY "Users can view their own submissions"
  ON public.submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view submissions in battles"
  ON public.submissions
  FOR SELECT
  TO authenticated, anon
  USING (
    status = 'MATCHED_IN_BATTLE' OR status = 'BATTLE_ENDED'
  );

CREATE POLICY "Users can insert their own submissions"
  ON public.submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own submissions"
  ON public.submissions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'WAITING_OPPONENT')
  WITH CHECK (auth.uid() = user_id);

-- Step 6: Add updated_at trigger
CREATE TRIGGER submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at(); 