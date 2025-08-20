-- 20250819130000_multilingual_battle_result_notifications.sql
-- 目的: バトル結果通知をユーザーのlanguage設定に基づき多言語化
-- 注意: profiles.language カラム (既存) を使用。翻訳キーによる方式ではなく、通知文面をDB側で生成（既存通知は本文文字列を保持する設計のため）。
-- 対応言語: en, ja, ko, zh-CN, es, pt-BR, fr, de
-- デプロイ手順: 先に開発環境 (wdttluticnlqzmqmfvgt) で検証後、本番 (qgqcjtjxaoplhxurbpis) に適用。

BEGIN;

-- 1) 通知文面生成ヘルパー関数（タイトル/メッセージをJSONで返却）
CREATE OR REPLACE FUNCTION public.get_battle_result_notification_text(
  p_outcome TEXT,            -- 'win' | 'lose' | 'draw'
  p_opponent_username TEXT,
  p_language TEXT            -- ユーザーの profiles.language
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  IF v_lang NOT IN ('en','ja','ko','zh-CN','es','pt-BR','fr','de') THEN
    v_lang := 'en';
  END IF;

  -- 各言語/結果別メッセージ
  -- 追加/修正時は全ケースを網羅
  CASE v_lang
    WHEN 'ja' THEN
      CASE p_outcome
        WHEN 'win'  THEN v_title := 'バトル勝利！'; v_message := FORMAT('対戦相手 %s とのバトルに勝利しました！', COALESCE(p_opponent_username,'Unknown'));
        WHEN 'lose' THEN v_title := 'バトル結果'; v_message := FORMAT('対戦相手 %s とのバトルは惜敗でした。次回頑張りましょう！', COALESCE(p_opponent_username,'Unknown'));
        ELSE            v_title := 'バトル結果'; v_message := FORMAT('対戦相手 %s とのバトルは引き分けでした。', COALESCE(p_opponent_username,'Unknown'));
      END CASE;
    WHEN 'ko' THEN
      CASE p_outcome
        WHEN 'win'  THEN v_title := '배틀 승리!'; v_message := FORMAT('%s 님과의 배틀에서 승리했습니다!', COALESCE(p_opponent_username,'Unknown'));
        WHEN 'lose' THEN v_title := '배틀 결과'; v_message := FORMAT('%s 님과의 배틀에서 아쉽게 패배했습니다. 다음에 다시 도전하세요!', COALESCE(p_opponent_username,'Unknown'));
        ELSE            v_title := '배틀 결과'; v_message := FORMAT('%s 님과의 배틀은 무승부였습니다.', COALESCE(p_opponent_username,'Unknown'));
      END CASE;
    WHEN 'zh-CN' THEN
      CASE p_outcome
        WHEN 'win'  THEN v_title := '战斗胜利！'; v_message := FORMAT('你战胜了对手 %s ！', COALESCE(p_opponent_username,'Unknown'));
        WHEN 'lose' THEN v_title := '战斗结果'; v_message := FORMAT('与对手 %s 的战斗惜败。下次加油！', COALESCE(p_opponent_username,'Unknown'));
        ELSE            v_title := '战斗结果'; v_message := FORMAT('与对手 %s 的战斗以平局结束。', COALESCE(p_opponent_username,'Unknown'));
      END CASE;
    WHEN 'es' THEN
      CASE p_outcome
        WHEN 'win'  THEN v_title := '¡Victoria en la batalla!'; v_message := FORMAT('Has ganado la batalla contra %s.', COALESCE(p_opponent_username,'Unknown'));
        WHEN 'lose' THEN v_title := 'Resultado de la batalla'; v_message := FORMAT('Perdiste contra %s. ¡Sigue intentando!', COALESCE(p_opponent_username,'Unknown'));
        ELSE            v_title := 'Resultado de la batalla'; v_message := FORMAT('La batalla contra %s terminó en empate.', COALESCE(p_opponent_username,'Unknown'));
      END CASE;
    WHEN 'pt-BR' THEN
      CASE p_outcome
        WHEN 'win'  THEN v_title := 'Vitória na batalha!'; v_message := FORMAT('Você venceu a batalha contra %s!', COALESCE(p_opponent_username,'Unknown'));
        WHEN 'lose' THEN v_title := 'Resultado da batalha'; v_message := FORMAT('Você perdeu para %s. Tente novamente!', COALESCE(p_opponent_username,'Unknown'));
        ELSE            v_title := 'Resultado da batalha'; v_message := FORMAT('A batalha contra %s terminou em empate.', COALESCE(p_opponent_username,'Unknown'));
      END CASE;
    WHEN 'fr' THEN
      CASE p_outcome
        WHEN 'win'  THEN v_title := 'Victoire !'; v_message := FORMAT('Vous avez remporté la bataille contre %s !', COALESCE(p_opponent_username,'Unknown'));
        WHEN 'lose' THEN v_title := 'Résultat de la bataille'; v_message := FORMAT('Vous avez perdu contre %s. Réessayez !', COALESCE(p_opponent_username,'Unknown'));
        ELSE            v_title := 'Résultat de la bataille'; v_message := FORMAT('La bataille contre %s s\'est terminée par une égalité.', COALESCE(p_opponent_username,'Unknown'));
      END CASE;
    WHEN 'de' THEN
      CASE p_outcome
        WHEN 'win'  THEN v_title := 'Kampf gewonnen!'; v_message := FORMAT('Du hast den Kampf gegen %s gewonnen!', COALESCE(p_opponent_username,'Unknown'));
        WHEN 'lose' THEN v_title := 'Kampfergebnis'; v_message := FORMAT('Du hast gegen %s knapp verloren. Viel Erfolg beim nächsten Mal!', COALESCE(p_opponent_username,'Unknown'));
        ELSE            v_title := 'Kampfergebnis'; v_message := FORMAT('Der Kampf gegen %s endete unentschieden.', COALESCE(p_opponent_username,'Unknown'));
      END CASE;
    ELSE -- 'en'
      CASE p_outcome
        WHEN 'win'  THEN v_title := 'Battle Victory!'; v_message := FORMAT('You won the battle against %s!', COALESCE(p_opponent_username,'Unknown'));
        WHEN 'lose' THEN v_title := 'Battle Result'; v_message := FORMAT('You lost the battle against %s. Try again next time!', COALESCE(p_opponent_username,'Unknown'));
        ELSE            v_title := 'Battle Result'; v_message := FORMAT('Your battle against %s ended in a draw.', COALESCE(p_opponent_username,'Unknown'));
      END CASE;
  END CASE;

  RETURN json_build_object('title', v_title, 'message', v_message);
END;
$$;

COMMENT ON FUNCTION public.get_battle_result_notification_text(TEXT, TEXT, TEXT) IS 'バトル結果通知: 勝敗/言語/相手ユーザー名に応じてタイトル/メッセージを返却';

-- 2) complete_battle_with_video_archiving の通知部を多言語化
CREATE OR REPLACE FUNCTION public.complete_battle_with_video_archiving(
  p_battle_id UUID,
  p_winner_id UUID DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  v_battle_rec active_battles;
  v_archived_battle_id UUID;
  v_player1_video_url TEXT;  
  v_player2_video_url TEXT;
  v_player1_deleted BOOLEAN := FALSE;
  v_player2_deleted BOOLEAN := FALSE;
  v_rating_result JSON;
  v_season_result JSON;
  v_player1_username TEXT;
  v_player2_username TEXT;
  v_player1_language TEXT;
  v_player2_language TEXT;
  v_current_season_id UUID;
  v_json_msg JSON;
  v_player1_outcome TEXT;
  v_player2_outcome TEXT;
BEGIN
  SELECT * INTO v_battle_rec FROM public.active_battles WHERE id = p_battle_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Battle not found');
  END IF;

  SELECT id INTO v_current_season_id FROM public.seasons WHERE status = 'active' ORDER BY start_at DESC LIMIT 1;

  SELECT COALESCE(is_deleted, FALSE), username, language
    INTO v_player1_deleted, v_player1_username, v_player1_language
  FROM public.profiles WHERE id = v_battle_rec.player1_user_id;

  SELECT COALESCE(is_deleted, FALSE), username, language
    INTO v_player2_deleted, v_player2_username, v_player2_language
  FROM public.profiles WHERE id = v_battle_rec.player2_user_id;

  SELECT video_url INTO v_player1_video_url FROM public.submissions WHERE id = v_battle_rec.player1_submission_id;
  SELECT video_url INTO v_player2_video_url FROM public.submissions WHERE id = v_battle_rec.player2_submission_id;

  INSERT INTO public.archived_battles (
    original_battle_id, winner_id, final_votes_a, final_votes_b, battle_format,
    player1_user_id, player2_user_id, player1_submission_id, player2_submission_id,
    player1_video_url, player2_video_url, season_id, archived_at, created_at, updated_at
  ) VALUES (
    p_battle_id, p_winner_id, v_battle_rec.votes_a, v_battle_rec.votes_b, v_battle_rec.battle_format,
    v_battle_rec.player1_user_id, v_battle_rec.player2_user_id, v_battle_rec.player1_submission_id, v_battle_rec.player2_submission_id,
    v_player1_video_url, v_player2_video_url, v_current_season_id, NOW(), NOW(), NOW()
  ) RETURNING id INTO v_archived_battle_id;

  INSERT INTO public.archived_battle_votes (archived_battle_id, user_id, vote, comment, created_at)
  SELECT v_archived_battle_id, bv.user_id, bv.vote, bv.comment, bv.created_at
  FROM public.battle_votes bv
  WHERE bv.battle_id = p_battle_id AND bv.comment IS NOT NULL AND bv.comment != '';

  UPDATE public.submissions
     SET status = 'BATTLE_ENDED', updated_at = NOW()
   WHERE id IN (v_battle_rec.player1_submission_id, v_battle_rec.player2_submission_id);

  SELECT update_battle_ratings_safe(p_battle_id, p_winner_id, v_player1_deleted, v_player2_deleted) INTO v_rating_result;

  BEGIN
    SELECT update_season_points_after_battle(p_battle_id, p_winner_id) INTO v_season_result;
  EXCEPTION WHEN undefined_function THEN
    v_season_result := json_build_object('skipped', true, 'reason', 'function not found');
  END;

  -- 勝敗判定を文字列化
  IF p_winner_id IS NULL THEN
    v_player1_outcome := 'draw';
    v_player2_outcome := 'draw';
  ELSIF p_winner_id = v_battle_rec.player1_user_id THEN
    v_player1_outcome := 'win';
    v_player2_outcome := 'lose';
  ELSIF p_winner_id = v_battle_rec.player2_user_id THEN
    v_player1_outcome := 'lose';
    v_player2_outcome := 'win';
  ELSE
    -- 安全策（理論上到達しない）
    v_player1_outcome := 'draw';
    v_player2_outcome := 'draw';
  END IF;

  -- プレイヤー1通知
  IF NOT v_player1_deleted THEN
    v_json_msg := public.get_battle_result_notification_text(v_player1_outcome, v_player2_username, v_player1_language);
    INSERT INTO public.notifications (user_id, title, message, type, related_battle_id, is_read, created_at, updated_at)
    VALUES (
      v_battle_rec.player1_user_id,
      v_json_msg->>'title',
      v_json_msg->>'message',
      CASE v_player1_outcome WHEN 'win' THEN 'battle_win' WHEN 'lose' THEN 'battle_lose' ELSE 'battle_draw' END,
      p_battle_id,
      false,
      NOW(), NOW()
    );
  END IF;

  -- プレイヤー2通知
  IF NOT v_player2_deleted THEN
    v_json_msg := public.get_battle_result_notification_text(v_player2_outcome, v_player1_username, v_player2_language);
    INSERT INTO public.notifications (user_id, title, message, type, related_battle_id, is_read, created_at, updated_at)
    VALUES (
      v_battle_rec.player2_user_id,
      v_json_msg->>'title',
      v_json_msg->>'message',
      CASE v_player2_outcome WHEN 'win' THEN 'battle_win' WHEN 'lose' THEN 'battle_lose' ELSE 'battle_draw' END,
      p_battle_id,
      false,
      NOW(), NOW()
    );
  END IF;

  DELETE FROM public.active_battles WHERE id = p_battle_id;

  RETURN json_build_object(
    'success', true,
    'archived_battle_id', v_archived_battle_id,
    'winner_id', p_winner_id,
    'season_id', v_current_season_id,
    'final_votes_a', v_battle_rec.votes_a,
    'final_votes_b', v_battle_rec.votes_b,
    'player1_video_url', v_player1_video_url,
    'player2_video_url', v_player2_video_url,
    'player1_deleted', v_player1_deleted,
    'player2_deleted', v_player2_deleted,
    'rating_update', v_rating_result,
    'season_points_update', v_season_result,
    'notifications_sent', CASE 
      WHEN v_player1_deleted AND v_player2_deleted THEN 0
      WHEN v_player1_deleted OR v_player2_deleted THEN 1
      ELSE 2
    END,
    'multilang', true
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'Transaction failed', 'error_details', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.complete_battle_with_video_archiving(UUID, UUID)
IS 'バトル終了処理(多言語通知対応): アーカイブ/レーティング/ポイント/動画/多言語通知';

COMMIT;
