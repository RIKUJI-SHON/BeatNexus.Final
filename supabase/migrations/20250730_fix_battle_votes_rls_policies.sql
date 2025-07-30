-- battle_votesテーブルのRLS設定を開発環境に統一
-- 実行日: 2025-07-30
-- 対象: battle_votes テーブル

-- 1. より安全なINSERT権限に修正
-- user_id = auth.uid() をチェックして、ユーザーが自分以外の名前で投票することを防ぐ
DROP POLICY "Authenticated users can vote" ON public.battle_votes;
CREATE POLICY "Authenticated users can vote"
ON public.battle_votes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. SELECT権限のポリシー名とロール設定を開発環境に統一
-- anon, authenticated 両方のロールに明示的に権限付与
DROP POLICY "View votes from active users only" ON public.battle_votes;
CREATE POLICY "Public view votes (non-deleted users)"
ON public.battle_votes
FOR SELECT
TO anon, authenticated
USING ((user_id IS NULL) OR (EXISTS (SELECT 1 FROM profiles p WHERE p.id = battle_votes.user_id AND (p.is_deleted = false OR p.is_deleted IS NULL))));
