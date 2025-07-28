-- Migration: バトル投稿停止期間を5日から1日に変更
-- Created: 2025-07-28
-- Description: シーズン終了前のバトル投稿停止期間を5日間から1日間に短縮

-- can_submit_video関数の修正
CREATE OR REPLACE FUNCTION public.can_submit_video()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_active_season RECORD;
  v_season_end_date TIMESTAMPTZ;
BEGIN
  -- アクティブなシーズンを取得
  SELECT * INTO v_active_season
  FROM public.seasons
  WHERE status = 'active'
    AND start_at <= NOW()
    AND end_at >= NOW()
  ORDER BY start_at DESC
  LIMIT 1;
  
  -- アクティブなシーズンが存在しない場合は投稿不可
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- シーズン終了日から1日以内かどうかをチェック
  v_season_end_date := v_active_season.end_at;
  
  -- 現在時刻がシーズン終了1日前以降の場合は投稿不可
  IF NOW() >= (v_season_end_date - INTERVAL '1 day') THEN
    RETURN FALSE;
  END IF;
  
  -- 上記条件を満たさない場合は投稿可能
  RETURN TRUE;
END;
$function$;

-- 関数のコメントを更新
COMMENT ON FUNCTION public.can_submit_video() IS 'シーズンオフ機能: 動画投稿の可否を判定する関数。アクティブなシーズンがない場合や、シーズン終了1日前の場合はFALSEを返す';

-- submit_video関数の修正
CREATE OR REPLACE FUNCTION public.submit_video(
  p_video_url text,
  p_battle_format public.battle_format DEFAULT 'MAIN_BATTLE'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_user_rating INTEGER;
  v_submission_id UUID;
  v_existing_submission RECORD;
  v_active_season RECORD;
  v_match_result JSON;
BEGIN
  -- ユーザー認証チェック
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'authentication_required',
      'message', 'ログインが必要です'
    );
  END IF;

  -- 既存の待機中投稿をチェック
  SELECT * INTO v_existing_submission
  FROM public.submissions
  WHERE user_id = v_user_id 
    AND status = 'WAITING_OPPONENT';

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'already_submitted',
      'message', '既に投稿済みです。マッチングをお待ちください。',
      'existing_submission_id', v_existing_submission.id
    );
  END IF;

  -- シーズン状態チェック
  SELECT * INTO v_active_season
  FROM public.seasons
  WHERE status = 'active'
    AND start_at <= NOW()
    AND end_at >= NOW()
  ORDER BY start_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- アクティブなシーズンがない場合
    RETURN json_build_object(
      'success', false,
      'error', 'no_active_season',
      'message', 'シーズンがオフ期間中のため、新しい動画を投稿することはできません。'
    );
  ELSIF v_active_season.id IS NOT NULL AND NOW() >= (v_active_season.end_at - INTERVAL '1 day') THEN
    -- シーズン終了1日前
    RETURN json_build_object(
      'success', false,
      'error', 'season_ending_soon',
      'message', 'シーズン終了が近づいているため、新しい動画の投稿はできません。次のシーズンまでお待ちください。'
    );
  END IF;

  -- ユーザーの現在のレーティングを取得
  SELECT rating INTO v_user_rating
  FROM public.profiles
  WHERE id = v_user_id;

  -- 投稿を作成
  INSERT INTO public.submissions (
    user_id,
    video_url,
    battle_format,
    rank_at_submission,
    status
  ) VALUES (
    v_user_id,
    p_video_url,
    p_battle_format,
    v_user_rating,
    'WAITING_OPPONENT'
  ) RETURNING id INTO v_submission_id;

  -- 即座にマッチングを試行
  SELECT find_match_and_create_battle(v_submission_id) INTO v_match_result;

  -- マッチング結果に関係なく成功レスポンスを返す
  RETURN json_build_object(
    'success', true,
    'submission_id', v_submission_id,
    'message', '動画が正常に投稿されました',
    'immediate_match_result', v_match_result
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'データベースエラーが発生しました',
      'error_details', SQLERRM
    );
END;
$function$;

-- 関数のコメントを更新
COMMENT ON FUNCTION public.submit_video(text, public.battle_format) IS 'バトル投稿機能（v2.0）- シーズン終了1日前から投稿停止。2025-07-28に修正。';

-- マイグレーション完了ログ
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Battle posting stop period updated from 5 days to 1 day before season end';
END $$;
