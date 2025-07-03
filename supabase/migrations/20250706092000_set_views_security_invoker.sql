-- 20250706092000_set_views_security_invoker.sql
-- すべての SECURITY DEFINER ビューを SECURITY INVOKER に変更

ALTER VIEW public.rankings_view              SET (security_invoker = true);
ALTER VIEW public.season_rankings_view       SET (security_invoker = true);
ALTER VIEW public.voter_rankings_view        SET (security_invoker = true);
ALTER VIEW public.season_voter_rankings_view SET (security_invoker = true);
ALTER VIEW public.public_active_battles      SET (security_invoker = true);
ALTER VIEW public.public_archived_battles    SET (security_invoker = true);
ALTER VIEW public.community_rankings_view    SET (security_invoker = true);
ALTER VIEW public.global_community_rankings_view SET (security_invoker = true);
ALTER VIEW public.user_communities_view      SET (security_invoker = true); 