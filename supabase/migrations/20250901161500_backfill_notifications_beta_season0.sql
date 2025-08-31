-- 20250901161500_backfill_notifications_beta_season0.sql
-- 目的: βSeason 0 報酬付与済みユーザーに対して、未作成の reward_earned 通知を補完する

BEGIN;

DO $$
DECLARE
  v_season_id UUID := '7f7d31d5-2f26-4984-ae37-9bca5251ed84'; -- βSeason 0 (prod)
  v_reward_top1 UUID := '0dc5286e-b2fd-4ca2-b386-fc5096e020c8'; -- 1位
  v_reward_top2 UUID := '1bc8ce5a-b797-4079-9ef9-9bd9915438c6'; -- 2位
  v_reward_top3 UUID := 'a6857b21-7369-4918-bdc2-881d73c4041d'; -- 3位
  v_reward_top8 UUID := '2f82b69e-9661-460c-be7c-0e5dac7f52ac';  -- TOP8
  v_reward_voter_top20 UUID := '658ba719-ad55-4115-9ac1-c1d28633b974'; -- 投票者TOP20
  rec RECORD;
BEGIN
  -- helper: 通知未作成の user_rewards に対して通知作成
  -- 1位
  FOR rec IN
    SELECT ur.user_id, ur.reward_id
    FROM public.user_rewards ur
    WHERE ur.earned_season_id = v_season_id AND ur.reward_id = v_reward_top1
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = ur.user_id AND n.type='reward_earned' AND n.related_reward_id = ur.reward_id
      )
  LOOP
    PERFORM public.create_reward_earned_notification(rec.user_id, rec.reward_id, v_season_id);
  END LOOP;

  -- 2位
  FOR rec IN
    SELECT ur.user_id, ur.reward_id
    FROM public.user_rewards ur
    WHERE ur.earned_season_id = v_season_id AND ur.reward_id = v_reward_top2
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = ur.user_id AND n.type='reward_earned' AND n.related_reward_id = ur.reward_id
      )
  LOOP
    PERFORM public.create_reward_earned_notification(rec.user_id, rec.reward_id, v_season_id);
  END LOOP;

  -- 3位
  FOR rec IN
    SELECT ur.user_id, ur.reward_id
    FROM public.user_rewards ur
    WHERE ur.earned_season_id = v_season_id AND ur.reward_id = v_reward_top3
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = ur.user_id AND n.type='reward_earned' AND n.related_reward_id = ur.reward_id
      )
  LOOP
    PERFORM public.create_reward_earned_notification(rec.user_id, rec.reward_id, v_season_id);
  END LOOP;

  -- TOP8
  FOR rec IN
    SELECT ur.user_id, ur.reward_id
    FROM public.user_rewards ur
    WHERE ur.earned_season_id = v_season_id AND ur.reward_id = v_reward_top8
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = ur.user_id AND n.type='reward_earned' AND n.related_reward_id = ur.reward_id
      )
  LOOP
    PERFORM public.create_reward_earned_notification(rec.user_id, rec.reward_id, v_season_id);
  END LOOP;

  -- 投票者 TOP20
  FOR rec IN
    SELECT ur.user_id, ur.reward_id
    FROM public.user_rewards ur
    WHERE ur.earned_season_id = v_season_id AND ur.reward_id = v_reward_voter_top20
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = ur.user_id AND n.type='reward_earned' AND n.related_reward_id = ur.reward_id
      )
  LOOP
    PERFORM public.create_reward_earned_notification(rec.user_id, rec.reward_id, v_season_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMIT;
