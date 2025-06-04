/*
  # Add foreign key relationship between posts and profiles

  1. Changes
    - Add foreign key constraint from posts.user_id to profiles.id
    This ensures that posts are properly linked to user profiles
*/

ALTER TABLE posts
ADD CONSTRAINT posts_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE;