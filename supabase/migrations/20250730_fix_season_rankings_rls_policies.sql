-- 本番環境に不足しているRLSポリシーを追加
-- 実行日: 2025-07-30
-- 対象: season_rankings, season_voter_rankings, seasons テーブル

-- season_rankings テーブルのINSERTポリシー追加
CREATE POLICY "season_rankings_insert_policy"
ON public.season_rankings
FOR INSERT
TO authenticated
WITH CHECK (false);

-- season_rankings テーブルのpublic読み取りポリシー追加
CREATE POLICY "Season rankings are viewable by everyone"
ON public.season_rankings
FOR SELECT
TO public
USING (true);

-- season_voter_rankings テーブルのINSERTポリシー追加
CREATE POLICY "season_voter_rankings_insert_policy"
ON public.season_voter_rankings
FOR INSERT
TO authenticated
WITH CHECK (false);

-- season_voter_rankings テーブルのpublic読み取りポリシー追加
CREATE POLICY "Season voter rankings are viewable by everyone"
ON public.season_voter_rankings
FOR SELECT
TO public
USING (true);

-- seasons テーブルの管理者ポリシー追加
CREATE POLICY "seasons_insert_policy"
ON public.seasons
FOR INSERT
TO authenticated
WITH CHECK ((auth.jwt() ->> 'email'::text) = 'admin@beatnexus.com'::text);

CREATE POLICY "seasons_update_policy"
ON public.seasons
FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'email'::text) = 'admin@beatnexus.com'::text);
