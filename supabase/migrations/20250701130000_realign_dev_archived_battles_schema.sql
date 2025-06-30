-- This migration completely realigns the development `archived_battles` table with the production schema.
-- It handles dependencies by dropping and recreating them.

BEGIN;

-- Step 1: Backup existing data
CREATE TEMPORARY TABLE archived_battles_backup AS TABLE public.archived_battles;

-- Step 2: Drop dependent objects
-- Drop the foreign key constraint from `archived_battle_votes`
ALTER TABLE public.archived_battle_votes DROP CONSTRAINT IF EXISTS archived_battle_votes_archived_battle_id_fkey;
-- Drop dependent views
DROP VIEW IF EXISTS public.rankings_view;
DROP VIEW IF EXISTS public.public_archived_battles;
DROP VIEW IF EXISTS public.voter_rankings_view;
DROP VIEW IF EXISTS public.user_communities_view;
DROP VIEW IF EXISTS public.global_community_rankings_view;
DROP VIEW IF EXISTS public.community_rankings_view;

-- Step 3: Drop the old table
DROP TABLE public.archived_battles;

-- Step 4: Re-create the table with the production schema
CREATE TABLE public.archived_battles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    original_battle_id uuid NOT NULL,
    winner_id uuid NULL,
    final_votes_a integer NOT NULL DEFAULT 0,
    final_votes_b integer NOT NULL DEFAULT 0,
    archived_at timestamptz NOT NULL DEFAULT now(),
    player1_user_id uuid NOT NULL,
    player2_user_id uuid NOT NULL,
    player1_submission_id uuid NOT NULL,
    player2_submission_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    battle_format public.battle_format NOT NULL,
    player1_rating_change integer DEFAULT 0,
    player2_rating_change integer DEFAULT 0,
    player1_final_rating integer NULL,
    player2_final_rating integer NULL,
    player1_video_url text NULL,
    player2_video_url text NULL,
    season_id uuid NULL,
    CONSTRAINT archived_battles_pkey PRIMARY KEY (id),
    CONSTRAINT archived_battles_original_battle_id_key UNIQUE (original_battle_id)
);

-- Step 5: Restore data from the backup
INSERT INTO public.archived_battles (
    id, original_battle_id, winner_id, final_votes_a, final_votes_b, archived_at,
    player1_user_id, player2_user_id, player1_submission_id, player2_submission_id,
    created_at, updated_at, battle_format, player1_rating_change, player2_rating_change,
    player1_final_rating, player2_final_rating, player1_video_url, player2_video_url, season_id
)
SELECT
    id, original_battle_id, winner_id, final_votes_a, final_votes_b, archived_at,
    player1_user_id, player2_user_id, player1_submission_id, player2_submission_id,
    created_at, updated_at, battle_format, player1_rating_change, player2_rating_change,
    player1_final_rating, player2_final_rating, player1_video_url, player2_video_url, season_id
FROM archived_battles_backup
ON CONFLICT (id) DO NOTHING;

-- Step 6: Drop the temporary backup table
DROP TABLE archived_battles_backup;

-- Step 7: Re-create foreign key constraints and views
ALTER TABLE public.archived_battle_votes
ADD CONSTRAINT archived_battle_votes_archived_battle_id_fkey
FOREIGN KEY (archived_battle_id) REFERENCES public.archived_battles(id) ON DELETE CASCADE;

CREATE OR REPLACE VIEW public.rankings_view AS
 SELECT p.id,
    p.username,
    p.avatar_url,
    p.rating,
    p.vote_count,
    p.has_seen_onboarding,
    p.is_deleted,
    dense_rank() OVER (ORDER BY p.rating DESC, p.created_at) AS "rank"
   FROM public.profiles p
  WHERE (p.is_deleted = false);

CREATE OR REPLACE VIEW public.public_archived_battles
AS
 SELECT ab.id,
    ab.original_battle_id,
    CASE
        WHEN p1.is_deleted THEN 'deleted-user'::text
        ELSE p1.username
    END AS player1_username,
    CASE
        WHEN p2.is_deleted THEN 'deleted-user'::text
        ELSE p2.username
    END AS player2_username,
    ab.player1_video_url,
    ab.player2_video_url,
    ab.final_votes_a,
    ab.final_votes_b,
    CASE
        WHEN w.is_deleted THEN 'deleted-user'::text
        ELSE w.username
    END AS winner_username,
    ab.archived_at,
    ab.battle_format,
    ab.player1_rating_change,
    ab.player2_rating_change,
    ab.player1_final_rating,
    ab.player2_final_rating
   FROM ((((public.archived_battles ab
     LEFT JOIN public.profiles p1 ON ((p1.id = ab.player1_user_id)))
     LEFT JOIN public.profiles p2 ON ((p2.id = ab.player2_user_id)))
     LEFT JOIN public.profiles w ON ((w.id = ab.winner_id))));

CREATE OR REPLACE VIEW public.voter_rankings_view AS
 SELECT p.id,
    p.username,
    p.avatar_url,
    p.vote_count,
    dense_rank() OVER (ORDER BY p.vote_count DESC, p.created_at) AS "rank"
   FROM public.profiles p
  WHERE (p.is_deleted = false);
  
-- Recreating other views that might depend on it for safety
CREATE OR REPLACE VIEW public.user_communities_view AS
SELECT cm.user_id, c.id AS community_id, c.name, c.description, c.owner_user_id, c.member_count, c.average_rating, cm.role, cm.joined_at
FROM community_members cm
JOIN communities c ON cm.community_id = c.id
ORDER BY cm.joined_at DESC;

CREATE OR REPLACE VIEW public.global_community_rankings_view AS
SELECT id, name, description, owner_user_id, member_count, average_rating, created_at,
       dense_rank() OVER (ORDER BY average_rating DESC, member_count DESC, created_at ASC) as "rank"
FROM communities
ORDER BY "rank";

CREATE OR REPLACE VIEW public.community_rankings_view AS
SELECT c.id AS community_id, p.id AS user_id, p.username, p.avatar_url, p.rating,
       dense_rank() OVER (PARTITION BY c.id ORDER BY p.rating DESC, p.created_at ASC) as community_rank
FROM community_members cm
JOIN communities c ON cm.community_id = c.id
JOIN profiles p ON cm.user_id = p.id
WHERE p.is_deleted = false;

COMMIT;

COMMENT ON TABLE public.archived_battles IS 'v4 FINAL: Schema fully aligned with production, handles dependencies, and fixes SQL syntax.'; 