-- 投稿制限を24時間から1時間に変更するマイグレーション
-- 作成日: 2025年7月25日

-- =====================================================
-- 1. check_submission_cooldown関数の更新 (24時間 → 1時間)
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_submission_cooldown(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_last_submission_time TIMESTAMPTZ;
  v_hours_since_last NUMERIC;
  v_cooldown_remaining_minutes INTEGER;
  v_can_submit BOOLEAN;
  v_message TEXT;
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
      'message', '投稿可能です'
    );
  END IF;

  -- 最後の投稿からの経過時間を計算
  v_hours_since_last := EXTRACT(EPOCH FROM (NOW() - v_last_submission_time)) / 3600;
  
  -- 1時間（60分）経過しているかチェック
  IF v_hours_since_last >= 1 THEN
    v_can_submit := true;
    v_cooldown_remaining_minutes := 0;
    v_message := '投稿可能です';
  ELSE
    v_can_submit := false;
    v_cooldown_remaining_minutes := CEIL((1 - v_hours_since_last) * 60);
    v_message := '1時間以内に投稿できるのは1本までです。残り時間: ' || 
                 FLOOR(v_cooldown_remaining_minutes / 60) || '時間' ||
                 (v_cooldown_remaining_minutes % 60) || '分';
  END IF;

  RETURN json_build_object(
    'can_submit', v_can_submit,
    'last_submission_time', v_last_submission_time,
    'hours_since_last', ROUND(v_hours_since_last, 2),
    'cooldown_remaining_minutes', v_cooldown_remaining_minutes,
    'message', v_message
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'can_submit', false,
      'error', 'クールダウンチェック中にエラーが発生しました: ' || SQLERRM,
      'last_submission_time', null,
      'hours_since_last', null,
      'cooldown_remaining_minutes', 0,
      'message', 'エラーが発生しました'
    );
END;
$function$;

-- =====================================================
-- 2. create_submission_with_cooldown_check関数の更新 (24時間 → 1時間)
-- =====================================================

CREATE OR REPLACE FUNCTION create_submission_with_cooldown_check(
  p_user_id uuid,
  p_video_url text,
  p_battle_format text
)
RETURNS json AS $$
DECLARE
  last_submission_time timestamp;
  can_submit_now boolean;
  cooldown_remaining interval;
  new_submission_id uuid;
  result json;
BEGIN
  -- シーズン制限をチェック
  SELECT can_submit_video() INTO can_submit_now;
  
  IF NOT can_submit_now THEN
    RETURN json_build_object(
      'success', false,
      'error', 'season_restriction',
      'message', 'シーズン制限により投稿できません。'
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
      RETURN json_build_object(
        'success', false,
        'error', 'cooldown_active',
        'message', format('1時間以内に投稿できるのは1本までです。次回投稿可能まで: %s', 
          CASE 
            WHEN EXTRACT(EPOCH FROM cooldown_remaining) >= 3600 THEN
              format('%s時間%s分', 
                FLOOR(EXTRACT(EPOCH FROM cooldown_remaining) / 3600),
                FLOOR((EXTRACT(EPOCH FROM cooldown_remaining) % 3600) / 60)
              )
            ELSE
              format('%s分', CEIL(EXTRACT(EPOCH FROM cooldown_remaining) / 60))
          END
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
    'message', '投稿が正常に作成されました。'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'submission_error',
      'message', '投稿作成中にエラーが発生しました: ' || SQLERRM
    );
END;
$$;

-- =====================================================
-- 3. コメントの更新
-- =====================================================

COMMENT ON FUNCTION check_submission_cooldown(uuid) IS '1時間投稿制限チェック関数：ユーザーの最後の投稿から1時間経過したかを確認し、投稿可能性と残り時間を返す';
COMMENT ON FUNCTION create_submission_with_cooldown_check(uuid, text, text) IS '1時間制限チェック付き投稿作成関数：制限チェック後に安全に投稿を作成する';

-- =====================================================
-- インデックスの最適化（1時間制限用）
-- =====================================================

-- 1時間制限用のインデックスを作成（より効率的な検索のため）
DROP INDEX IF EXISTS idx_submissions_user_cooldown;
CREATE INDEX idx_submissions_user_cooldown ON submissions(user_id, created_at)
WHERE created_at > NOW() - INTERVAL '1 hour';
