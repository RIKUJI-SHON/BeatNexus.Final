-- コミュニティシステムの実装
-- ENUMタイプの作成
CREATE TYPE community_role AS ENUM ('owner', 'admin', 'member');

-- 1. communities テーブル
CREATE TABLE IF NOT EXISTS public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  owner_user_id uuid NOT NULL REFERENCES public.profiles(id),
  password_hash text, -- pgcryptoのcrypt()でハッシュ化
  member_count integer DEFAULT 1,
  average_rating integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. community_members テーブル
CREATE TABLE IF NOT EXISTS public.community_members (
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  role community_role NOT NULL DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);

-- 3. community_chat_messages テーブル
CREATE TABLE IF NOT EXISTS public.community_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- インデックスの作成
CREATE INDEX idx_community_members_user_id ON public.community_members(user_id);
CREATE INDEX idx_community_chat_messages_community_id_created_at ON public.community_chat_messages(community_id, created_at DESC);

-- 4. コミュニティランキングビュー（メンバーのレーティング順）
CREATE OR REPLACE VIEW public.community_rankings_view AS
WITH member_rankings AS (
  SELECT 
    cm.community_id,
    cm.user_id,
    cm.role,
    cm.joined_at,
    p.username,
    p.avatar_url,
    p.rating,
    RANK() OVER (PARTITION BY cm.community_id ORDER BY p.rating DESC) as rank_in_community
  FROM public.community_members cm
  JOIN public.profiles p ON cm.user_id = p.id
  WHERE p.is_deleted = false
)
SELECT * FROM member_rankings
ORDER BY community_id, rank_in_community;

-- 5. グローバルコミュニティランキングビュー（コミュニティの平均レーティング順）
CREATE OR REPLACE VIEW public.global_community_rankings_view AS
SELECT 
  c.id,
  c.name,
  c.description,
  c.owner_user_id,
  c.member_count,
  c.average_rating,
  c.created_at,
  p.username as owner_username,
  p.avatar_url as owner_avatar_url,
  RANK() OVER (ORDER BY c.average_rating DESC, c.member_count DESC) as global_rank
FROM public.communities c
JOIN public.profiles p ON c.owner_user_id = p.id
WHERE p.is_deleted = false
ORDER BY global_rank;

-- 6. ユーザーが参加しているコミュニティ一覧ビュー
CREATE OR REPLACE VIEW public.user_communities_view AS
SELECT 
  cm.user_id,
  cm.community_id,
  cm.role,
  cm.joined_at,
  c.name as community_name,
  c.description as community_description,
  c.member_count,
  c.average_rating,
  (
    SELECT rank_in_community 
    FROM community_rankings_view crv 
    WHERE crv.community_id = cm.community_id 
    AND crv.user_id = cm.user_id
  ) as user_rank_in_community
FROM public.community_members cm
JOIN public.communities c ON cm.community_id = c.id;

-- RLSの有効化
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: communities
-- 誰でも閲覧可能
CREATE POLICY "Communities are viewable by everyone" ON public.communities
  FOR SELECT USING (true);

-- 認証済みユーザーは作成可能
CREATE POLICY "Authenticated users can create communities" ON public.communities
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

-- オーナーとアドミンは更新可能
CREATE POLICY "Owner and admins can update community" ON public.communities
  FOR UPDATE USING (
    auth.uid() = owner_user_id OR
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
    )
  );

-- オーナーのみ削除可能
CREATE POLICY "Only owner can delete community" ON public.communities
  FOR DELETE USING (auth.uid() = owner_user_id);

-- RLSポリシー: community_members
-- コミュニティメンバーは他のメンバーを閲覧可能
CREATE POLICY "Community members can view other members" ON public.community_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_id
      AND cm.user_id = auth.uid()
    )
  );

-- ユーザーは自分自身をメンバーに追加可能（join_community関数経由）
CREATE POLICY "Users can add themselves as members" ON public.community_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- オーナーとアドミンは他のメンバーを削除可能、メンバーは自分自身を削除可能
CREATE POLICY "Owners/admins can remove members, members can leave" ON public.community_members
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
    )
  );

-- RLSポリシー: community_chat_messages
-- コミュニティメンバーはチャットを閲覧可能
CREATE POLICY "Community members can view chat messages" ON public.community_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_id
      AND cm.user_id = auth.uid()
    )
  );

-- コミュニティメンバーはメッセージを投稿可能
CREATE POLICY "Community members can post messages" ON public.community_chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_id
      AND cm.user_id = auth.uid()
    )
    AND auth.uid() = user_id
  );

-- データベース関数

