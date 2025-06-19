-- ユーザーが1つのコミュニティにのみ所属できるように制限

-- 1. profilesテーブルにcurrent_community_idカラムを追加
ALTER TABLE profiles 
ADD COLUMN current_community_id uuid REFERENCES communities(id) ON DELETE SET NULL;

-- 2. community_membersテーブルにユニーク制約を追加（1ユーザー = 1コミュニティ）
ALTER TABLE community_members 
ADD CONSTRAINT unique_user_community UNIQUE (user_id);

-- 3. プロフィール更新時にcurrent_community_idを同期する関数
CREATE OR REPLACE FUNCTION sync_user_community()
RETURNS TRIGGER AS $$
BEGIN
  -- メンバー追加時
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles 
    SET current_community_id = NEW.community_id 
    WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;
  
  -- メンバー削除時
  IF TG_OP = 'DELETE' THEN
    UPDATE profiles 
    SET current_community_id = NULL 
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. トリガーを設定
DROP TRIGGER IF EXISTS sync_user_community_trigger ON community_members;
CREATE TRIGGER sync_user_community_trigger
  AFTER INSERT OR DELETE ON community_members
  FOR EACH ROW EXECUTE FUNCTION sync_user_community();

-- 5. 既存データの整合性を確認（重複削除）
-- 同じユーザーが複数コミュニティに参加している場合、最新のもの以外削除
DELETE FROM community_members 
WHERE (user_id, joined_at) NOT IN (
  SELECT user_id, MAX(joined_at) 
  FROM community_members 
  GROUP BY user_id
);

-- 6. 新しいコミュニティ関数を更新

-- join_community関数を更新（既存コミュニティから退出）
CREATE OR REPLACE FUNCTION join_community(p_community_id uuid, p_password text DEFAULT NULL)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_community communities%ROWTYPE;
  v_existing_community_id uuid;
  v_result json;
BEGIN
  -- 現在のユーザーを取得
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;

  -- コミュニティ情報を取得
  SELECT * INTO v_community FROM communities WHERE id = p_community_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Community not found');
  END IF;

  -- パスワード確認（プライベートコミュニティの場合）
  IF v_community.password_hash IS NOT NULL THEN
    IF p_password IS NULL OR crypt(p_password, v_community.password_hash) != v_community.password_hash THEN
      RETURN json_build_object('success', false, 'message', 'Invalid password');
    END IF;
  END IF;

  -- 既存のコミュニティから退出
  SELECT current_community_id INTO v_existing_community_id 
  FROM profiles WHERE id = v_user_id;
  
  IF v_existing_community_id IS NOT NULL THEN
    -- 既存コミュニティから退出
    DELETE FROM community_members 
    WHERE user_id = v_user_id AND community_id = v_existing_community_id;
    
    -- 既存コミュニティの統計を更新
    PERFORM update_community_stats(v_existing_community_id);
  END IF;

  -- 新しいコミュニティに参加
  INSERT INTO community_members (community_id, user_id, role)
  VALUES (p_community_id, v_user_id, 'member')
  ON CONFLICT (user_id) DO UPDATE SET 
    community_id = p_community_id,
    joined_at = now();

  -- 新しいコミュニティの統計を更新
  PERFORM update_community_stats(p_community_id);

  RETURN json_build_object(
    'success', true, 
    'message', 'Successfully joined community',
    'community_id', p_community_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. ユーザーの現在のコミュニティを取得する関数
CREATE OR REPLACE FUNCTION get_user_current_community(p_user_id uuid DEFAULT NULL)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_community_data json;
BEGIN
  -- ユーザーIDを確定
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;

  -- 現在のコミュニティ情報を取得
  SELECT json_build_object(
    'id', c.id,
    'name', c.name,
    'description', c.description,
    'member_count', c.member_count,
    'average_rating', c.average_rating,
    'created_at', c.created_at,
    'user_role', cm.role
  ) INTO v_community_data
  FROM communities c
  JOIN community_members cm ON c.id = cm.community_id
  WHERE cm.user_id = v_user_id;

  IF v_community_data IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User is not in any community');
  END IF;

  RETURN json_build_object('success', true, 'community', v_community_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 