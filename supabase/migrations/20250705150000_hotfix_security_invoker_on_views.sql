-- 20250705150000_hotfix_security_invoker_on_views.sql
-- SECURITY DEFINERになっているビューを段階的にSECURITY INVOKERに修正します。

-- 先に適用済みの rankings_view も含めて、すべてのビューを修正します。
ALTER VIEW public.rankings_view SET (security_invoker = true);
ALTER VIEW public.voter_rankings_view SET (security_invoker = true);
ALTER VIEW public.community_rankings_view SET (security_invoker = true);
ALTER VIEW public.global_community_rankings_view SET (security_invoker = true);
ALTER VIEW public.user_communities_view SET (security_invoker = true);
ALTER VIEW public.public_archived_battles SET (security_invoker = true);
ALTER VIEW public.public_active_battles SET (security_invoker = true);
-- season_voter_rankings_view もアドバイザで指摘されていたので追加
ALTER VIEW public.season_voter_rankings_view SET (security_invoker = true);
ALTER VIEW public.season_rankings_view SET (security_invoker = true);


COMMENT ON VIEW public.rankings_view IS 'SECURITY INVOKER: 削除されたユーザーを除外したレーティングベースランキング。';
COMMENT ON VIEW public.voter_rankings_view IS 'SECURITY INVOKER: 削除されたユーザーを除外した投票数ベースランキング。';
COMMENT ON VIEW public.community_rankings_view IS 'SECURITY INVOKER: コミュニティ内のメンバーランキング。';
COMMENT ON VIEW public.global_community_rankings_view IS 'SECURITY INVOKER: 全コミュニティのランキング。';
COMMENT ON VIEW public.user_communities_view IS 'SECURITY INVOKER: ユーザーが参加しているコミュニティ一覧。';
COMMENT ON VIEW public.public_archived_battles IS 'SECURITY INVOKER: アーカイブバトルの公開ビュー。削除されたユーザーは匿名化。';
COMMENT ON VIEW public.public_active_battles IS 'SECURITY INVOKER: アクティブバトルの公開ビュー。削除されたユーザーは匿名化。';
COMMENT ON VIEW public.season_voter_rankings_view IS 'SECURITY INVOKER: シーズン投票者ランキングビュー。';
COMMENT ON VIEW public.season_rankings_view IS 'SECURITY INVOKER: シーズンランキングビュー。'; 