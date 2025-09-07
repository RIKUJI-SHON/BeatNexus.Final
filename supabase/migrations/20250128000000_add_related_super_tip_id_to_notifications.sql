-- Add related_super_tip_id column to notifications table
-- This enables notifications for Super Tips recipients

ALTER TABLE notifications 
ADD COLUMN related_super_tip_id UUID REFERENCES super_tips(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_related_super_tip_id 
ON notifications(related_super_tip_id);

-- Update notifications type constraint to include 'super_tip_received'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type::text = ANY (ARRAY[
  'info'::text, 
  'success'::text, 
  'warning'::text, 
  'battle_matched'::text, 
  'battle_win'::text, 
  'battle_lose'::text, 
  'battle_draw'::text, 
  'season_start'::text, 
  'news_article'::text, 
  'season_end'::text, 
  'reward_earned'::text,
  'super_tip_received'::text
]));
