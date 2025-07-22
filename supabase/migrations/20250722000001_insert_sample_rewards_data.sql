-- Insert realistic sample rewards data for testing Collection Page
-- Created: 2025-07-22

-- First, delete existing sample data that may not have proper image URLs
DELETE FROM user_rewards;
DELETE FROM rewards;

-- Insert realistic rewards with proper image URLs for testing
INSERT INTO rewards (name, description, type, rarity, image_url, rank_requirement, is_active) VALUES
  -- Legendary Badges
  ('Ultimate Champion', 'For achieving the highest rank', 'badge', 'legendary', '/images/rewards/ultimate-champion-badge.png', 1, true),
  ('Beat Master', 'Master of rhythm and timing', 'badge', 'legendary', '/images/rewards/beat-master-badge.png', null, true),
  
  -- Epic Badges  
  ('Top Performer', 'Consistent high performance', 'badge', 'epic', '/images/rewards/top-performer-badge.png', 2, true),
  ('Rhythm King', 'Exceptional rhythm skills', 'badge', 'epic', '/images/rewards/rhythm-king-badge.png', null, true),
  
  -- Rare Badges
  ('Rising Star', 'Promising newcomer', 'badge', 'rare', '/images/rewards/rising-star-badge.png', 3, true),
  ('Beat Warrior', 'Dedicated battle participant', 'badge', 'rare', '/images/rewards/beat-warrior-badge.png', null, true),
  
  -- Common Badges
  ('First Battle', 'Completed your first battle', 'badge', 'common', '/images/rewards/first-battle-badge.png', null, true),
  ('Participant', 'Active community member', 'badge', 'common', '/images/rewards/participant-badge.png', null, true),
  
  -- Legendary Frames
  ('Golden Crown Frame', 'Ultimate winner frame', 'frame', 'legendary', '/images/rewards/golden-crown-frame.png', 1, true),
  ('Diamond Frame', 'Premium legendary frame', 'frame', 'legendary', '/images/rewards/diamond-frame.png', null, true),
  
  -- Epic Frames
  ('Silver Crown Frame', 'Elite competitor frame', 'frame', 'epic', '/images/rewards/silver-crown-frame.png', 2, true),
  ('Platinum Frame', 'High-tier achievement frame', 'frame', 'epic', '/images/rewards/platinum-frame.png', null, true),
  
  -- Rare Frames
  ('Bronze Crown Frame', 'Solid achievement frame', 'frame', 'rare', '/images/rewards/bronze-crown-frame.png', 3, true),
  ('Neon Frame', 'Stylish rare frame', 'frame', 'rare', '/images/rewards/neon-frame.png', null, true),
  
  -- Common Frames
  ('Starter Frame', 'Basic achievement frame', 'frame', 'common', '/images/rewards/starter-frame.png', null, true),
  ('Classic Frame', 'Simple and clean frame', 'frame', 'common', '/images/rewards/classic-frame.png', null, true);

-- Comment on the data
COMMENT ON TABLE rewards IS 'Sample rewards data for testing the Collection Page functionality';
