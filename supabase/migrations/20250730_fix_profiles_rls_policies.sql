-- profilesテーブルのRLS設定を本番環境に統一（セキュリティ強化）
-- 実行日: 2025-07-30
-- 対象: profiles テーブル

-- 1. publicロールの電話番号関連ポリシーを削除（セキュリティリスク解消）
-- 未認証ユーザーが電話番号にアクセスできる脆弱性を修正
DROP POLICY "Users can read own phone number" ON public.profiles;
DROP POLICY "Users can update own phone number" ON public.profiles;

-- 2. authenticatedロールの電話番号ポリシーを追加（より安全）  
-- 認証済みユーザーのみが自分の電話番号を操作可能
CREATE POLICY "Enable phone read for owner"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Enable phone update for owner"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. 不要なフレーム更新ポリシーを削除（機能統合）
-- 他のUPDATEポリシーに統合される機能
DROP POLICY "Users can update own equipped frame" ON public.profiles;
