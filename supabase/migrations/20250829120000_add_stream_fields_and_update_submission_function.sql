-- Cloudflare Stream 移行: submissions拡張 + RPC関数拡張（後方互換）
-- created_at: 2025-08-29 12:00:00

-- 1) submissions テーブルに Stream 関連カラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'submissions' AND column_name = 'stream_video_id'
  ) THEN
    ALTER TABLE public.submissions 
      ADD COLUMN stream_video_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'submissions' AND column_name = 'stream_status'
  ) THEN
    -- 状態: uploading | processing | ready | error
    ALTER TABLE public.submissions 
      ADD COLUMN stream_status TEXT CHECK (stream_status IN ('uploading','processing','ready','error'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'submissions' AND column_name = 'stream_thumbnail_url'
  ) THEN
    ALTER TABLE public.submissions 
      ADD COLUMN stream_thumbnail_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'submissions' AND column_name = 'stream_preview_url'
  ) THEN
    ALTER TABLE public.submissions 
      ADD COLUMN stream_preview_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'submissions' AND column_name = 'stream_error_message'
  ) THEN
    ALTER TABLE public.submissions 
      ADD COLUMN stream_error_message TEXT;
  END IF;
END $$;

-- 2) インデックス（存在しない場合のみ作成）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'idx_submissions_stream_video_id' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_submissions_stream_video_id ON public.submissions(stream_video_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'idx_submissions_stream_status' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_submissions_stream_status ON public.submissions(stream_status);
  END IF;
END $$;

-- 3) create_submission_with_cooldown_check 関数の拡張
-- 既存シグネチャ: (p_user_id uuid, p_video_url text, p_battle_format text)
-- 新シグネチャ: (p_user_id uuid, p_video_url text, p_battle_format text, p_stream_video_id text DEFAULT NULL)
-- 既存呼び出しはそのまま動作（第4引数省略可）

CREATE OR REPLACE FUNCTION public.create_submission_with_cooldown_check(
  p_user_id uuid,
  p_video_url text,
  p_battle_format text,
  p_stream_video_id text DEFAULT NULL
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
  v_final_video_url text;
  v_initial_stream_status text;
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
  FROM public.submissions
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

  -- Stream利用時は video_url を Cloudflare MP4 にフォールバック（互換性維持）
  IF p_stream_video_id IS NOT NULL AND LENGTH(TRIM(p_stream_video_id)) > 0 THEN
    v_final_video_url := 'https://videodelivery.net/' || p_stream_video_id || '/mp4';
    -- アップロード完了直後はエンコード中の可能性が高い
    v_initial_stream_status := 'processing';
  ELSE
    v_final_video_url := p_video_url;
    v_initial_stream_status := NULL;
  END IF;

  -- 投稿を作成
  INSERT INTO public.submissions (
    user_id,
    video_url,
    battle_format,
    created_at,
    status,
    stream_video_id,
    stream_status
  ) VALUES (
    p_user_id,
    v_final_video_url,
    p_battle_format::public.battle_format,
    NOW(),
    'WAITING_OPPONENT',
    p_stream_video_id,
    v_initial_stream_status
  ) RETURNING id INTO new_submission_id;

  RETURN json_build_object(
    'success', true,
    'submission_id', new_submission_id,
    'message_key', 'submission.success.created',
    'message_params', json_build_object()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'submission_error',
    'message_key', 'submission.error.creationFailed',
    'message_params', json_build_object('error', SQLERRM)
  );
END;
$$;

COMMENT ON FUNCTION public.create_submission_with_cooldown_check(uuid, text, text, text) IS 'Cloudflare Stream対応: 第4引数にstream_video_id（省略可）を追加し、video_urlにはCloudflare MP4 URLを自動設定（後方互換）';
