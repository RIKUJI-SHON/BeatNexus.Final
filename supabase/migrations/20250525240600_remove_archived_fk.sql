-- Remove foreign key on archived_battles.original_battle_id to prevent cascade delete
ALTER TABLE public.archived_battles
DROP CONSTRAINT IF EXISTS archived_battles_original_battle_id_fkey; 