-- コミュニティ削除とメンバー退出機能を追加

-- 1. コミュニティ削除関数（オーナーのみ）
CREATE OR REPLACE FUNCTION delete_community(p_community_id uuid)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_community communities%ROWTYPE;
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

  -- オーナー権限確認
  IF v_community.owner_user_id != v_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Only the owner can delete this community');
  END IF;

  -- 関連データを削除（CASCADE）
  -- 1. チャットメッセージを削除
  DELETE FROM community_chat_messages WHERE community_id = p_community_id;
  
  -- 2. メンバーを削除（トリガーでprofiles.current_community_idも更新される）
  DELETE FROM community_members WHERE community_id = p_community_id;
  
  -- 3. コミュニティ本体を削除
  DELETE FROM communities WHERE id = p_community_id;

  RETURN json_build_object(
    'success', true, 
    'message', 'Community deleted successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. メンバー退出関数（既存のleave_communityを改良）
CREATE OR REPLACE FUNCTION leave_community(p_community_id uuid)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_community communities%ROWTYPE;
  v_member_role community_role;
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

  -- メンバーの役割を確認
  SELECT role INTO v_member_role 
  FROM community_members 
  WHERE community_id = p_community_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'You are not a member of this community');
  END IF;

  -- オーナーは退出不可（削除のみ）
  IF v_member_role = 'owner' THEN
    RETURN json_build_object('success', false, 'message', 'Owner cannot leave community. Please delete the community or transfer ownership.');
  END IF;

  -- メンバーを削除（トリガーでprofiles.current_community_idも更新される）
  DELETE FROM community_members 
  WHERE community_id = p_community_id AND user_id = v_user_id;

  -- コミュニティ統計を更新
  PERFORM update_community_stats(p_community_id);

  RETURN json_build_object(
    'success', true, 
    'message', 'Successfully left the community'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. オーナー権限譲渡関数（将来的に使用）
CREATE OR REPLACE FUNCTION transfer_ownership(p_community_id uuid, p_new_owner_id uuid)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_community communities%ROWTYPE;
  v_new_owner_member community_members%ROWTYPE;
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

  -- 現在のオーナー権限確認
  IF v_community.owner_user_id != v_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Only the current owner can transfer ownership');
  END IF;

  -- 新しいオーナーがメンバーかどうか確認
  SELECT * INTO v_new_owner_member 
  FROM community_members 
  WHERE community_id = p_community_id AND user_id = p_new_owner_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'New owner must be a member of the community');
  END IF;

  -- オーナー権限を譲渡
  -- 1. コミュニティのオーナーを変更
  UPDATE communities 
  SET owner_user_id = p_new_owner_id 
  WHERE id = p_community_id;

  -- 2. 新しいオーナーの役割を'owner'に変更
  UPDATE community_members 
  SET role = 'owner' 
  WHERE community_id = p_community_id AND user_id = p_new_owner_id;

  -- 3. 前のオーナーの役割を'admin'に変更
  UPDATE community_members 
  SET role = 'admin' 
  WHERE community_id = p_community_id AND user_id = v_user_id;

  RETURN json_build_object(
    'success', true, 
    'message', 'Ownership transferred successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 