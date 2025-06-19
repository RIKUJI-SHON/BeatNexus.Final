-- 簡易版コミュニティ削除関数
CREATE OR REPLACE FUNCTION delete_community(p_community_id uuid)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_owner_id uuid;
BEGIN
  -- 現在のユーザーを取得
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;

  -- オーナー確認
  SELECT owner_user_id INTO v_owner_id FROM communities WHERE id = p_community_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Community not found');
  END IF;

  IF v_owner_id != v_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Only the owner can delete this community');
  END IF;

  -- 関連データを削除
  DELETE FROM community_chat_messages WHERE community_id = p_community_id;
  DELETE FROM community_members WHERE community_id = p_community_id;
  DELETE FROM communities WHERE id = p_community_id;

  RETURN json_build_object('success', true, 'message', 'Community deleted successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 