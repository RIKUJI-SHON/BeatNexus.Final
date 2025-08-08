-- 20250808_create_battles_generation_helper.sql
-- 目的: 検証や運用確認のため、アクティブシーズンに対して複数のバトルを一括生成し、
--       即時にアーカイブ（complete_battle_with_video_archiving）まで行う補助関数を追加する。
-- 注意: 既存スキーマ/関数に依存（submissions, active_battles, complete_battle_with_video_archiving）。

BEGIN;

-- JSONペイロード例:
-- [
--   { "player1": "<uuid>", "player2": "<uuid>", "votes_a": 10, "votes_b": 8, "battle_format": "MAIN_BATTLE" },
--   { "player1": "<uuid>", "player2": "<uuid>", "votes_a": 6,  "votes_b": 12 }
-- ]
-- battle_format 省略時は 'MAIN_BATTLE'

CREATE OR REPLACE FUNCTION public.generate_archived_battles_for_active_season(
  p_pairs jsonb
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  v_active_season RECORD;
  v_item jsonb;
  v_p1 uuid; v_p2 uuid;
  v_votes_a int; v_votes_b int;
  v_format public.battle_format;
  v_sub1 uuid; v_sub2 uuid;
  v_battle_id uuid;
  v_winner uuid;
  v_results jsonb[] := ARRAY[]::jsonb[];
  v_success int := 0; v_errors int := 0;
BEGIN
  -- アクティブシーズン必須
  SELECT * INTO v_active_season
  FROM seasons
  WHERE status = 'active'
  ORDER BY start_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'no_active_season', 'message', 'アクティブなシーズンが存在しません');
  END IF;

  IF p_pairs IS NULL OR jsonb_typeof(p_pairs) <> 'array' THEN
    RETURN json_build_object('success', false, 'error', 'invalid_input', 'message', 'p_pairs はJSON配列で指定してください');
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(p_pairs)
  LOOP
    BEGIN
      v_p1 := (v_item->>'player1')::uuid;
      v_p2 := (v_item->>'player2')::uuid;
      v_votes_a := COALESCE((v_item->>'votes_a')::int, 0);
      v_votes_b := COALESCE((v_item->>'votes_b')::int, 0);
      v_format := COALESCE((v_item->>'battle_format')::public.battle_format, 'MAIN_BATTLE'::public.battle_format);

      -- submissions 作成（最小カラム + 仕様準拠のステータス）
      INSERT INTO public.submissions (user_id, video_url, battle_format, status)
      VALUES (v_p1, CONCAT('https://example.com/video/', gen_random_uuid(), '.mp4'), v_format, 'MATCHED_IN_BATTLE')
      RETURNING id INTO v_sub1;

      INSERT INTO public.submissions (user_id, video_url, battle_format, status)
      VALUES (v_p2, CONCAT('https://example.com/video/', gen_random_uuid(), '.mp4'), v_format, 'MATCHED_IN_BATTLE')
      RETURNING id INTO v_sub2;

      -- active_battles 作成
      INSERT INTO public.active_battles (
        player1_submission_id, player2_submission_id, battle_format, status, votes_a, votes_b, end_voting_at,
        player1_user_id, player2_user_id
      ) VALUES (
        v_sub1, v_sub2, v_format, 'ACTIVE', v_votes_a, v_votes_b, NOW() + interval '10 minutes',
        v_p1, v_p2
      ) RETURNING id INTO v_battle_id;

      -- submissions とバトルの紐付け
      UPDATE public.submissions
      SET active_battle_id = v_battle_id
      WHERE id IN (v_sub1, v_sub2);

      -- 勝者決定
      IF v_votes_a > v_votes_b THEN
        v_winner := v_p1;
      ELSIF v_votes_b > v_votes_a THEN
        v_winner := v_p2;
      ELSE
        v_winner := NULL; -- 引き分け
      END IF;

      -- アーカイブ処理（ratings/season_points更新含む）
      PERFORM public.complete_battle_with_video_archiving(v_battle_id, v_winner);

      v_success := v_success + 1;
      v_results := v_results || jsonb_build_object(
        'battle_id', v_battle_id,
        'player1', v_p1,
        'player2', v_p2,
        'votes_a', v_votes_a,
        'votes_b', v_votes_b,
        'winner_id', v_winner
      );
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      v_results := v_results || jsonb_build_object(
        'error', SQLERRM,
        'pair', v_item
      );
    END;
  END LOOP;

  RETURN json_build_object(
    'success', (v_errors = 0),
    'created', v_success,
    'errors', v_errors,
    'details', v_results
  );
END;
$$;

COMMENT ON FUNCTION public.generate_archived_battles_for_active_season(jsonb)
IS '指定ペアに対して active_battles を作成し、complete_battle_with_video_archiving() で即時アーカイブまで実施する補助関数。アクティブシーズン必須。';

COMMIT;
