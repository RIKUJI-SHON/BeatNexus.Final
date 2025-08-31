-- 20250901160000_award_beta_season0_rewards.sql
-- 目的: βSeason 0 の最終ランキングに基づき、プレイヤー/投票者へ報酬を付与し、通知を送信する（本番用）
-- 方針: user_rewards への INSERT は ON CONFLICT DO NOTHING。通知は新規付与分に対してのみ作成。

BEGIN;

DO $$
DECLARE
  v_season_id UUID := '7f7d31d5-2f26-4984-ae37-9bca5251ed84'; -- βSeason 0 (prod)
  v_reward_top1 UUID := '0dc5286e-b2fd-4ca2-b386-fc5096e020c8'; -- 1位
  v_reward_top2 UUID := '1bc8ce5a-b797-4079-9ef9-9bd9915438c6'; -- 2位
  v_reward_top3 UUID := 'a6857b21-7369-4918-bdc2-881d73c4041d'; -- 3位
  v_reward_top8 UUID := '2f82b69e-9661-460c-be7c-0e5dac7f52ac';  -- TOP8
  v_reward_voter_top20 UUID := '658ba719-ad55-4115-9ac1-c1d28633b974'; -- 投票者TOP20
BEGIN
  -- 1位
  INSERT INTO public.user_rewards (user_id, reward_id, earned_season_id)
  SELECT sr.user_id, v_reward_top1, v_season_id
  FROM public.season_rankings sr
  WHERE sr.season_id = v_season_id AND sr.rank = 1
    AND NOT EXISTS (
      SELECT 1 FROM public.user_rewards ur
      WHERE ur.user_id = sr.user_id AND ur.reward_id = v_reward_top1
    );

  PERFORM public.create_reward_earned_notification(sr.user_id, v_reward_top1, v_season_id)
  FROM public.season_rankings sr
  WHERE sr.season_id = v_season_id AND sr.rank = 1
    AND NOT EXISTS (
      SELECT 1 FROM public.user_rewards ur
      WHERE ur.user_id = sr.user_id AND ur.reward_id = v_reward_top1
    );

  -- 2位
  INSERT INTO public.user_rewards (user_id, reward_id, earned_season_id)
  SELECT sr.user_id, v_reward_top2, v_season_id
  FROM public.season_rankings sr
  WHERE sr.season_id = v_season_id AND sr.rank = 2
    AND NOT EXISTS (
      SELECT 1 FROM public.user_rewards ur
      WHERE ur.user_id = sr.user_id AND ur.reward_id = v_reward_top2
    );

  PERFORM public.create_reward_earned_notification(sr.user_id, v_reward_top2, v_season_id)
  FROM public.season_rankings sr
  WHERE sr.season_id = v_season_id AND sr.rank = 2
    AND NOT EXISTS (
      SELECT 1 FROM public.user_rewards ur
      WHERE ur.user_id = sr.user_id AND ur.reward_id = v_reward_top2
    );

  -- 3位
  INSERT INTO public.user_rewards (user_id, reward_id, earned_season_id)
  SELECT sr.user_id, v_reward_top3, v_season_id
  FROM public.season_rankings sr
  WHERE sr.season_id = v_season_id AND sr.rank = 3
    AND NOT EXISTS (
      SELECT 1 FROM public.user_rewards ur
      WHERE ur.user_id = sr.user_id AND ur.reward_id = v_reward_top3
    );

  PERFORM public.create_reward_earned_notification(sr.user_id, v_reward_top3, v_season_id)
  FROM public.season_rankings sr
  WHERE sr.season_id = v_season_id AND sr.rank = 3
    AND NOT EXISTS (
      SELECT 1 FROM public.user_rewards ur
      WHERE ur.user_id = sr.user_id AND ur.reward_id = v_reward_top3
    );

  -- TOP8（1〜8位）
  INSERT INTO public.user_rewards (user_id, reward_id, earned_season_id)
  SELECT sr.user_id, v_reward_top8, v_season_id
  FROM public.season_rankings sr
  WHERE sr.season_id = v_season_id AND sr.rank BETWEEN 1 AND 8
    AND NOT EXISTS (
      SELECT 1 FROM public.user_rewards ur
      WHERE ur.user_id = sr.user_id AND ur.reward_id = v_reward_top8
    );

  PERFORM public.create_reward_earned_notification(sr.user_id, v_reward_top8, v_season_id)
  FROM public.season_rankings sr
  WHERE sr.season_id = v_season_id AND sr.rank BETWEEN 1 AND 8
    AND NOT EXISTS (
      SELECT 1 FROM public.user_rewards ur
      WHERE ur.user_id = sr.user_id AND ur.reward_id = v_reward_top8
    );

  -- 投票者 TOP20
  INSERT INTO public.user_rewards (user_id, reward_id, earned_season_id)
  SELECT vr.user_id, v_reward_voter_top20, v_season_id
  FROM public.season_voter_rankings vr
  WHERE vr.season_id = v_season_id AND vr.rank BETWEEN 1 AND 20
    AND NOT EXISTS (
      SELECT 1 FROM public.user_rewards ur
      WHERE ur.user_id = vr.user_id AND ur.reward_id = v_reward_voter_top20
    );

  PERFORM public.create_reward_earned_notification(vr.user_id, v_reward_voter_top20, v_season_id)
  FROM public.season_voter_rankings vr
  WHERE vr.season_id = v_season_id AND vr.rank BETWEEN 1 AND 20
    AND NOT EXISTS (
      SELECT 1 FROM public.user_rewards ur
      WHERE ur.user_id = vr.user_id AND ur.reward_id = v_reward_voter_top20
    );
END;
$$ LANGUAGE plpgsql;

COMMIT;
