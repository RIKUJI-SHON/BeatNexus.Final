-- RLS Performance Optimization: Notifications Table
-- RLSパフォーマンス最適化：notificationsテーブル

-- 既存の重複・非効率ポリシーを削除
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;

-- 最適化された統合ポリシーを作成
-- SELECT: サブクエリ使用でauth.uid()再評価を防止
CREATE POLICY "notifications_select_optimized" ON notifications
FOR SELECT USING (user_id = (SELECT auth.uid()));

-- INSERT: サブクエリ使用でauth.uid()再評価を防止
CREATE POLICY "notifications_insert_optimized" ON notifications
FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- UPDATE: サブクエリ使用でauth.uid()再評価を防止  
CREATE POLICY "notifications_update_optimized" ON notifications
FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- DELETE: サブクエリ使用でauth.uid()再評価を防止
CREATE POLICY "notifications_delete_optimized" ON notifications
FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ポリシーにコメント追加
COMMENT ON POLICY "notifications_select_optimized" ON notifications IS 
'Optimized RLS policy using subquery to prevent auth.uid() re-evaluation per row';

COMMENT ON POLICY "notifications_insert_optimized" ON notifications IS 
'Optimized RLS policy using subquery to prevent auth.uid() re-evaluation per row';

COMMENT ON POLICY "notifications_update_optimized" ON notifications IS 
'Optimized RLS policy using subquery to prevent auth.uid() re-evaluation per row';

COMMENT ON POLICY "notifications_delete_optimized" ON notifications IS 
'Optimized RLS policy using subquery to prevent auth.uid() re-evaluation per row';

-- パフォーマンス最適化ログ
INSERT INTO audit_logs (action, table_name, details, created_at)
VALUES ('RLS_OPTIMIZATION', 'notifications', 'Consolidated and optimized RLS policies to prevent auth.uid() re-evaluation', NOW());
