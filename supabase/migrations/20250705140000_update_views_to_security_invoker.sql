-- 20250705140000_update_views_to_security_invoker.sql
-- セキュリティ強化のため、SECURITY DEFINERで作成されていた、またはその可能性があったビューを
-- すべてSECURITY INVOKERに変更します。これにより、ビューは常に実行ユーザーの権限で動作するようになります。

-- 1. レーティングランキングビュー
CREATE OR REPLACE VIEW public.rankings_view
SECURITY INVOKER
AS
WITH battle_stats AS (
  SELECT
    winner_id AS user_id,
    COUNT(*) AS battles_won
  FROM archived_battles
  WHERE winner_id IS NOT NULL
  GROUP BY winner_id

  UNION ALL

  SELECT
    player1_user_id AS user_id,
    0 AS battles_won
  FROM archived_battles
  WHERE winner_id != player1_user_id OR winner_id IS NULL

  UNION ALL

  SELECT
    player2_user_id AS user_id,
    0 AS battles_won
  FROM archived_battles
  WHERE winner_id != player2_user_id OR winner_id IS NULL
),
aggregated_stats AS (
  SELECT
    user_id,
    SUM(battles_won) AS battles_won,
    COUNT(*)::numeric - SUM(battles_won) AS battles_lost
  FROM battle_stats
  GROUP BY user_id
)
SELECT
  p.id AS user_id,
  p.username,
  p.avatar_url,
  p.rating,
  p.rating AS season_points,
  get_rank_from_rating(p.rating) AS rank_name,
  get_rank_color_from_rating(p.rating) AS rank_color,
  COALESCE(s.battles_won, 0)::numeric AS battles_won,
  COALESCE(s.battles_lost, 0)::numeric AS battles_lost,
  CASE
    WHEN (COALESCE(s.battles_won, 0) + COALESCE(s.battles_lost, 0)) > 0
    THEN ROUND((COALESCE(s.battles_won, 0)::numeric / (COALESCE(s.battles_won, 0) + COALESCE(s.battles_lost, 0))) * 100, 1)
    ELSE 0
  END AS win_rate,
  ROW_NUMBER() OVER (ORDER BY p.rating DESC) AS position
FROM profiles p
LEFT JOIN aggregated_stats s ON p.id = s.user_id
WHERE p.is_deleted IS NOT TRUE
ORDER BY p.rating DESC;

-- 2. 投票者ランキングビュー
CREATE OR REPLACE VIEW public.voter_rankings_view
SECURITY INVOKER
AS
SELECT
  p.id AS user_id,
  p.username,
  p.avatar_url,
  p.vote_count,
  p.rating,
  get_rank_from_rating(p.rating) AS rank_name,
  get_rank_color_from_rating(p.rating) AS rank_color,
  p.created_at,
  p.updated_at,
  ROW_NUMBER() OVER (ORDER BY p.vote_count DESC, p.username) AS position
FROM profiles p
WHERE p.vote_count > 0
  AND p.is_deleted IS NOT TRUE
ORDER BY p.vote_count DESC, p.username;


-- 3. コミュニティ内ランキングビュー
CREATE OR REPLACE VIEW public.community_rankings_view
SECURITY INVOKER
AS
WITH member_rankings AS (
  SELECT
    cm.community_id,
    cm.user_id,
    cm.role,
    cm.joined_at,
    p.username,
    p.avatar_url,
    p.rating,
    RANK() OVER (PARTITION BY cm.community_id ORDER BY p.rating DESC) as rank_in_community
  FROM public.community_members cm
  JOIN public.profiles p ON cm.user_id = p.id
  WHERE p.is_deleted = false
)
SELECT * FROM member_rankings
ORDER BY community_id, rank_in_community;


-- 4. グローバルコミュニティランキングビュー
CREATE OR REPLACE VIEW public.global_community_rankings_view
SECURITY INVOKER
AS
SELECT
  c.id,
  c.name,
  c.description,
  c.owner_user_id,
  c.member_count,
  c.average_rating,
  c.created_at,
  p.username as owner_username,
  p.avatar_url as owner_avatar_url,
  RANK() OVER (ORDER BY c.average_rating DESC, c.member_count DESC) as global_rank
