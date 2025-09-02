-- Add score_sheet columns to battle_votes and archived_battle_votes
BEGIN;

ALTER TABLE public.battle_votes
  ADD COLUMN IF NOT EXISTS score_sheet jsonb;

COMMENT ON COLUMN public.battle_votes.score_sheet IS 'Optional score sheet JSON: {skills:{A:int,B:int}, musicality:{A:int,B:int}, originality:{A:int,B:int}}';

ALTER TABLE public.archived_battle_votes
  ADD COLUMN IF NOT EXISTS score_sheet jsonb;

COMMENT ON COLUMN public.archived_battle_votes.score_sheet IS 'Optional score sheet JSON copied from battle_votes at archive time.';

COMMIT;
