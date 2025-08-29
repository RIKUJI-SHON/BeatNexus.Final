-- 20250829170000_multilingual_season_end_notifications.sql
-- 目的: season_end 通知をユーザーの言語（profiles.language）に基づき多言語化
-- 対応: en, ja, ko, zh-CN, es, pt-BR, fr, de（その他は英語にフォールバック）

BEGIN;

-- 1) 多言語文面生成関数を追加
CREATE OR REPLACE FUNCTION public.get_season_end_notification_text(
  p_language TEXT,
  p_season_name TEXT
) RETURNS JSON
LANGUAGE plpgsql
STABLE
SET search_path TO public, auth
AS $$
DECLARE
  v_lang TEXT := COALESCE(p_language, 'en');
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- 言語コード正規化
  v_lang := LOWER(v_lang);
  IF v_lang ~ '^zh' THEN
    v_lang := 'zh-CN';
  ELSIF v_lang ~ '^pt' THEN
    v_lang := 'pt-BR';
  END IF;

  -- 各言語のタイトル/メッセージ
  CASE v_lang
    WHEN 'ja' THEN
      v_title := '🏁 シーズン終了';
      v_message := COALESCE(p_season_name, 'このシーズン') || ' が終了しました。今シーズンの結果をチェックしましょう。';
    WHEN 'ko' THEN
      v_title := '🏁 시즌 종료';
      v_message := COALESCE(p_season_name, '이번 시즌') || '이(가) 종료되었습니다. 이번 시즌 결과를 확인해 보세요.';
    WHEN 'zh-CN' THEN
      v_title := '🏁 赛季结束';
      v_message := COALESCE(p_season_name, '本赛季') || ' 已结束。查看本赛季的结果吧。';
    WHEN 'es' THEN
      v_title := '🏁 Fin de la temporada';
      v_message := 'La temporada ' || COALESCE(p_season_name, '') || ' ha terminado. Revisa los resultados.';
    WHEN 'pt-BR' THEN
      v_title := '🏁 Fim da temporada';
      v_message := 'A temporada ' || COALESCE(p_season_name, '') || ' terminou. Confira os resultados.';
    WHEN 'fr' THEN
      v_title := '🏁 Fin de la saison';
      v_message := 'La saison ' || COALESCE(p_season_name, '') || ' est terminée. Consultez les résultats.';
    WHEN 'de' THEN
      v_title := '🏁 Saison beendet';
      v_message := 'Die Saison ' || COALESCE(p_season_name, '') || ' ist beendet. Schau dir die Ergebnisse an.';
    ELSE
      -- en (default)
      v_title := '🏁 Season ended';
      v_message := 'Season ' || COALESCE(p_season_name, '') || ' has ended. Check out the results.';
  END CASE;

  RETURN json_build_object('title', v_title, 'message', v_message);
END;
$$;

COMMENT ON FUNCTION public.get_season_end_notification_text(TEXT, TEXT)
IS 'シーズン終了通知の多言語文面生成（profiles.languageに基づきtitle/messageを返却）';

-- 2) end_current_season() の Phase 5 を多言語通知に更新
CREATE OR REPLACE FUNCTION public.end_current_season()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  v_current_season RECORD;
  v_player_ranking_count INTEGER := 0;
  v_voter_ranking_count INTEGER := 0;
  v_notifications_count INTEGER := 0;

  -- 既存: 強制終了処理用
  v_active_battle RECORD;
  v_winner_id UUID;
  v_force_end_result JSON;
  v_forced_battles_count INTEGER := 0;
  v_forced_battles_errors INTEGER := 0;
  v_forced_battles_details JSON[] := ARRAY[]::JSON[];
  v_forced_battles_errors_details JSON[] := ARRAY[]::JSON[];
