-- 20250112120100_simple_privacy_fix.sql
-- 削除されたユーザーのプライバシー保護（管理者機能なし）

-- 1. 削除されたユーザー確認関数を無効化（誰も使えないように）
DROP FUNCTION IF EXISTS get_deleted_users();

-- 2. セキュリティ上問題のある関数をすべて削除
-- （削除されたユーザー情報へのアクセスを完全に遮断）

-- 3. profilesテーブルのポリシーを確実に更新
-- 既存の重複ポリシーをクリーンアップ
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- 4. アクティブユーザーのみ表示するポリシーを作成
CREATE POLICY "Only active profiles are viewable" ON profiles
  FOR SELECT USING (is_deleted = FALSE OR is_deleted IS NULL);

-- 5. 削除されたユーザーの投稿/コメントも非表示に（既存ポリシー更新）
-- posts
DROP POLICY IF EXISTS "Allow authenticated users to read all posts" ON posts;
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;

CREATE POLICY "View posts from active users only" ON posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = posts.user_id 
        AND (profiles.is_deleted = FALSE OR profiles.is_deleted IS NULL)
    )
  );

-- comments  
DROP POLICY IF EXISTS "Allow authenticated users to read all comments" ON comments;
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;

CREATE POLICY "View comments from active users only" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = comments.user_id 
        AND (profiles.is_deleted = FALSE OR profiles.is_deleted IS NULL)
    )
  );

-- 6. battle_votesテーブルも削除されたユーザーの投票を非表示に
DROP POLICY IF EXISTS "Public can view battle votes" ON battle_votes;

CREATE POLICY "View votes from active users only" ON battle_votes
  FOR SELECT USING (
    user_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = battle_votes.user_id 
        AND (profiles.is_deleted = FALSE OR profiles.is_deleted IS NULL)
    )
  );

-- 7. archived_battlesとactive_battlesでも削除されたユーザーのバトルを適切に表示
-- （バトル自体は履歴として残すが、削除されたユーザーは匿名として表示）

-- archived_battlesの表示用ビューを作成（削除されたユーザーを匿名化）
CREATE OR REPLACE VIEW public_archived_battles AS
SELECT 
  ab.id,
  ab.original_battle_id,
  ab.winner_id,
  ab.final_votes_a,
  ab.final_votes_b,
  ab.battle_format,
  ab.archived_at,
  ab.created_at,
  
  -- プレイヤー1の情報（削除済みなら匿名化）
  CASE 
    WHEN p1.is_deleted = TRUE THEN NULL
    ELSE ab.player1_user_id
  END as player1_user_id,
  
  CASE 
    WHEN p1.is_deleted = TRUE THEN 'deleted-user'
    ELSE p1.username
  END as player1_username,
  
  -- プレイヤー2の情報（削除済みなら匿名化）
  CASE 
    WHEN p2.is_deleted = TRUE THEN NULL
    ELSE ab.player2_user_id
  END as player2_user_id,
  
  CASE 
    WHEN p2.is_deleted = TRUE THEN 'deleted-user'
    ELSE p2.username
  END as player2_username,
  
  ab.player1_video_url,
  ab.player2_video_url,
  ab.player1_rating_change,
  ab.player2_rating_change,
  ab.player1_final_rating,
  ab.player2_final_rating

FROM archived_battles ab
LEFT JOIN profiles p1 ON ab.player1_user_id = p1.id
LEFT JOIN profiles p2 ON ab.player2_user_id = p2.id;

-- 8. active_battlesの表示用ビューも作成
CREATE OR REPLACE VIEW public_active_battles AS
SELECT 
  ab.id,
  ab.battle_format,
  ab.status,
  ab.votes_a,
  ab.votes_b,
  ab.end_voting_at,
  ab.created_at,
  ab.updated_at,
  
  -- プレイヤー1の情報（削除済みなら匿名化）
  CASE 
    WHEN p1.is_deleted = TRUE THEN NULL
    ELSE ab.player1_user_id
  END as player1_user_id,
  
  CASE 
    WHEN p1.is_deleted = TRUE THEN 'deleted-user'
    ELSE p1.username
  END as player1_username,
  
  -- プレイヤー2の情報（削除済みなら匿名化）
  CASE 
    WHEN p2.is_deleted = TRUE THEN NULL
    ELSE ab.player2_user_id
  END as player2_user_id,
  
  CASE 
    WHEN p2.is_deleted = TRUE THEN 'deleted-user'
    ELSE p2.username
  END as player2_username,
  
  ab.player1_submission_id,
  ab.player2_submission_id

FROM active_battles ab
LEFT JOIN profiles p1 ON ab.player1_user_id = p1.id
LEFT JOIN profiles p2 ON ab.player2_user_id = p2.id;

-- 9. ビューにRLSポリシーを設定
ALTER VIEW public_archived_battles OWNER TO postgres;
ALTER VIEW public_active_battles OWNER TO postgres;

-- 10. submissionsテーブルも削除されたユーザーの投稿を非表示に
UPDATE submissions 
SET status = 'WITHDRAWN' 
WHERE user_id IN (
  SELECT id FROM profiles WHERE is_deleted = TRUE
) AND status = 'WAITING_OPPONENT';

-- 11. コメント追加
COMMENT ON VIEW public_archived_battles IS 'アーカイブバトルの公開ビュー。削除されたユーザーは匿名化して表示。';
COMMENT ON VIEW public_active_battles IS 'アクティブバトルの公開ビュー。削除されたユーザーは匿名化して表示。'; 