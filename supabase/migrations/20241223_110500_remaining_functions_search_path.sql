-- 残りの関数に対するsearch_path設定
-- 2025-01-31: end_current_seasonとスキップした関数の設定

-- 管理・認証系関数
ALTER FUNCTION public.admin_force_release_email_v2(text) SET search_path = 'public', 'auth';
ALTER FUNCTION public.setup_custom_email_templates() SET search_path = 'public', 'auth';

-- ユーザー・アカウント管理系関数  
ALTER FUNCTION public.sync_user_community() SET search_path = 'public', 'auth';
ALTER FUNCTION public.get_user_current_community(uuid) SET search_path = 'public', 'auth';

-- シーズン・ランキング系関数
ALTER FUNCTION public.end_current_season() SET search_path = 'public', 'auth';

-- コミュニティ系関数
ALTER FUNCTION public.create_community(text, text, text) SET search_path = 'public', 'auth';
ALTER FUNCTION public.delete_community(uuid) SET search_path = 'public', 'auth';
ALTER FUNCTION public.join_community(uuid, text) SET search_path = 'public', 'auth';
ALTER FUNCTION public.leave_community(uuid) SET search_path = 'public', 'auth';
ALTER FUNCTION public.kick_member_from_community(uuid, uuid) SET search_path = 'public', 'auth';
ALTER FUNCTION public.update_member_role(uuid, uuid, community_role) SET search_path = 'public', 'auth';
ALTER FUNCTION public.update_community_stats(uuid) SET search_path = 'public', 'auth';
ALTER FUNCTION public.update_community_stats_trigger() SET search_path = 'public', 'auth';

-- ユーティリティ・支援系関数
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public', 'auth';
ALTER FUNCTION public.get_rank_from_rating(integer) SET search_path = 'public', 'auth';
ALTER FUNCTION public.get_rank_color_from_rating(integer) SET search_path = 'public', 'auth';
ALTER FUNCTION public.get_original_email_hint(uuid) SET search_path = 'public', 'auth';

-- 追加のシーズン・ランキング系関数
ALTER FUNCTION public.get_user_season_voter_rank(uuid) SET search_path = 'public', 'auth';
