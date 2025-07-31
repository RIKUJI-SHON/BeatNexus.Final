-- フェーズ2: RLS認証最適化マイグレーション
-- 実行日: 2025-07-31
-- 対象: notificationsテーブルの重複ポリシー統合と認証関数最適化

-- Step 1: 重複ポリシーを削除（古いポリシーを削除）
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

-- Step 2: 最適化されたポリシーを作成（auth.uid()の再評価を防ぐ）
CREATE POLICY "notifications_select_optimized" ON public.notifications
FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "notifications_insert_optimized" ON public.notifications
FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "notifications_update_optimized" ON public.notifications
FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "notifications_delete_optimized" ON public.notifications
FOR DELETE USING (user_id = (SELECT auth.uid()));

-- Step 3: 古い命名規則のポリシーは保持（アプリケーションとの互換性）
-- notifications_select_own, notifications_insert_own, notifications_update_own, notifications_delete_own
-- これらは既存のアプリケーションが依存している可能性があるため保持

-- RLS最適化完了
-- SELECT auth.uid() を使用してauth関数の再評価を防止
-- パフォーマンス向上を実現
