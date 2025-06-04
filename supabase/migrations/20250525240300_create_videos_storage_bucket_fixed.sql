/*
  # Create videos storage bucket (Fixed)

  1. Create videos bucket
  2. Set up proper RLS policies for video uploads
  
  Note: RLS is already enabled on storage.objects by default in Supabase
*/

-- Create the videos bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Videos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view all videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own videos" ON storage.objects;

-- Create policies for the videos bucket
-- Public read access to all videos
CREATE POLICY "Videos are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'videos');

-- Authenticated users can upload videos to their own folder
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own video metadata
CREATE POLICY "Users can update their own videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own videos
CREATE POLICY "Users can delete their own videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
); 