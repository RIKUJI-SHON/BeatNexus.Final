-- ========================================
-- 修正版: Submission System SQL
-- SupabaseダッシュボードのSQL Editorで実行してください
-- ========================================

-- submissions テーブルを作成
CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  video_url text NOT NULL,
  battle_format text NOT NULL CHECK (battle_format IN ('MAIN_BATTLE', 'MINI_BATTLE', 'THEME_CHALLENGE')),
  status text NOT NULL DEFAULT 'WAITING_OPPONENT' 
    CHECK (status IN ('WAITING_OPPONENT', 'MATCHED_IN_BATTLE', 'BATTLE_ENDED', 'WITHDRAWN')),
  rank_at_submission integer,
  active_battle_id uuid
);

-- インデックスを作成
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_submissions_user_id') THEN
    CREATE INDEX idx_submissions_user_id ON submissions(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_submissions_battle_format') THEN
    CREATE INDEX idx_submissions_battle_format ON submissions(battle_format);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_submissions_status') THEN
    CREATE INDEX idx_submissions_status ON submissions(status);
  END IF;
END $$;

-- RLS を有効化
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can insert their own submissions" ON submissions;
DROP POLICY IF EXISTS "Users can view their own submissions" ON submissions;
DROP POLICY IF EXISTS "Public can view matched submissions" ON submissions;
DROP POLICY IF EXISTS "Users can update their waiting submissions" ON submissions;

-- ポリシーを作成
CREATE POLICY "Users can insert their own submissions"
  ON submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own submissions"
  ON submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view matched submissions"
  ON submissions
  FOR SELECT
  TO authenticated
  USING (status IN ('MATCHED_IN_BATTLE', 'BATTLE_ENDED'));

CREATE POLICY "Users can update their waiting submissions"
  ON submissions
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id AND 
    status = 'WAITING_OPPONENT'
  )
  WITH CHECK (
    auth.uid() = user_id AND 
    status = 'WAITING_OPPONENT'
  );

-- find_match 関数を作成
CREATE OR REPLACE FUNCTION find_match(submission_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission submissions;
  v_match submissions;
BEGIN
  -- Get submission details
  SELECT * INTO v_submission
  FROM submissions
  WHERE id = submission_id
  AND status = 'WAITING_OPPONENT';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Find potential match
  SELECT * INTO v_match
  FROM submissions
  WHERE status = 'WAITING_OPPONENT'
  AND battle_format = v_submission.battle_format
  AND user_id != v_submission.user_id
  AND (
    v_submission.rank_at_submission IS NULL
    OR rank_at_submission IS NULL
    OR ABS(rank_at_submission - v_submission.rank_at_submission) <= 300
  )
  ORDER BY created_at ASC
  LIMIT 1;

  RETURN v_match.id;
END;
$$;

-- create_battle 関数を更新（submission対応版）
CREATE OR REPLACE FUNCTION create_battle(submission1_id uuid, submission2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_battle_id uuid;
  sub1 submissions;
  sub2 submissions;
BEGIN
  -- Get submission details
  SELECT * INTO sub1 FROM submissions WHERE id = submission1_id;
  SELECT * INTO sub2 FROM submissions WHERE id = submission2_id;

  IF sub1.id IS NULL OR sub2.id IS NULL THEN
    RAISE EXCEPTION 'Submissions not found';
  END IF;

  -- Create new battle with 5-minute voting period
  INSERT INTO active_battles (
    battle_format,
    player1_submission_id,
    player1_user_id,
    player2_submission_id,
    player2_user_id,
    status,
    voting_ends_at
  ) VALUES (
    sub1.battle_format,
    submission1_id,
    sub1.user_id,
    submission2_id,
    sub2.user_id,
    'VOTING_OPEN',
    NOW() + INTERVAL '5 minutes'  -- 5 minutes for testing
  ) RETURNING id INTO new_battle_id;

  -- Update submissions status
  UPDATE submissions
  SET 
    status = 'MATCHED_IN_BATTLE',
    active_battle_id = new_battle_id
  WHERE id IN (submission1_id, submission2_id);

  RETURN new_battle_id;
END;
$$;

-- 動作確認用クエリ（最後に実行して確認）
SELECT 'Setup completed successfully!' as message;
SELECT routine_name FROM information_schema.routines WHERE routine_name IN ('find_match', 'create_battle', 'process_expired_battles'); 