/*
  # Simplify foreign key relationships to resolve ambiguity

  1. Remove conflicting foreign key constraints
  2. Keep only essential relationships
  3. Let Supabase use the default relationships
*/

-- Step 1: Remove all explicit foreign key constraints that may cause conflicts
ALTER TABLE public.active_battles
DROP CONSTRAINT IF EXISTS fk_player1_submission,
DROP CONSTRAINT IF EXISTS fk_player2_submission;

ALTER TABLE public.submissions
DROP CONSTRAINT IF EXISTS fk_submission_user;

-- Step 2: Let the default foreign key constraints (created automatically) handle relationships
-- The table definitions already have REFERENCES clauses which create implicit foreign keys

-- Step 3: No need to recreate explicit foreign keys - implicit ones should work fine for Supabase
-- This will resolve the "more than one relationship found" error 