-- 1. コミュニティ作成関数
CREATE OR REPLACE FUNCTION public.create_community(
  p_name text,
  p_description text,
  p_password text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_community_id uuid;
  v_password_hash text;
  v_user_rating integer;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;

  -- ユーザーのレーティングを取得
  SELECT rating INTO v_user_rating FROM public.profiles WHERE id = v_user_id;

  -- パスワードのハッシュ化
  IF p_password IS NOT NULL AND p_password != '' THEN
    v_password_hash := crypt(p_password, gen_salt('bf'));
  END IF;

  -- コミュニティを作成
  INSERT INTO public.communities (name, description, owner_user_id, password_hash, average_rating)
  VALUES (p_name, p_description, v_user_id, v_password_hash, v_user_rating)
  RETURNING id INTO v_community_id;

  -- オーナーをメンバーとして追加
  INSERT INTO public.community_members (community_id, user_id, role)
  VALUES (v_community_id, v_user_id, 'owner');

  RETURN json_build_object(
    'success', true,
    'community_id', v_community_id,
    'message', 'Community created successfully'
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'message', 'Community name already exists');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 2. コミュニティ参加関数
CREATE OR REPLACE FUNCTION public.join_community(
  p_community_id uuid,
  p_password text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_password_hash text;
  v_community_name text;
  v_user_rating integer;
  v_current_member_count integer;
  v_current_average_rating numeric;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;

  -- すでにメンバーかチェック
  IF EXISTS (
    SELECT 1 FROM public.community_members 
    WHERE community_id = p_community_id AND user_id = v_user_id
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Already a member of this community');
  END IF;

  -- コミュニティの情報を取得
  SELECT password_hash, name, member_count, average_rating 
  INTO v_password_hash, v_community_name, v_current_member_count, v_current_average_rating
  FROM public.communities 
  WHERE id = p_community_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Community not found');
  END IF;

  -- パスワードチェック
  IF v_password_hash IS NOT NULL THEN
    IF p_password IS NULL OR p_password = '' THEN
      RETURN json_build_object('success', false, 'message', 'Password required');
    END IF;
    
    IF v_password_hash != crypt(p_password, v_password_hash) THEN
      RETURN json_build_object('success', false, 'message', 'Invalid password');
    END IF;
  END IF;

  -- ユーザーのレーティングを取得
  SELECT rating INTO v_user_rating FROM public.profiles WHERE id = v_user_id;

  -- メンバーとして追加
  INSERT INTO public.community_members (community_id, user_id, role)
  VALUES (p_community_id, v_user_id, 'member');

  -- コミュニティの統計を更新
  UPDATE public.communities
  SET 
    member_count = v_current_member_count + 1,
    average_rating = ((v_current_average_rating * v_current_member_count) + v_user_rating) / (v_current_member_count + 1),
    updated_at = now()
  WHERE id = p_community_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Successfully joined ' || v_community_name
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 3. コミュニティ退出関数
CREATE OR REPLACE FUNCTION public.leave_community(
  p_community_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_user_role community_role;
  v_user_rating integer;
  v_current_member_count integer;
  v_current_average_rating numeric;
BEGIN
  v_user_id := auth.uid();
  
  -- ユーザーの役割を確認
  SELECT role INTO v_user_role
  FROM public.community_members
  WHERE community_id = p_community_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Not a member of this community');
  END IF;

  -- オーナーは退出不可（コミュニティを削除する必要がある）
  IF v_user_role = 'owner' THEN
    RETURN json_build_object('success', false, 'message', 'Owner cannot leave. Transfer ownership or delete the community.');
  END IF;

  -- ユーザーのレーティングを取得
  SELECT rating INTO v_user_rating FROM public.profiles WHERE id = v_user_id;

  -- コミュニティの現在の統計を取得
  SELECT member_count, average_rating 
  INTO v_current_member_count, v_current_average_rating
  FROM public.communities 
  WHERE id = p_community_id;

  -- メンバーから削除
  DELETE FROM public.community_members
  WHERE community_id = p_community_id AND user_id = v_user_id;

  -- コミュニティの統計を更新
  IF v_current_member_count > 1 THEN
    UPDATE public.communities
    SET 
      member_count = v_current_member_count - 1,
      average_rating = CASE 
        WHEN v_current_member_count = 2 THEN (
          SELECT rating FROM public.profiles p 
          JOIN public.community_members cm ON p.id = cm.user_id 
          WHERE cm.community_id = p_community_id
          LIMIT 1
        )
        ELSE ((v_current_average_rating * v_current_member_count) - v_user_rating) / (v_current_member_count - 1)
      END,
      updated_at = now()
    WHERE id = p_community_id;
  END IF;

  RETURN json_build_object('success', true, 'message', 'Successfully left the community');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 4. メンバーキック関数（オーナー・アドミン用）
CREATE OR REPLACE FUNCTION public.kick_member_from_community(
  p_community_id uuid,
  p_target_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_user_role community_role;
  v_target_role community_role;
  v_target_rating integer;
  v_current_member_count integer;
  v_current_average_rating numeric;
BEGIN
  v_user_id := auth.uid();
  
  -- 実行者の役割を確認
  SELECT role INTO v_user_role
  FROM public.community_members
  WHERE community_id = p_community_id AND user_id = v_user_id;

  IF v_user_role NOT IN ('owner', 'admin') THEN
    RETURN json_build_object('success', false, 'message', 'Only owner or admin can kick members');
  END IF;

  -- 対象者の役割を確認
  SELECT role INTO v_target_role
  FROM public.community_members
  WHERE community_id = p_community_id AND user_id = p_target_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Target user is not a member');
  END IF;

  -- オーナーはキックできない
  IF v_target_role = 'owner' THEN
    RETURN json_build_object('success', false, 'message', 'Cannot kick the owner');
  END IF;

  -- アドミンは他のアドミンをキックできない
  IF v_user_role = 'admin' AND v_target_role = 'admin' THEN
    RETURN json_build_object('success', false, 'message', 'Admin cannot kick another admin');
  END IF;

  -- 対象者のレーティングを取得
  SELECT rating INTO v_target_rating FROM public.profiles WHERE id = p_target_user_id;

  -- コミュニティの現在の統計を取得
  SELECT member_count, average_rating 
  INTO v_current_member_count, v_current_average_rating
  FROM public.communities 
  WHERE id = p_community_id;

  -- メンバーを削除
  DELETE FROM public.community_members
  WHERE community_id = p_community_id AND user_id = p_target_user_id;

  -- コミュニティの統計を更新
  UPDATE public.communities
  SET 
    member_count = v_current_member_count - 1,
    average_rating = CASE 
      WHEN v_current_member_count = 2 THEN (
        SELECT rating FROM public.profiles p 
        JOIN public.community_members cm ON p.id = cm.user_id 
        WHERE cm.community_id = p_community_id
        LIMIT 1
      )
      ELSE ((v_current_average_rating * v_current_member_count) - v_target_rating) / (v_current_member_count - 1)
    END,
    updated_at = now()
  WHERE id = p_community_id;

  RETURN json_build_object('success', true, 'message', 'Member kicked successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 5. メンバーの役割変更関数（オーナー用）
CREATE OR REPLACE FUNCTION public.update_member_role(
  p_community_id uuid,
  p_target_user_id uuid,
  p_new_role community_role
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_user_role community_role;
BEGIN
  v_user_id := auth.uid();
  
  -- 実行者の役割を確認
  SELECT role INTO v_user_role
  FROM public.community_members
  WHERE community_id = p_community_id AND user_id = v_user_id;

  -- オーナーのみ役割変更可能
  IF v_user_role != 'owner' THEN
    RETURN json_build_object('success', false, 'message', 'Only owner can change member roles');
  END IF;

  -- 自分自身の役割は変更不可
  IF v_user_id = p_target_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Cannot change your own role');
  END IF;

  -- ownerロールは設定不可（所有権譲渡は別関数）
  IF p_new_role = 'owner' THEN
    RETURN json_build_object('success', false, 'message', 'Use transfer_ownership function to change owner');
  END IF;

  -- 役割を更新
  UPDATE public.community_members
  SET role = p_new_role
  WHERE community_id = p_community_id AND user_id = p_target_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Target user is not a member');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Role updated successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- トリガー関数：メンバー数の自動更新（バックアップ用）
CREATE OR REPLACE FUNCTION public.update_community_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- メンバー数と平均レーティングを再計算
  UPDATE public.communities c
  SET 
    member_count = (
      SELECT COUNT(*) FROM public.community_members 
      WHERE community_id = c.id
    ),
    average_rating = (
      SELECT AVG(p.rating)::integer 
      FROM public.community_members cm
      JOIN public.profiles p ON cm.user_id = p.id
      WHERE cm.community_id = c.id
    ),
    updated_at = now()
  WHERE c.id = COALESCE(NEW.community_id, OLD.community_id);
  
  RETURN NULL;
END;
$$;

-- トリガーの作成
CREATE TRIGGER update_community_stats_trigger
AFTER INSERT OR DELETE ON public.community_members
FOR EACH ROW
EXECUTE FUNCTION public.update_community_stats();

-- 更新日時の自動更新
CREATE TRIGGER update_communities_updated_at
BEFORE UPDATE ON public.communities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_community_chat_messages_updated_at
BEFORE UPDATE ON public.community_chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column(); 