/*
  # Create videos storage bucket

  1. New Storage Bucket
    - Create a new bucket named 'videos' for storing battle videos
    - Set up RLS policies for video uploads and access

  2. Security
    - Enable RLS on the bucket
    - Add policies for:
      - Public read access to all videos
      - Authenticated users can upload videos
*/

-- Create the videos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true);

-- Set up RLS policies for the videos bucket
CREATE POLICY "Videos are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'videos');

CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos' AND
  (LOWER(file_ext) = '.mp4' OR LOWER(file_ext) = '.mov' OR LOWER(file_ext) = '.webm') AND
  octet_length(file_size) < 104857600 -- 100MB limit
);