FROM public.communities c
JOIN public.profiles p ON c.owner_user_id = p.id
WHERE p.is_deleted = false
ORDER BY global_rank;


-- 5. ユーザー参加コミュニティ一覧ビュー
CREATE OR REPLACE VIEW public.user_communities_view
SECURITY INVOKER
AS
SELECT
  cm.user_id,
  cm.community_id,
  cm.role,
  cm.joined_at,
  c.name as community_name,
  c.description as community_description,
  c.member_count,
  c.average_rating,
  (
    SELECT rank_in_community
    FROM community_rankings_view crv
    WHERE crv.community_id = cm.community_id
    AND crv.user_id = cm.user_id
  ) as user_rank_in_community
FROM public.community_members cm
JOIN public.communities c ON cm.community_id = c.id;


-- 6. アーカイブバトル公開ビュー
CREATE OR REPLACE VIEW public.public_archived_battles
SECURITY INVOKER
AS
SELECT
  ab.id,
  ab.original_battle_id,
  ab.winner_id,
  ab.final_votes_a,
  ab.final_votes_b,
  ab.battle_format,
  ab.archived_at,
  ab.created_at,

  CASE
    WHEN p1.is_deleted = TRUE THEN NULL
    ELSE ab.player1_user_id
  END as player1_user_id,

  CASE
    WHEN p1.is_deleted = TRUE THEN 'deleted-user'
    ELSE p1.username
  END as player1_username,

  CASE
    WHEN p2.is_deleted = TRUE THEN NULL
    ELSE ab.player2_user_id
  END as player2_user_id,

  CASE
    WHEN p2.is_deleted = TRUE THEN 'deleted-user'
    ELSE p2.username
  END as player2_username,

  ab.player1_video_url,
  ab.player2_video_url,
  ab.player1_rating_change,
  ab.player2_rating_change,
  ab.player1_final_rating,
  ab.player2_final_rating

FROM archived_battles ab
LEFT JOIN profiles p1 ON ab.player1_user_id = p1.id
LEFT JOIN profiles p2 ON ab.player2_user_id = p2.id;


-- 7. アクティブバトル公開ビュー
CREATE OR REPLACE VIEW public.public_active_battles
SECURITY INVOKER
AS
SELECT
  ab.id,
  ab.battle_format,
  ab.status,
  ab.votes_a,
  ab.votes_b,
  ab.end_voting_at,
  ab.created_at,
  ab.updated_at,

  CASE
    WHEN p1.is_deleted = TRUE THEN NULL
    ELSE ab.player1_user_id
  END as player1_user_id,

  CASE
    WHEN p1.is_deleted = TRUE THEN 'deleted-user'
    ELSE p1.username
  END as player1_username,

  CASE
    WHEN p2.is_deleted = TRUE THEN NULL
    ELSE ab.player2_user_id
  END as player2_user_id,

  CASE
    WHEN p2.is_deleted = TRUE THEN 'deleted-user'
    ELSE p2.username
  END as player2_username,

  ab.player1_submission_id,
  ab.player2_submission_id

FROM active_battles ab
LEFT JOIN profiles p1 ON ab.player1_user_id = p1.id
LEFT JOIN profiles p2 ON ab.player2_user_id = p2.id;

COMMENT ON VIEW public.rankings_view IS 'SECURITY INVOKER: 削除されたユーザーを除外したレーティングベースランキング。';
COMMENT ON VIEW public.voter_rankings_view IS 'SECURITY INVOKER: 削除されたユーザーを除外した投票数ベースランキング。';
COMMENT ON VIEW public.community_rankings_view IS 'SECURITY INVOKER: コミュニティ内のメンバーランキング。';
COMMENT ON VIEW public.global_community_rankings_view IS 'SECURITY INVOKER: 全コミュニティのランキング。';
COMMENT ON VIEW public.user_communities_view IS 'SECURITY INVOKER: ユーザーが参加しているコミュニティ一覧。';
COMMENT ON VIEW public.public_archived_battles IS 'SECURITY INVOKER: アーカイブバトルの公開ビュー。削除されたユーザーは匿名化。';
COMMENT ON VIEW public.public_active_battles IS 'SECURITY INVOKER: アクティブバトルの公開ビュー。削除されたユーザーは匿名化。'; 