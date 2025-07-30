-- postsテーブルのRLS設定を本番環境に統一（開発環境の重複・冗長ポリシー整理）
-- 実行日: 2025-07-30
-- 対象: posts テーブル

-- 1. 重複・冗長なSELECTポリシーを削除
-- 削除ユーザーのデータが表示される脆弱性を解消
DROP POLICY "Anyone can read posts" ON public.posts;
DROP POLICY "Anyone can view posts" ON public.posts;

-- 2. 削除ユーザー制限付きSELECTポリシーを追加
-- 論理削除されたユーザーの投稿を非表示にする
CREATE POLICY "View posts from active users only"
ON public.posts
FOR SELECT
TO public
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = posts.user_id AND (profiles.is_deleted = false OR profiles.is_deleted IS NULL)));

-- 3. 重複DELETEポリシーを削除
DROP POLICY "Users can delete their own posts" ON public.posts;
-- "Allow users to delete their own posts" を残す

-- 4. 重複INSERTポリシーを削除
DROP POLICY "Authenticated users can create posts" ON public.posts;
-- "Allow users to insert their own posts" を残す

-- 5. 危険・冗長なUPDATEポリシーを削除
-- "Users can like or unlike posts" - 任意のユーザーが任意の投稿を更新できる危険なポリシー
-- "Users can update their own posts" (public role版) - 冗長なポリシー
DROP POLICY "Users can like or unlike posts" ON public.posts;
DROP POLICY "Users can update their own posts" ON public.posts;
-- "Allow users to update their own posts" を残す
