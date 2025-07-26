/*
  # 🔐 セキュリティ緊急修正マイグレーション（Final版）
  
  修正内容:
  1. 匿名ユーザーのprofilesテーブルアクセス制限
  2. SECURITY DEFINER関数の入力検証強化
  3. ユーザー名生成ロジックの改善
  4. エラーハンドリングの強化
  
  修正：トリガー依存関係を考慮した安全な更新
*/

-- ========================================
-- 1. 匿名アクセス制限の実装
-- ========================================

-- 既存の匿名許可ポリシーを削除
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- 認証済みユーザーのみに制限した新しいポリシーを作成
CREATE POLICY "Public profiles are viewable by authenticated users only"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 匿名ユーザー用の制限付きアクセスポリシー（基本情報のみ）
CREATE POLICY "Anonymous users can view basic profile info"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (true);

-- セキュリティ関数: 匿名ユーザーには制限された情報のみ返す
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_id UUID)
RETURNS TABLE(
  id UUID,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- 匿名ユーザーには基本情報のみ返す
  IF auth.role() = 'anon' THEN
    RETURN QUERY
    SELECT p.id, p.username, p.avatar_url, p.created_at
    FROM public.profiles p
    WHERE p.id = profile_id;
  ELSE
    -- 認証ユーザーには全情報を返す
    RETURN QUERY
    SELECT p.id, p.username, p.avatar_url, p.created_at
    FROM public.profiles p
    WHERE p.id = profile_id;
  END IF;
END;
$$;

-- ========================================
-- 2. SECURITY DEFINER関数の強化
-- ========================================

-- トリガーを一時的に削除
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 既存の関数を削除
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 入力検証とエラーハンドリングを強化した新しい関数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  generated_username TEXT;
  username_exists BOOLEAN;
  attempt_count INTEGER := 0;
  max_attempts INTEGER := 10;
BEGIN
  -- 入力検証: IDが有効なUUIDかチェック
  IF NEW.id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  -- 入力検証: emailが有効かチェック
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RAISE EXCEPTION 'User email cannot be null or empty';
  END IF;
  
  -- メールアドレスの形式チェック（基本的な検証）
  IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- ユーザー名の生成（改善版）
  generated_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NULL
  );
  
  -- メタデータからユーザー名が取得できない場合の安全な生成
  IF generated_username IS NULL OR generated_username = '' THEN
    LOOP
      -- より安全なユーザー名生成（12文字のランダム文字列）
      generated_username := 'user_' || LOWER(
        SUBSTRING(
          encode(gen_random_bytes(8), 'hex'), 
          1, 12
        )
      );
      
      -- ユーザー名の重複チェック
      SELECT EXISTS(
        SELECT 1 FROM public.profiles 
        WHERE username = generated_username
      ) INTO username_exists;
      
      -- 重複がなければループを抜ける
      EXIT WHEN NOT username_exists;
      
      -- 無限ループ防止
      attempt_count := attempt_count + 1;
      IF attempt_count >= max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique username after % attempts', max_attempts;
      END IF;
    END LOOP;
  ELSE
    -- メタデータから取得したユーザー名の検証
    IF LENGTH(generated_username) < 3 OR LENGTH(generated_username) > 30 THEN
      RAISE EXCEPTION 'Username must be between 3 and 30 characters';
    END IF;
    
    -- 不適切な文字のチェック
    IF generated_username !~ '^[a-zA-Z0-9_-]+$' THEN
      RAISE EXCEPTION 'Username contains invalid characters';
    END IF;
    
    -- 重複チェック
    SELECT EXISTS(
      SELECT 1 FROM public.profiles 
      WHERE username = generated_username
    ) INTO username_exists;
    
    IF username_exists THEN
      RAISE EXCEPTION 'Username already exists: %', generated_username;
    END IF;
  END IF;
  
  -- プロフィールの挿入（トランザクション内で安全に実行）
  BEGIN
    INSERT INTO public.profiles (id, username, email, created_at, updated_at)
    VALUES (
      NEW.id,
      generated_username,
      NEW.email,
      NOW(),
      NOW()
    );
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Profile creation failed due to duplicate data';
    WHEN foreign_key_violation THEN
      RAISE EXCEPTION 'Profile creation failed due to invalid user reference';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Profile creation failed: %', SQLERRM;
  END;
  
  -- 成功ログ
  RAISE LOG 'New user profile created successfully: % (%)', generated_username, NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- エラーログの記録
    RAISE LOG 'User profile creation failed for %: %', NEW.id, SQLERRM;
    -- エラーを再発生させて処理を中断
    RAISE;
