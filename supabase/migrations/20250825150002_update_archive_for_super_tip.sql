-- SuperTip機能対応：アーカイブ処理でSuperTipデータも保持
-- archived_battle_votesにSuperTip情報を含めてコピーするよう既存関数を更新

-- process_expired_battles関数を確認して更新が必要かチェック
-- 現在のアーカイブ処理：
-- INSERT INTO public.archived_battle_votes (archived_battle_id, user_id, vote, comment, created_at)
-- SuperTip対応：super_tip_amount, stripe_payment_intent_id, payment_statusも含める

-- 既存のアーカイブ処理を更新（例：complete_battle関数など）
-- まず現在の関数の状況を確認して、必要に応じて修正

-- アーカイブ時にSuperTipデータも含めるようにINSERT文を更新
-- 現在のアーカイブ処理ではcommentがあるもののみコピーしているが、
-- SuperTip付きの投票も確実にアーカイブされるよう調整

-- get_battle_comments関数も更新してSuperTip情報を含める
CREATE OR REPLACE FUNCTION public.get_battle_comments_with_super_tip(p_battle_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  username text,
  avatar_url text,
  vote character(1),
  comment text,
  super_tip_amount integer,
  payment_status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_active_battle boolean := false;
  v_is_archived_battle boolean := false;
BEGIN
  -- アクティブバトルかチェック
  SELECT EXISTS(
    SELECT 1 FROM public.active_battles WHERE id = p_battle_id
  ) INTO v_is_active_battle;

  IF v_is_active_battle THEN
    -- アクティブバトルのコメントを返す（SuperTip対応）
    RETURN QUERY
    SELECT 
      bv.id,
      bv.user_id,
      COALESCE(p.username, 'Anonymous') as username,
      p.avatar_url,
      bv.vote,
      bv.comment,
      COALESCE(bv.super_tip_amount, 0) as super_tip_amount,
      COALESCE(bv.payment_status, 'none') as payment_status,
      bv.created_at
    FROM public.battle_votes bv
    LEFT JOIN public.profiles p ON bv.user_id = p.id
    WHERE bv.battle_id = p_battle_id 
      AND bv.comment IS NOT NULL 
      AND bv.comment != ''
      AND (p.is_deleted IS NULL OR p.is_deleted = false)
    ORDER BY 
      COALESCE(bv.super_tip_amount, 0) DESC, -- SuperTip金額の高い順
      bv.created_at DESC;

  ELSE
    -- アーカイブバトルかチェック
    SELECT EXISTS(
      SELECT 1 FROM public.archived_battles WHERE id = p_battle_id
    ) INTO v_is_archived_battle;

    IF v_is_archived_battle THEN
      -- アーカイブバトルのコメントを返す
      RETURN QUERY
      SELECT 
        abv.id,
        abv.user_id,
        COALESCE(p.username, 'Anonymous') as username,
        p.avatar_url,
        abv.vote,
        abv.comment,
        COALESCE(abv.super_tip_amount, 0) as super_tip_amount,
        COALESCE(abv.payment_status, 'none') as payment_status,
        abv.created_at
      FROM public.archived_battle_votes abv
      LEFT JOIN public.profiles p ON abv.user_id = p.id
      WHERE abv.archived_battle_id = p_battle_id 
        AND abv.comment IS NOT NULL 
        AND abv.comment != ''
        AND (p.is_deleted IS NULL OR p.is_deleted = false)
      ORDER BY 
        COALESCE(abv.super_tip_amount, 0) DESC, -- SuperTip金額の高い順
        abv.created_at DESC;

    ELSE
      -- original_battle_idでもチェック
      RETURN QUERY
      SELECT 
        abv.id,
        abv.user_id,
        COALESCE(p.username, 'Anonymous') as username,
        p.avatar_url,
        abv.vote,
        abv.comment,
        COALESCE(abv.super_tip_amount, 0) as super_tip_amount,
        COALESCE(abv.payment_status, 'none') as payment_status,
        abv.created_at
      FROM public.archived_battle_votes abv
      LEFT JOIN public.profiles p ON abv.user_id = p.id
      JOIN public.archived_battles ab ON abv.archived_battle_id = ab.id
      WHERE ab.original_battle_id = p_battle_id 
        AND abv.comment IS NOT NULL 
        AND abv.comment != ''
        AND (p.is_deleted IS NULL OR p.is_deleted = false)
      ORDER BY 
        COALESCE(abv.super_tip_amount, 0) DESC, -- SuperTip金額の高い順
        abv.created_at DESC;
    END IF;
  END IF;

  RETURN;
END;
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION public.get_battle_comments_with_super_tip(uuid) TO authenticated, anon;

-- コメント
COMMENT ON FUNCTION public.get_battle_comments_with_super_tip(uuid) 
IS 'SuperTip対応版のバトルコメント取得関数。金額順にソートし、SuperTip情報も含めて返す。アクティブバトルとアーカイブバトル両対応。';

-- 既存のアーカイブ処理でSuperTipデータもコピーされるように
-- 注意：実際のアーカイブ関数は既存の処理を壊さないよう慎重に更新する必要がある
-- この段階では新しい関数を作成し、後で既存関数の更新を検討
