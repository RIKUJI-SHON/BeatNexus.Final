-- create_community関数を1コミュニティ制限システム対応に修正

CREATE OR REPLACE FUNCTION create_community(
  p_name text,
  p_description text,
  p_password text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_community_id uuid;
  v_password_hash text;
  v_user_rating integer;
  v_existing_community_id uuid;
BEGIN
  -- 現在のユーザーを取得
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;

  -- ユーザーのレーティングを取得
  SELECT rating INTO v_user_rating FROM profiles WHERE id = v_user_id;

  -- パスワードのハッシュ化
  IF p_password IS NOT NULL AND p_password != '' THEN
    v_password_hash := crypt(p_password, gen_salt('bf'));
  END IF;

  -- 既存のコミュニティから退出（1コミュニティ制限）
  SELECT current_community_id INTO v_existing_community_id 
  FROM profiles WHERE id = v_user_id;
  
  IF v_existing_community_id IS NOT NULL THEN
    -- 既存コミュニティから退出
    DELETE FROM community_members 
    WHERE user_id = v_user_id AND community_id = v_existing_community_id;
    
    -- 既存コミュニティの統計を更新
    PERFORM update_community_stats(v_existing_community_id);
  END IF;

  -- 新しいコミュニティを作成
  INSERT INTO communities (name, description, owner_user_id, password_hash, average_rating)
  VALUES (p_name, p_description, v_user_id, v_password_hash, v_user_rating)
  RETURNING id INTO v_community_id;

  -- オーナーをメンバーとして追加
  INSERT INTO community_members (community_id, user_id, role)
  VALUES (v_community_id, v_user_id, 'owner')
  ON CONFLICT (user_id) DO UPDATE SET 
    community_id = v_community_id,
    role = 'owner',
    joined_at = now();

  -- 新しいコミュニティの統計を更新
  PERFORM update_community_stats(v_community_id);

  RETURN json_build_object(
    'success', true,
    'community_id', v_community_id,
    'message', 'Community created successfully'
  );
EXCEPTION
  WHEN unique_violation THEN
    -- コミュニティ名の重複チェック
    IF SQLERRM LIKE '%communities_name_key%' THEN
      RETURN json_build_object('success', false, 'message', 'Community name already exists');
    ELSE
      RETURN json_build_object('success', false, 'message', 'Duplicate entry error');
    END IF;
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 