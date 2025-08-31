-- Migration: Set English description for the Beta Rate Season 3rd Place badge
-- Context: Adds description_en for reward id a6857b21-7369-4918-bdc2-881d73c4041d
-- Safe to re-run: idempotent via same value assignment

BEGIN;

UPDATE public.rewards
SET description_en = 'Awarded for finishing 3rd place in the Beta Rate Season.',
    updated_at = NOW()
WHERE id = 'a6857b21-7369-4918-bdc2-881d73c4041d';

COMMIT;
