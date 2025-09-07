-- Add 'super_tip_received' to the notifications type check constraint
-- This enables Super Tips notifications to be created

-- First, drop the existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the new constraint with super_tip_received included
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
