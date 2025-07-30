-- 開発環境にseasonsテーブルのanon読み取りポリシーを追加
-- 実行日: 2025-07-30
-- 対象: seasons テーブル

CREATE POLICY "seasons_select_policy_anon"
ON public.seasons
FOR SELECT
TO anon
USING (true);
