-- 投稿制限関数の多言語化対応
-- データベース関数では翻訳キーを返し、フロントエンド側で翻訳する
-- 作成日: 2025年7月25日

-- =====================================================
-- 1. check_submission_cooldown関数の多言語化対応版
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_submission_cooldown(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  v_last_submission_time TIMESTAMPTZ;
  v_hours_since_last NUMERIC;
  v_cooldown_remaining_minutes INTEGER;
  v_can_submit BOOLEAN;
  v_message_key TEXT;
  v_message_params JSON;
BEGIN
  -- ユーザーの最新の投稿時刻を取得
  SELECT created_at INTO v_last_submission_time
  FROM submissions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- 最初の投稿の場合は投稿可能
  IF v_last_submission_time IS NULL THEN
    RETURN json_build_object(
      'can_submit', true,
      'last_submission_time', null,
      'hours_since_last', null,
      'cooldown_remaining_minutes', 0,
      'message_key', 'submission.cooldown.canSubmit',
      'message_params', json_build_object()
    );
  END IF;

  -- 最後の投稿からの経過時間を計算
  v_hours_since_last := EXTRACT(EPOCH FROM (NOW() - v_last_submission_time)) / 3600;
  
  -- 1時間（60分）経過しているかチェック
  IF v_hours_since_last >= 1 THEN
    v_can_submit := true;
    v_cooldown_remaining_minutes := 0;
    v_message_key := 'submission.cooldown.canSubmit';
    v_message_params := json_build_object();
  ELSE
    v_can_submit := false;
    v_cooldown_remaining_minutes := CEIL((1 - v_hours_since_last) * 60);
    v_message_key := 'submission.cooldown.restriction';
    v_message_params := json_build_object(
      'hours', FLOOR(v_cooldown_remaining_minutes / 60),
      'minutes', v_cooldown_remaining_minutes % 60,
      'totalMinutes', v_cooldown_remaining_minutes
    );
  END IF;

  RETURN json_build_object(
    'can_submit', v_can_submit,
    'last_submission_time', v_last_submission_time,
    'hours_since_last', ROUND(v_hours_since_last, 2),
    'cooldown_remaining_minutes', v_cooldown_remaining_minutes,
    'message_key', v_message_key,
    'message_params', v_message_params
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'can_submit', false,
      'last_submission_time', null,
      'hours_since_last', null,
      'cooldown_remaining_minutes', 0,
      'message_key', 'submission.cooldown.error',
      'message_params', json_build_object('error', SQLERRM)
    );
END;
$$;

-- =====================================================
-- 2. create_submission_with_cooldown_check関数の多言語化対応版
-- =====================================================

CREATE OR REPLACE FUNCTION create_submission_with_cooldown_check(
  p_user_id uuid,
  p_video_url text,
  p_battle_format text
)
RETURNS json 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_submission_time timestamp;
  can_submit_now boolean;
  cooldown_remaining interval;
  new_submission_id uuid;
  remaining_minutes integer;
BEGIN
  -- シーズン制限をチェック
  SELECT can_submit_video() INTO can_submit_now;
  
  IF NOT can_submit_now THEN
    RETURN json_build_object(
      'success', false,
      'error', 'season_restriction',
      'message_key', 'submission.error.seasonRestriction',
      'message_params', json_build_object()
    );
  END IF;
  
  -- 1時間制限をチェック
  SELECT created_at INTO last_submission_time
  FROM submissions
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 hour'
    AND status != 'withdrawn'
  ORDER BY created_at DESC
  LIMIT 1;

  IF last_submission_time IS NOT NULL THEN
    cooldown_remaining := (last_submission_time + INTERVAL '1 hour') - NOW();
    
    IF cooldown_remaining > INTERVAL '0' THEN
      remaining_minutes := CEIL(EXTRACT(EPOCH FROM cooldown_remaining) / 60);
      
      RETURN json_build_object(
        'success', false,
        'error', 'cooldown_active',
        'message_key', 'submission.error.cooldownActive',
        'message_params', json_build_object(
          'hours', FLOOR(EXTRACT(EPOCH FROM cooldown_remaining) / 3600),
          'minutes', FLOOR((EXTRACT(EPOCH FROM cooldown_remaining) % 3600) / 60),
          'totalMinutes', remaining_minutes
        ),
        'remaining_seconds', EXTRACT(EPOCH FROM cooldown_remaining)
      );
    END IF;
  END IF;

  -- 投稿を作成
  INSERT INTO submissions (
    user_id, 
    video_url, 
    battle_format, 
    created_at,
    status
  ) VALUES (
    p_user_id, 
    p_video_url, 
    p_battle_format::battle_format,
    NOW(),
    'WAITING_OPPONENT'
  ) RETURNING id INTO new_submission_id;

  RETURN json_build_object(
    'success', true,
    'submission_id', new_submission_id,
    'message_key', 'submission.success.created',
    'message_params', json_build_object()
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'submission_error',
      'message_key', 'submission.error.creationFailed',
      'message_params', json_build_object('error', SQLERRM)
    );
END;
$$;

-- =====================================================
-- 3. コメントの更新
-- =====================================================

COMMENT ON FUNCTION check_submission_cooldown(uuid) IS '1時間投稿制限チェック関数（多言語対応）：翻訳キーとパラメータを返す';
COMMENT ON FUNCTION create_submission_with_cooldown_check(uuid, text, text) IS '1時間制限チェック付き投稿作成関数（多言語対応）：翻訳キーとパラメータを返す';
