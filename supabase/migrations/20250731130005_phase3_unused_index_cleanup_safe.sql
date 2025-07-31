-- フェーズ3: ステップ6 - 未使用インデックス削除（安全性重視）
-- 作成日: 2025-07-31
-- 対象: 明らかに未使用のインデックスのみ削除

-- battle_votes テーブルの未使用インデックス削除
DROP INDEX IF EXISTS public.idx_battle_votes_comment;

-- notifications テーブルの未使用インデックス削除
DROP INDEX IF EXISTS public.idx_notifications_created_at;
DROP INDEX IF EXISTS public.idx_notifications_is_read;

-- profiles テーブルの未使用インデックス削除
DROP INDEX IF EXISTS public.idx_profiles_has_seen_onboarding;
DROP INDEX IF EXISTS public.idx_profiles_phone_number;
DROP INDEX IF EXISTS public.idx_profiles_phone_verified;

-- site_news テーブルの未使用インデックス削除
DROP INDEX IF EXISTS public.idx_site_news_content_type;
DROP INDEX IF EXISTS public.idx_site_news_featured;
DROP INDEX IF EXISTS public.idx_site_news_published;

-- security_audit_log テーブルの未使用インデックス削除
DROP INDEX IF EXISTS public.idx_security_audit_log_event_type;

-- phone_verifications テーブルの未使用インデックス削除
DROP INDEX IF EXISTS public.idx_phone_verifications_verified_at;

-- rewards テーブルの未使用インデックス削除
DROP INDEX IF EXISTS public.idx_rewards_is_active;
DROP INDEX IF EXISTS public.idx_rewards_type;

-- コメント: 明らかに未使用で安全に削除可能なインデックスのみ削除
-- 注意: 本番環境では使用状況を再確認してから実行してください
