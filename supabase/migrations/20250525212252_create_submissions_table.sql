/*
  # Create submissions table for BeatNexus

  1. New table `submissions`
    - `id` (uuid, primary key)
    - `user_id` (references profiles.id)
    - `video_url` (video file URL from Supabase Storage)
    - `thumbnail_url` (video thumbnail)
    - `title` (submission title)
    - `description` (optional description)
    - `battle_format` (MAIN_BATTLE, MINI_BATTLE, THEME_BATTLE)
    - `status` (WAITING_OPPONENT, IN_BATTLE, COMPLETED)
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `submissions` table
    - Users can create their own submissions
    - Public can view submissions that are in battles
*/

-- Create battle format enum
CREATE TYPE battle_format AS ENUM ('MAIN_BATTLE', 'MINI_BATTLE', 'THEME_BATTLE');

-- Create submission status enum
CREATE TYPE submission_status AS ENUM ('WAITING_OPPONENT', 'IN_BATTLE', 'COMPLETED');

-- Create submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT NOT NULL,
  description TEXT,
  battle_format battle_format NOT NULL DEFAULT 'MAIN_BATTLE',
  status submission_status NOT NULL DEFAULT 'WAITING_OPPONENT',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Policies for submissions table
-- Users can view their own submissions
CREATE POLICY "Users can view their own submissions"
  ON public.submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Public can view submissions that are part of active battles
CREATE POLICY "Public can view submissions in battles"
  ON public.submissions
  FOR SELECT
  TO authenticated, anon
  USING (
    status = 'IN_BATTLE' OR status = 'COMPLETED'
  );

-- Users can insert their own submissions
CREATE POLICY "Users can insert their own submissions"
  ON public.submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own submissions (but not when in battle)
CREATE POLICY "Users can update their own submissions"
  ON public.submissions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'WAITING_OPPONENT')
  WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create index for better performance
CREATE INDEX idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX idx_submissions_status ON public.submissions(status);
CREATE INDEX idx_submissions_battle_format ON public.submissions(battle_format);
