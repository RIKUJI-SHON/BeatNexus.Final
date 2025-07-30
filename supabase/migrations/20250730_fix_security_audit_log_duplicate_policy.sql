-- security_audit_logテーブルの重複ポリシーを削除
-- 実行日: 2025-07-30
-- 対象: security_audit_log テーブル

-- 重複ポリシーの削除
-- 同じ内容のポリシーが2つ存在し、保守性に問題があるため古い方を削除
DROP POLICY "Service role only access" ON public.security_audit_log;

-- "Service role can manage security audit logs" を残す
-- service_roleのみがすべての操作を実行可能