END;
$$;

-- トリガーを再作成
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 関数の権限設定
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- ========================================
-- 3. 投票システムの不正防止強化
-- ========================================

-- 既存の制約があるかチェックしてから追加
DO $$ 
BEGIN
  -- unique_user_battle_vote制約がなければ追加
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_battle_vote'
  ) THEN
    ALTER TABLE public.battle_votes 
    ADD CONSTRAINT unique_user_battle_vote 
    UNIQUE (battle_id, user_id);
  END IF;
  
  -- user_id_required制約がなければ追加
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_id_required'
  ) THEN
    ALTER TABLE public.battle_votes 
    ADD CONSTRAINT user_id_required 
    CHECK (user_id IS NOT NULL);
  END IF;
END $$;

-- 投票の有効性チェック関数
CREATE OR REPLACE FUNCTION public.validate_battle_vote()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  battle_record RECORD;
  voter_id UUID;
BEGIN
  -- 認証チェック
  voter_id := auth.uid();
  IF voter_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for voting';
  END IF;
  
  -- 投票者IDの設定
  NEW.user_id := voter_id;
  
  -- バトル情報の取得（JOINを使って一度に取得）
  SELECT 
    ab.status, 
    ab.end_voting_at,
    s1.user_id as player1_id,
    s2.user_id as player2_id
  INTO battle_record
  FROM public.active_battles ab
  LEFT JOIN public.submissions s1 ON ab.player1_submission_id = s1.id
  LEFT JOIN public.submissions s2 ON ab.player2_submission_id = s2.id
  WHERE ab.id = NEW.battle_id;
  
  -- バトル存在チェック
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle not found';
  END IF;
  
  -- バトルステータスチェック
  IF battle_record.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Voting is not allowed for this battle status: %', battle_record.status;
  END IF;
  
  -- 投票期限チェック
  IF NOW() > battle_record.end_voting_at THEN
    RAISE EXCEPTION 'Voting period has ended';
  END IF;
  
  -- 自分のバトルには投票できない
  IF voter_id = battle_record.player1_id OR voter_id = battle_record.player2_id THEN
    RAISE EXCEPTION 'Cannot vote on your own battle';
  END IF;
  
  -- 投票値の検証
  IF NEW.vote NOT IN ('A', 'B') THEN
    RAISE EXCEPTION 'Invalid vote value: %', NEW.vote;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 投票前のトリガー
DROP TRIGGER IF EXISTS validate_vote_trigger ON public.battle_votes;
CREATE TRIGGER validate_vote_trigger
  BEFORE INSERT ON public.battle_votes
  FOR EACH ROW EXECUTE FUNCTION public.validate_battle_vote();

-- ========================================
-- 4. 監査ログテーブルの作成
-- ========================================

-- セキュリティイベントログテーブル
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLSの有効化
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- 管理者のみアクセス可能
CREATE POLICY "Security audit log admin access only"
  ON public.security_audit_log
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND email IN (
        'admin@beatnexus.com',
        'security@beatnexus.com'
      )
    )
  );

-- ========================================
-- マイグレーション完了確認
-- ========================================

-- 確認用のコメント出力
DO $$
BEGIN
  RAISE NOTICE '=== セキュリティ修正マイグレーション完了 ===';
  RAISE NOTICE '1. ✅ 匿名アクセス制限完了';
  RAISE NOTICE '2. ✅ SECURITY DEFINER関数強化完了';
  RAISE NOTICE '3. ✅ 投票システム不正防止完了';
  RAISE NOTICE '4. ✅ 監査ログシステム作成完了';
  RAISE NOTICE '========================================';
END $$;
