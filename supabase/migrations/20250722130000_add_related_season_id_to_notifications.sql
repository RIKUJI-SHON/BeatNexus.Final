-- Migration: Add related_season_id column to notifications table for season start notifications
-- Created: 2025-07-22

-- Add related_season_id column to notifications table
ALTER TABLE notifications 
ADD COLUMN related_season_id uuid REFERENCES seasons(id) ON DELETE CASCADE;
