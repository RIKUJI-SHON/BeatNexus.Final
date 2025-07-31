-- フェーズ3: ステップ4 - RLS認証最適化（profiles, battle_votes）
-- 作成日: 2025-07-31
-- 対象: profiles, battle_votes テーブル

-- profiles テーブルのRLS最適化
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "profiles_insert_optimized" ON public.profiles
FOR INSERT WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "profiles_update_optimized" ON public.profiles
FOR UPDATE USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Enable phone read for owner" ON public.profiles;
CREATE POLICY "profiles_phone_read_optimized" ON public.profiles
FOR SELECT USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Enable phone update for owner" ON public.profiles;
CREATE POLICY "profiles_phone_update_optimized" ON public.profiles
FOR UPDATE USING (id = (SELECT auth.uid()));

-- battle_votes テーブルのRLS最適化
DROP POLICY IF EXISTS "Users can delete their own votes" ON public.battle_votes;
CREATE POLICY "battle_votes_delete_optimized" ON public.battle_votes
FOR DELETE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own votes" ON public.battle_votes;
CREATE POLICY "battle_votes_update_optimized" ON public.battle_votes
FOR UPDATE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can vote" ON public.battle_votes;
CREATE POLICY "battle_votes_insert_optimized" ON public.battle_votes
FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- コメント: auth.uid()を(SELECT auth.uid())に変更して再評価を防止
