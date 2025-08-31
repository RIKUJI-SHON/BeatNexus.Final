-- 20250901120000_add_reward_earned_notifications.sql
-- 目的: 報酬獲得通知 'reward_earned' を通知システムに追加し、関連カラムを拡張
-- - notifications.type 制約に 'reward_earned' を追加
-- - notifications に related_reward_id を追加（rewards.id 参照）
-- - ヘルパー関数: 個別/一括で報酬獲得通知を作成

BEGIN;

-- 1) 関連報酬IDカラムの追加
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS related_reward_id uuid REFERENCES public.rewards(id) ON DELETE CASCADE;

-- 2) type 制約に 'reward_earned' を追加（既存タイプを維持）
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (((type)::text = ANY (ARRAY[
    ('info'::character varying)::text,
    ('success'::character varying)::text,
    ('warning'::character varying)::text,
    ('battle_matched'::character varying)::text,
    ('battle_win'::character varying)::text,
    ('battle_lose'::character varying)::text,
    ('battle_draw'::character varying)::text,
    ('season_start'::character varying)::text,
    ('news_article'::character varying)::text,
    ('season_end'::character varying)::text,
    ('reward_earned'::character varying)::text
  ])));

-- 3) 多言語（en/ja）対応の簡易タイトル・メッセージ生成と通知作成関数
CREATE OR REPLACE FUNCTION public.create_reward_earned_notification(
  p_user_id uuid,
  p_reward_id uuid,
  p_season_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  v_lang text;
  v_title text;
  v_message text;
  v_reward_name text;
  v_notification_id uuid;
BEGIN
  -- 必要データの取得
  SELECT COALESCE(language, 'en') INTO v_lang FROM public.profiles WHERE id = p_user_id;
  SELECT name INTO v_reward_name FROM public.rewards WHERE id = p_reward_id;

  IF v_reward_name IS NULL THEN
    RAISE EXCEPTION 'Reward % not found', p_reward_id;
  END IF;

  -- 簡易バイリンガル文面
  IF LOWER(v_lang) = 'ja' THEN
    v_title := 'シーズン報酬獲得！';
    v_message := format('「%s」を獲得しました！コレクションページで確認できます。', v_reward_name);
  ELSE
    v_title := 'Season reward earned!';
    v_message := format('You earned "%s". Check it in your collection.', v_reward_name);
  END IF;

  INSERT INTO public.notifications (
    user_id, title, message, type, related_reward_id, related_season_id, is_read, created_at, updated_at
  ) VALUES (
    p_user_id, v_title, v_message, 'reward_earned', p_reward_id, p_season_id, false, NOW(), NOW()
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

COMMENT ON FUNCTION public.create_reward_earned_notification(uuid, uuid, uuid)
IS '指定ユーザーに対し、対象報酬の獲得通知（reward_earned）を作成する。タイトル/メッセージはプロフィール言語（en/ja）で生成。返り値は通知ID。';

-- 4) 指定シーズンの user_rewards を走査して未通知の報酬獲得通知を一括作成
CREATE OR REPLACE FUNCTION public.notify_rewards_for_season(
  p_season_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  v_created_count integer := 0;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, related_reward_id, related_season_id, is_read, created_at, updated_at)
  SELECT
    ur.user_id,
    CASE WHEN COALESCE(p.language, 'en') = 'ja' THEN 'シーズン報酬獲得！' ELSE 'Season reward earned!' END AS title,
    CASE WHEN COALESCE(p.language, 'en') = 'ja'
         THEN format('「%s」を獲得しました！コレクションページで確認できます。', r.name)
         ELSE format('You earned "%s". Check it in your collection.', r.name) END AS message,
    'reward_earned',
    ur.reward_id,
    p_season_id,
    false,
    NOW(),
    NOW()
  FROM public.user_rewards ur
  JOIN public.rewards r ON r.id = ur.reward_id
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.earned_season_id = p_season_id
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = ur.user_id
        AND n.type = 'reward_earned'
        AND n.related_reward_id = ur.reward_id
    );

  GET DIAGNOSTICS v_created_count = ROW_COUNT;

  RETURN json_build_object(
    'season_id', p_season_id,
    'created_notifications', v_created_count
  );
END;
$$;

COMMENT ON FUNCTION public.notify_rewards_for_season(uuid)
IS '指定シーズンの user_rewards を基に、未通知の reward_earned 通知を一括作成する。';

COMMIT;
