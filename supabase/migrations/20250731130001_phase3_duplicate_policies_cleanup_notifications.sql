-- フェーズ3: ステップ2 - 重複ポリシー統合（notifications）
-- 作成日: 2025-07-31
-- 対象: notifications テーブルの重複ポリシー統合

-- 古いポリシーを削除
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;

-- 最適化されたポリシーのみを保持（既にフェーズ2で作成済み）
-- notifications_select_optimized
-- notifications_insert_optimized
-- notifications_update_optimized
-- notifications_delete_optimized

-- コメント: 重複ポリシーを削除してパフォーマンスを向上
