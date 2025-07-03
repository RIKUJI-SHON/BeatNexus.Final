-- 20250706090000_enable_rls_and_policies_on_battle_tables.sql
-- 開発環境: battle 関連テーブルで RLS を有効化し、安全なポリシーを追加
-- 本番環境では既にポリシーが存在するため、ENABLE だけを後で実行する

-- 1. active_battles -------------------------------------------------------
ALTER TABLE public.active_battles ENABLE ROW LEVEL SECURITY;

-- 公開閲覧（アクティブバトル一覧表示用）
CREATE POLICY "Public can view active battles"
  ON public.active_battles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Edge Function / サーバーロールによる挿入（認証必須）
CREATE POLICY "System can insert battles"
  ON public.active_battles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Edge Function / サーバーロールによる更新
CREATE POLICY "System can update battles"
  ON public.active_battles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. archived_battles -----------------------------------------------------
ALTER TABLE public.archived_battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view archived battles"
  ON public.archived_battles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "System can insert archived battles"
  ON public.archived_battles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update archived battles"
  ON public.archived_battles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH_CHECK (true);

-- 3. battle_votes ---------------------------------------------------------
ALTER TABLE public.battle_votes ENABLE ROW LEVEL SECURITY;

-- 投票（INSERT）: 本人のみ
CREATE POLICY "Authenticated users can vote"
  ON public.battle_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 投票更新: 本人のみ
CREATE POLICY "Users can update their own votes"
  ON public.battle_votes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 投票削除: 本人のみ
CREATE POLICY "Users can delete their own votes"
  ON public.battle_votes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 公開閲覧: 削除ユーザーは除外（簡略版）
CREATE POLICY "Public view votes (non-deleted users)"
  ON public.battle_votes
  FOR SELECT
  TO anon, authenticated
  USING (
    user_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = battle_votes.user_id
        AND (p.is_deleted = false OR p.is_deleted IS NULL)
    )
  );

-- 4. submissions ----------------------------------------------------------
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 公開閲覧: 対戦中／終了済みのみ
CREATE POLICY "Public can view submissions in battles"
  ON public.submissions
  FOR SELECT
  TO anon, authenticated
  USING (
    status IN ('MATCHED_IN_BATTLE', 'BATTLE_ENDED')
  );

-- ユーザー自身のデータ挿入
CREATE POLICY "Users can insert their own submissions"
  ON public.submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 待機中のみ更新可能
CREATE POLICY "Users can update their own submissions"
  ON public.submissions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'WAITING_OPPONENT')
  WITH CHECK (auth.uid() = user_id);

-- ユーザー自身は常に閲覧可能
CREATE POLICY "Users can view their own submissions"
  ON public.submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. community_chat_messages (Advisor 警告回避用に残すが RLS 無効のまま)
-- ※意図的に RLS 無効化したままにする場合は、Advisor の警告を許容
--   または ENABLE + 最低限のポリシーを追加した上で Realtime セキュリティを調整してください

-- このマイグレーションは開発環境で先に適用し、動作確認後に本番環境では
-- ENABLE ROW LEVEL SECURITY だけを実行する計画とする。 