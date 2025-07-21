-- Migration: Add season_start type to notifications type constraint
-- Created: 2025-07-22

-- Drop existing constraint
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;

-- Add new constraint with season_start type
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type::text = ANY (ARRAY[
  ('info'::character varying)::text,
  ('success'::character varying)::text,
  ('warning'::character varying)::text,
  ('battle_matched'::character varying)::text,
  ('battle_win'::character varying)::text,
  ('battle_lose'::character varying)::text,
  ('battle_draw'::character varying)::text,
  ('season_start'::character varying)::text
]));