BEGIN
  -- 終了時刻を過ぎたアクティブシーズンのみ取得
  SELECT * INTO v_current_season
  FROM public.seasons 
  WHERE status = 'active'
    AND end_at <= NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    DECLARE
      v_active_season_count INTEGER;
      v_future_season RECORD;
    BEGIN
      SELECT COUNT(*) INTO v_active_season_count FROM public.seasons WHERE status = 'active';
      IF v_active_season_count = 0 THEN
        RETURN json_build_object('success', false, 'error', 'no_active_season', 'message', 'アクティブなシーズンが見つかりません');
      ELSE
        SELECT * INTO v_future_season FROM public.seasons WHERE status = 'active' AND end_at > NOW() ORDER BY created_at DESC LIMIT 1;
        RETURN json_build_object(
          'success', false,
          'error', 'season_not_yet_ended',
          'message', FORMAT('アクティブなシーズン「%s」はまだ終了時刻に達していません（終了予定: %s、現在時刻: %s）', v_future_season.name, v_future_season.end_at, NOW()),
          'season_info', json_build_object('id', v_future_season.id, 'name', v_future_season.name, 'end_at', v_future_season.end_at, 'current_time', NOW(), 'remaining_time', v_future_season.end_at - NOW())
        );
      END IF;
    END;
  END IF;

  -- Phase 0: アクティブバトル強制終了（既存ロジック維持）
  FOR v_active_battle IN
    SELECT id, player1_user_id, player2_user_id, votes_a, votes_b, battle_format, end_voting_at, created_at
    FROM public.active_battles
    WHERE status = 'ACTIVE' AND end_voting_at > NOW()
    ORDER BY created_at ASC
  LOOP
    BEGIN
      IF v_active_battle.votes_a > v_active_battle.votes_b THEN
        v_winner_id := v_active_battle.player1_user_id;
      ELSIF v_active_battle.votes_b > v_active_battle.votes_a THEN
        v_winner_id := v_active_battle.player2_user_id;
      ELSE
        v_winner_id := NULL;
      END IF;

      SELECT complete_battle_with_video_archiving(v_active_battle.id, v_winner_id) INTO v_force_end_result;

      IF (v_force_end_result->>'success')::boolean = true THEN
        v_forced_battles_count := v_forced_battles_count + 1;
        v_forced_battles_details := v_forced_battles_details || json_build_object(
          'battle_id', v_active_battle.id,
          'winner_id', v_winner_id,
          'votes_a', v_active_battle.votes_a,
          'votes_b', v_active_battle.votes_b,
          'original_end_time', v_active_battle.end_voting_at,
          'forced_end_time', NOW(),
          'battle_format', v_active_battle.battle_format,
          'completion_result', v_force_end_result
        );

        INSERT INTO public.notifications (user_id, title, message, type, related_battle_id, is_read, created_at, updated_at)
        VALUES (v_active_battle.player1_user_id, 'シーズン終了によるバトル強制終了', 'シーズン終了に伴い、進行中のバトルが強制的に終了されました。投票期間の途中でしたが、その時点での投票数で勝敗が決定されました。', 'info', v_active_battle.id, false, NOW(), NOW());
        INSERT INTO public.notifications (user_id, title, message, type, related_battle_id, is_read, created_at, updated_at)
        VALUES (v_active_battle.player2_user_id, 'シーズン終了によるバトル強制終了', 'シーズン終了に伴い、進行中のバトルが強制的に終了されました。投票期間の途中でしたが、その時点での投票数で勝敗が決定されました。', 'info', v_active_battle.id, false, NOW(), NOW());
      ELSE
        RAISE EXCEPTION 'Battle completion failed: %', v_force_end_result->>'error';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_forced_battles_errors := v_forced_battles_errors + 1;
      v_forced_battles_errors_details := v_forced_battles_errors_details || json_build_object(
        'battle_id', v_active_battle.id,
        'error_message', SQLERRM,
        'error_time', NOW(),
        'battle_details', json_build_object('votes_a', v_active_battle.votes_a, 'votes_b', v_active_battle.votes_b, 'end_voting_at', v_active_battle.end_voting_at, 'battle_format', v_active_battle.battle_format)
      );
    END;
  END LOOP;

  -- Phase 1: バトルランキング
  INSERT INTO public.season_rankings (season_id, user_id, points, rank)
  SELECT 
    v_current_season.id,
    p.id,
    p.season_points,
    DENSE_RANK() OVER (
      ORDER BY p.season_points DESC,
               m.weighted_vote_share DESC,
               m.sum_margin_ratio DESC,
               m.battles_played DESC,
               m.last_battle_at DESC,
               p.id ASC
    ) AS rank
  FROM public.profiles p
  JOIN public.season_user_metrics m
    ON m.user_id = p.id AND m.season_id = v_current_season.id
  WHERE p.is_deleted = FALSE
  ORDER BY p.season_points DESC,
           m.weighted_vote_share DESC,
           m.sum_margin_ratio DESC,
           m.battles_played DESC,
           m.last_battle_at DESC,
           p.id ASC;
  GET DIAGNOSTICS v_player_ranking_count = ROW_COUNT;

  -- Phase 2: 投票者ランキング
  INSERT INTO public.season_voter_rankings (season_id, user_id, votes, rank)
  SELECT v_current_season.id, id, season_vote_points,
         DENSE_RANK() OVER (ORDER BY season_vote_points DESC)
  FROM public.profiles
  WHERE is_deleted = FALSE AND season_vote_points >= 1
  ORDER BY season_vote_points DESC, username ASC;
  GET DIAGNOSTICS v_voter_ranking_count = ROW_COUNT;

  -- Phase 3: シーズン終了
  UPDATE public.seasons 
  SET status = 'ended', end_at = NOW(), updated_at = NOW()
  WHERE id = v_current_season.id;

  -- Phase 4: ポイントリセット
  UPDATE public.profiles 
  SET season_points = 1200, season_vote_points = 0, updated_at = NOW()
  WHERE is_deleted = FALSE;

  -- Phase 5: シーズン終了通知（全ユーザー | 多言語）
  INSERT INTO public.notifications (user_id, title, message, type, related_season_id, is_read, created_at, updated_at)
  SELECT 
    p.id,
    (msg->>'title')::text,
    (msg->>'message')::text,
    'season_end',
    v_current_season.id,
    false,
    NOW(),
    NOW()
  FROM public.profiles p
  CROSS JOIN LATERAL public.get_season_end_notification_text(p.language, v_current_season.name) AS msg
  WHERE p.is_deleted = FALSE;
  GET DIAGNOSTICS v_notifications_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'forced_battles', json_build_object(
      'processed_count', v_forced_battles_count,
      'error_count', v_forced_battles_errors,
      'details', v_forced_battles_details,
      'errors', v_forced_battles_errors_details
    ),
    'ended_season', json_build_object(
      'id', v_current_season.id,
      'name', v_current_season.name,
      'player_rankings_saved', v_player_ranking_count,
      'voter_rankings_saved', v_voter_ranking_count,
      'ended_at', NOW()
    ),
    'season_end_notifications_created', v_notifications_count,
    'message', FORMAT('シーズンが正常に終了しました。アクティブバトル%s件を強制終了しました。新しいシーズンを開始するには start_new_season() 関数を実行してください。', v_forced_battles_count)
  );
END;
$$;

COMMENT ON FUNCTION public.end_current_season()
IS 'シーズン終了処理：アクティブバトル強制終了・ランキングアーカイブ・ポイントリセット・season_end多言語通知作成';

GRANT EXECUTE ON FUNCTION public.end_current_season() TO authenticated;

COMMIT;
