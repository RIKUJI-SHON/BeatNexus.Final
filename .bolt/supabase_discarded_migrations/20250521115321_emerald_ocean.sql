/*
  # Add post likes tracking

  1. Changes
    - Add liked_by column to posts table to track who has liked each post
    - Add unique constraint to prevent multiple likes from same user
*/

ALTER TABLE posts
ADD COLUMN liked_by uuid[] DEFAULT '{}';

-- Create a unique index to prevent duplicate likes
CREATE UNIQUE INDEX posts_liked_by_user_idx ON posts ((liked_by @> ARRAY[auth.uid()]));

-- Update the "Users can like posts" policy
CREATE POLICY "Users can like posts"
ON posts
FOR UPDATE
TO authenticated
USING (
  NOT (liked_by @> ARRAY[auth.uid()]) -- Only allow if user hasn't liked yet
)
WITH CHECK (
  NOT (liked_by @> ARRAY[auth.uid()]) -- Prevent duplicate likes
);