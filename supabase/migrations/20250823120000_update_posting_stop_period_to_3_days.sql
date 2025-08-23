-- Migration: バトル投稿停止期間を3日前に変更
-- Created: 2025-08-23
-- Description: シーズン終了前のバトル投稿停止期間を3日間に統一し、get_submission_status関数のバグも修正

-- can_submit_video関数の修正（1日前 → 3日前）
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
  
  -- シーズン終了日から3日以内かどうかをチェック
  v_season_end_date := v_active_season.end_at;
  
  -- 現在時刻がシーズン終了3日前以降の場合は投稿不可
  IF NOW() >= (v_season_end_date - INTERVAL '3 days') THEN
    RETURN FALSE;
  END IF;
  
  -- 上記条件を満たさない場合は投稿可能
  RETURN TRUE;
END;
$function$;

-- 関数のコメントを更新
COMMENT ON FUNCTION public.can_submit_video() IS 'シーズンオフ機能: 動画投稿の可否を判定する関数。アクティブなシーズンがない場合や、シーズン終了3日前の場合はFALSEを返す';

-- get_submission_status関数の修正（5日前のバグ修正 → 3日前）
CREATE OR REPLACE FUNCTION public.get_submission_status()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_active_season RECORD;
  v_upcoming_season RECORD;
  v_can_submit BOOLEAN;
  v_reason TEXT;
  v_next_season_start_date TIMESTAMPTZ;
BEGIN
  -- アクティブなシーズンを取得
  SELECT * INTO v_active_season
  FROM public.seasons
  WHERE status = 'active'
    AND start_at <= NOW()
    AND end_at >= NOW()
  ORDER BY start_at DESC
  LIMIT 1;
  
  -- 次のシーズン（upcoming）を取得
  SELECT * INTO v_upcoming_season
  FROM public.seasons
  WHERE status = 'upcoming'
    AND start_at > NOW()
  ORDER BY start_at ASC
  LIMIT 1;
  
  -- 投稿可否をチェック
  v_can_submit := public.can_submit_video();
  
  -- 理由を設定
  IF v_active_season.id IS NULL THEN
    -- アクティブなシーズンが存在しない
    v_reason := 'SEASON_OFF';
    v_next_season_start_date := v_upcoming_season.start_at;
  ELSIF v_active_season.id IS NOT NULL AND NOW() >= (v_active_season.end_at - INTERVAL '3 days') THEN
    -- シーズン終了3日前
    v_reason := 'ENDING_SOON';
    v_next_season_start_date := v_upcoming_season.start_at;
  ELSE
    -- 投稿可能
    v_reason := NULL;
    v_next_season_start_date := NULL;
  END IF;
  
  RETURN json_build_object(
    'can_submit', v_can_submit,
    'reason', v_reason,
    'active_season', CASE 
      WHEN v_active_season.id IS NOT NULL THEN json_build_object(
        'id', v_active_season.id,
        'name', v_active_season.name,
        'end_at', v_active_season.end_at
      )
      ELSE NULL
    END,
    'next_season_start_date', v_next_season_start_date
  );
END;
$function$;

-- 関数のコメントを更新
COMMENT ON FUNCTION public.get_submission_status() IS 'シーズン状態と投稿可否を取得する関数。シーズン終了3日前から投稿制限を適用';

-- マイグレーション完了ログ
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Battle posting stop period updated to 3 days before season end';
  RAISE NOTICE 'Fixed: get_submission_status function bug (was using 5 days instead of consistent period)';
  RAISE NOTICE 'Both can_submit_video and get_submission_status now use 3 days consistently';
END $$;
