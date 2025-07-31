-- フェーズ3: ステップ3 - RLS認証最適化（主要テーブル）
-- 作成日: 2025-07-31
-- 対象: comments, posts, profiles, battle_votes テーブル

-- comments テーブルのRLS最適化
DROP POLICY IF EXISTS "Allow users to delete their own comments" ON public.comments;
CREATE POLICY "comments_delete_optimized" ON public.comments
FOR DELETE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Allow users to insert their own comments" ON public.comments;
CREATE POLICY "comments_insert_optimized" ON public.comments
FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Allow users to update their own comments" ON public.comments;
CREATE POLICY "comments_update_optimized" ON public.comments
FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- posts テーブルのRLS最適化
DROP POLICY IF EXISTS "Allow users to delete their own posts" ON public.posts;
CREATE POLICY "posts_delete_optimized" ON public.posts
FOR DELETE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Allow users to insert their own posts" ON public.posts;
CREATE POLICY "posts_insert_optimized" ON public.posts
FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Allow users to update their own posts" ON public.posts;
CREATE POLICY "posts_update_optimized" ON public.posts
FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- コメント: auth.uid()を(SELECT auth.uid())に変更して再評価を防止
