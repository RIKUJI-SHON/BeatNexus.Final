-- フェーズ3: ステップ5 - 関数セキュリティ強化（高優先度）
-- 作成日: 2025-07-31
-- 対象: 高優先度関数のsearch_path設定

-- 🔧 解決済みシグネチャによるsearch_path設定
-- 注意: 正確なシグネチャを特定して個別に実行

-- 1. 主要投稿・投票関数
-- ✅ 正しいシグネチャに修正済み (現在アクティブな関数)
ALTER FUNCTION public.submit_video(text, public.battle_format) SET search_path = public, auth;
ALTER FUNCTION public.vote_battle(uuid, char(1)) SET search_path = public, auth;

-- 2. 監査・レート制限関数（電話認証システム用）
ALTER FUNCTION public.log_audit_event(text, text, uuid, jsonb, boolean, text) SET search_path = public, auth;
ALTER FUNCTION public.check_rate_limit(text) SET search_path = public, auth;

-- 3. バトル・シーズン関数
ALTER FUNCTION public.find_match_and_create_battle(uuid) SET search_path = public, auth;
ALTER FUNCTION public.complete_battle_with_season_update(uuid, uuid) SET search_path = public, auth;

-- 4. プロフィール関数
ALTER FUNCTION public.get_public_profile(uuid) SET search_path = public, auth;

-- 🔍 追加セキュリティ検証
-- 設定の確認クエリ（実行後に確認用）
/*
SELECT 
    proname AS function_name,
    proconfig AS search_path_settings
FROM pg_proc 
WHERE proname IN (
    'submit_video', 'vote_battle', 'log_audit_event', 
    'check_rate_limit', 'find_match_and_create_battle',
    'complete_battle_with_season_update', 'get_public_profile'
) AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
*/

-- 📝 実装完了ログ
INSERT INTO public.security_audit_log (
    category,
    severity, 
    title,
    description,
    metadata,
    created_at
) VALUES (
    'FUNCTION_SECURITY',
    'HIGH',
    'Phase 3: Function search_path Security Enhancement',
    'Applied search_path settings to 7 high-priority functions for SQL injection prevention',
    jsonb_build_object(
        'functions_secured', ARRAY[
            'submit_video(text,battle_format)', 'vote_battle', 'log_audit_event',
            'check_rate_limit', 'find_match_and_create_battle', 
            'complete_battle_with_season_update', 'get_public_profile'
        ],
        'search_path_setting', 'public, auth',
        'phase', 3,
        'step', 5
    ),
    NOW()
);
