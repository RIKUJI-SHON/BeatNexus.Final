-- 20250112120000_fix_user_deletion.sql
-- ユーザー削除問題の修正: ソフト削除機能と安全な削除関数を追加

-- 1. ソフト削除フラグをprofilesテーブルに追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. 削除されたユーザーを除外するためのインデックス（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_profiles_not_deleted 
ON profiles (id) WHERE is_deleted = FALSE;

-- 3. 安全なユーザー削除関数
CREATE OR REPLACE FUNCTION safe_delete_user_account(p_user_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_has_active_battles BOOLEAN := FALSE;
  v_has_archived_battles BOOLEAN := FALSE;
  v_username TEXT;
BEGIN
  -- 現在のユーザー名を取得
  SELECT username INTO v_username FROM profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- アクティブバトルの存在確認
  SELECT EXISTS(
    SELECT 1 FROM active_battles 
    WHERE player1_user_id = p_user_id OR player2_user_id = p_user_id
  ) INTO v_has_active_battles;
  
  -- アーカイブバトルの存在確認
  SELECT EXISTS(
    SELECT 1 FROM archived_battles 
    WHERE player1_user_id = p_user_id OR player2_user_id = p_user_id
  ) INTO v_has_archived_battles;
  
  -- アクティブバトルがある場合、またはアーカイブバトルがある場合はソフト削除
  IF v_has_active_battles OR v_has_archived_battles THEN
    
    -- 進行中のバトルがある場合は強制終了処理
    IF v_has_active_battles THEN
      UPDATE active_battles 
      SET status = 'PROCESSING_RESULTS',
          updated_at = NOW()
      WHERE (player1_user_id = p_user_id OR player2_user_id = p_user_id)
        AND status = 'ACTIVE';
    END IF;
    
    -- プロフィールをソフト削除（匿名化）
    UPDATE profiles 
    SET 
      is_deleted = TRUE,
      deleted_at = NOW(),
      username = 'deleted-user-' || SUBSTRING(id::text, 1, 8),
      email = 'deleted-' || SUBSTRING(id::text, 1, 8) || '@deleted.local',
      avatar_url = NULL,
      bio = 'このアカウントは削除されました',
      updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN json_build_object(
      'success', true, 
      'method', 'soft_delete',
      'reason', CASE 
        WHEN v_has_active_battles THEN 'User has active battles'
        ELSE 'User has battle history'
      END,
      'original_username', v_username
    );
    
  ELSE
    
    -- バトル履歴もない場合は物理削除を試行
    BEGIN
      -- 関連データを安全な順序で削除
      DELETE FROM notifications WHERE user_id = p_user_id;
      DELETE FROM comments WHERE user_id = p_user_id;
      DELETE FROM posts WHERE user_id = p_user_id;
      DELETE FROM battle_votes WHERE user_id = p_user_id;
      DELETE FROM submissions WHERE user_id = p_user_id;
      
      -- プロフィール削除
      DELETE FROM profiles WHERE id = p_user_id;
      
      RETURN json_build_object(
        'success', true, 
        'method', 'physical_delete',
        'reason', 'No battle history found',
        'original_username', v_username
      );
      
    EXCEPTION WHEN foreign_key_violation THEN
      -- 外部キー制約エラーの場合はソフト削除にフォールバック
      UPDATE profiles 
      SET 
        is_deleted = TRUE,
        deleted_at = NOW(),
        username = 'deleted-user-' || SUBSTRING(id::text, 1, 8),
        email = 'deleted-' || SUBSTRING(id::text, 1, 8) || '@deleted.local',
        avatar_url = NULL,
        bio = 'このアカウントは削除されました',
        updated_at = NOW()
      WHERE id = p_user_id;
      
      RETURN json_build_object(
        'success', true, 
        'method', 'soft_delete_fallback',
        'reason', 'Foreign key constraints detected',
        'original_username', v_username
      );
    END;
    
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false, 
    'error', SQLERRM,
    'error_detail', SQLSTATE
  );
END;
$$;

-- 4. RLSポリシーを更新（削除されたユーザーを除外）
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (is_deleted = FALSE OR is_deleted IS NULL);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id AND (is_deleted = FALSE OR is_deleted IS NULL));

-- 5. 削除されたユーザーの投稿/コメントも非表示にするポリシー更新
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
CREATE POLICY "Anyone can view posts" ON posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = posts.user_id 
        AND (profiles.is_deleted = FALSE OR profiles.is_deleted IS NULL)
    )
  );

DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
CREATE POLICY "Anyone can view comments" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = comments.user_id 
        AND (profiles.is_deleted = FALSE OR profiles.is_deleted IS NULL)
    )
  );

-- 6. 管理者用の削除されたユーザー確認関数
CREATE OR REPLACE FUNCTION get_deleted_users()
RETURNS TABLE(
  id UUID,
  original_username TEXT,
  deleted_at TIMESTAMPTZ,
  had_battles BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    CASE 
      WHEN p.username LIKE 'deleted-user-%' THEN 'Unknown'
      ELSE p.username
    END as original_username,
    p.deleted_at,
    EXISTS(
      SELECT 1 FROM archived_battles ab 
      WHERE ab.player1_user_id = p.id OR ab.player2_user_id = p.id
    ) as had_battles
  FROM profiles p
  WHERE p.is_deleted = TRUE
  ORDER BY p.deleted_at DESC;
END;
$$;

-- コメント追加
COMMENT ON FUNCTION safe_delete_user_account(UUID) IS 'バトル履歴を考慮した安全なユーザー削除関数。アクティブバトルや履歴がある場合はソフト削除、ない場合は物理削除を実行。';
COMMENT ON FUNCTION get_deleted_users() IS '削除されたユーザーの一覧を管理者が確認するための関数。';
COMMENT ON COLUMN profiles.is_deleted IS 'ソフト削除フラグ。TRUEの場合、ユーザーは削除済みとして扱われる。';
COMMENT ON COLUMN profiles.deleted_at IS 'ソフト削除された日時。is_deleted=TRUEの場合に設定される。'; 