

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."battle_format" AS ENUM (
    'MAIN_BATTLE',
    'MINI_BATTLE',
    'THEME_CHALLENGE'
);


ALTER TYPE "public"."battle_format" OWNER TO "postgres";


CREATE TYPE "public"."battle_status" AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'PROCESSING_RESULTS'
);


ALTER TYPE "public"."battle_status" OWNER TO "postgres";


CREATE TYPE "public"."community_role" AS ENUM (
    'owner',
    'admin',
    'member'
);


ALTER TYPE "public"."community_role" OWNER TO "postgres";


CREATE TYPE "public"."submission_status" AS ENUM (
    'WAITING_OPPONENT',
    'MATCHED_IN_BATTLE',
    'BATTLE_ENDED',
    'WITHDRAWN'
);


ALTER TYPE "public"."submission_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ad_serve_candidates"("p_placement_key" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_anon_id" "text" DEFAULT NULL::"text", "p_country" "text" DEFAULT NULL::"text", "p_language" "text" DEFAULT NULL::"text", "p_device" "text" DEFAULT NULL::"text") RETURNS TABLE("flight_id" "uuid", "placement_id" "uuid", "creative_id" "uuid", "weight" integer, "daily_cap" integer, "imp_goal" integer, "targeting_json" "jsonb", "creative_headline" "text", "creative_body" "text", "creative_cta_text" "text", "creative_file_url" "text", "creative_target_url" "text", "user_today_imps" integer, "total_imps" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  with placement as (
    select id from ad_placements where key = p_placement_key and is_active = true limit 1
  ), base as (
    select f.id as flight_id,
           f.placement_id,
           c.id as creative_id,
           f.weight,
           f.daily_cap,
           f.imp_goal,
           f.targeting_json,
           cr.headline as creative_headline,
           cr.body as creative_body,
           cr.cta_text as creative_cta_text,
           cr.file_url as creative_file_url,
           cr.target_url as creative_target_url
    from placement p
    join ad_flights f on f.placement_id = p.id
    join ad_campaigns c on c.id = f.campaign_id
    join ad_creatives cr on cr.campaign_id = c.id
    where c.status = 'active'
      and current_date between c.start_date and c.end_date
      and (
        f.targeting_json is null
        or (
          (
            p_country is null
            or (f.targeting_json ? 'countries' = false)
            or (exists (
                 select 1 from jsonb_array_elements_text(f.targeting_json->'countries') t(val)
                 where lower(val) = lower(p_country)
               ))
          )
          and (
            p_language is null
            or (f.targeting_json ? 'languages' = false)
            or (exists (
                 select 1 from jsonb_array_elements_text(f.targeting_json->'languages') t(val)
                 where lower(val) = lower(p_language)
               ))
          )
          and (
            p_device is null
            or (f.targeting_json ? 'devices' = false)
            or (exists (
                 select 1 from jsonb_array_elements_text(f.targeting_json->'devices') t(val)
                 where lower(val) = lower(p_device)
               ))
          )
        )
      )
  ), user_imp as (
    select e.flight_id, count(*)::int as user_today_imps
    from ad_events e
    where e.type = 'impression'
      and e.flight_id in (select flight_id from base)
      and e.occurred_at >= date_trunc('day', now())
      and (
        (p_user_id is not null and e.user_id = p_user_id)
        or (p_user_id is null and p_anon_id is not null and e.anon_session_id = p_anon_id)
      )
    group by e.flight_id
  ), total_imp as (
    select e.flight_id, count(*)::bigint as total_imps
    from ad_events e
    where e.type = 'impression'
      and e.flight_id in (select flight_id from base)
    group by e.flight_id
  )
  select b.flight_id,
         b.placement_id,
         b.creative_id,
         b.weight,
         b.daily_cap,
         b.imp_goal,
         b.targeting_json,
         b.creative_headline,
         b.creative_body,
         b.creative_cta_text,
         b.creative_file_url,
         b.creative_target_url,
         coalesce(u.user_today_imps, 0) as user_today_imps,
         coalesce(t.total_imps, 0) as total_imps
  from base b
  left join user_imp u on u.flight_id = b.flight_id
  left join total_imp t on t.flight_id = b.flight_id;
$$;


ALTER FUNCTION "public"."ad_serve_candidates"("p_placement_key" "text", "p_user_id" "uuid", "p_anon_id" "text", "p_country" "text", "p_language" "text", "p_device" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."ad_serve_candidates"("p_placement_key" "text", "p_user_id" "uuid", "p_anon_id" "text", "p_country" "text", "p_language" "text", "p_device" "text") IS 'Return candidate ad flights (already filtered by placement, campaign status/date, basic targeting) with per-user today & total impression counts. Filtering by caps left to caller.';



CREATE OR REPLACE FUNCTION "public"."admin_force_release_email"("p_email" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_user_count INTEGER;
  v_timestamp BIGINT;
BEGIN
  -- 指定されたメールアドレスを使用しているユーザー数を確認
  SELECT COUNT(*) INTO v_user_count
  FROM auth.users 
  WHERE email = p_email;
  
  IF v_user_count = 0 THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Email address is already available',
      'email', p_email
    );
  END IF;
  
  v_timestamp := EXTRACT(EPOCH FROM NOW())::BIGINT;
  
  -- 該当するauth.usersレコードを完全に匿名化
  UPDATE auth.users
  SET 
    email = 'force-released-' || v_timestamp || '-' || SUBSTRING(id::text, 1, 8) || '@admin.released',
    raw_user_meta_data = jsonb_build_object(
      'admin_force_released', true,
      'release_timestamp', v_timestamp,
      'original_email_force_released', p_email,
      'release_method', 'admin_force_release'
    ),
    updated_at = NOW()
  WHERE email = p_email;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Email address forcefully released',
    'email', p_email,
    'affected_users', v_user_count,
    'timestamp', v_timestamp
  );
END;
$$;


ALTER FUNCTION "public"."admin_force_release_email"("p_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_force_release_email"("p_email" "text") IS '管理者用: 特定のメールアドレスを強制的に解放する関数';



CREATE OR REPLACE FUNCTION "public"."admin_force_release_email_v2"("p_email" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_user_count INTEGER;
  v_identity_count INTEGER;
  v_timestamp BIGINT;
BEGIN
  -- 指定されたメールアドレスを使用しているユーザー数を確認
  SELECT COUNT(*) INTO v_user_count
  FROM auth.users 
  WHERE email = p_email;
  
  -- identitiesテーブルの該当データ数も確認
  SELECT COUNT(*) INTO v_identity_count
  FROM auth.identities 
  WHERE provider_id = p_email 
     OR identity_data::text LIKE '%' || p_email || '%';
  
  IF v_user_count = 0 AND v_identity_count = 0 THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Email address is already completely available',
      'email', p_email
    );
  END IF;
  
  v_timestamp := EXTRACT(EPOCH FROM NOW())::BIGINT;
  
  -- 該当するauth.usersレコードを完全に匿名化
  UPDATE auth.users
  SET 
    email = 'force-released-' || v_timestamp || '-' || SUBSTRING(id::text, 1, 8) || '@admin.released',
    raw_user_meta_data = jsonb_build_object(
      'admin_force_released', true,
      'release_timestamp', v_timestamp,
      'original_email_force_released', p_email,
      'release_method', 'admin_force_release_v2'
    ),
    updated_at = NOW()
  WHERE email = p_email;
  
  -- 🆕 auth.identitiesからも完全削除
  DELETE FROM auth.identities 
  WHERE provider_id = p_email 
     OR identity_data::text LIKE '%' || p_email || '%';
  
  RETURN json_build_object(
    'success', true,
    'message', 'Email address forcefully released (including identities)',
    'email', p_email,
    'affected_users', v_user_count,
    'affected_identities', v_identity_count,
    'timestamp', v_timestamp
  );
END;
$$;


ALTER FUNCTION "public"."admin_force_release_email_v2"("p_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_force_release_email_v2"("p_email" "text") IS '管理者用v2: auth.identitiesも含む特定メールアドレスの強制解放';



CREATE OR REPLACE FUNCTION "public"."app_role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', 'end_user');
$$;


ALTER FUNCTION "public"."app_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_release_deleted_emails"() RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_user_record RECORD;
  v_timestamp BIGINT;
  v_new_email TEXT;
BEGIN
  -- deleted@example.com 形式のメールアドレスを一意な形式に変換
  FOR v_user_record IN
    SELECT id, email 
    FROM auth.users 
    WHERE email = 'deleted@example.com'
      AND (raw_user_meta_data->>'email_immediately_released')::boolean IS NOT TRUE
    LIMIT 100  -- 一度に処理する件数を制限
  LOOP
    -- タイムスタンプ付きの新しいメールアドレスを生成
    v_timestamp := EXTRACT(EPOCH FROM NOW())::BIGINT;
    v_new_email := 'deleted-' || SUBSTRING(v_user_record.id::text, 1, 8) || '-' || v_timestamp || '@deleted.local';
    
    -- auth.users テーブルを更新
    UPDATE auth.users
    SET 
      email = v_new_email,
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
          'email_auto_released_at', NOW()::text,
          'email_immediately_released', true,
          'auto_release_timestamp', v_timestamp,
          'previous_email', v_user_record.email
        ),
      updated_at = NOW()
    WHERE id = v_user_record.id;
    
    -- profilesテーブルも更新
    UPDATE profiles
    SET 
      email = v_new_email,
      updated_at = NOW()
    WHERE id = v_user_record.id;
    
    v_updated_count := v_updated_count + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'message', 'Email addresses auto-released for reuse'
  );
END;
$$;


ALTER FUNCTION "public"."auto_release_deleted_emails"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_set_user_language"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  -- 新規作成時にlanguageがNULLの場合、デフォルトで英語を設定
  IF NEW.language IS NULL THEN
    NEW.language := 'en';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_set_user_language"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_elo_rating"("winner_rating" integer, "loser_rating" integer, "k_factor" integer DEFAULT 32) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  expected_winner NUMERIC;
  expected_loser NUMERIC;
  new_winner_rating INTEGER;
  new_loser_rating INTEGER;
BEGIN
  -- Calculate expected scores (probability of winning)
  expected_winner := 1.0 / (1.0 + power(10.0, (loser_rating - winner_rating) / 400.0));
  expected_loser := 1.0 / (1.0 + power(10.0, (winner_rating - loser_rating) / 400.0));
  
  -- Calculate new ratings
  new_winner_rating := winner_rating + k_factor * (1.0 - expected_winner);
  new_loser_rating := loser_rating + k_factor * (0.0 - expected_loser);
  
  -- Ensure ratings don't go below minimum (1100) - Updated from 800
  new_winner_rating := GREATEST(new_winner_rating, 1100);
  new_loser_rating := GREATEST(new_loser_rating, 1100);
  
  RETURN json_build_object(
    'winner_rating', new_winner_rating,
    'loser_rating', new_loser_rating,
    'rating_change_winner', new_winner_rating - winner_rating,
    'rating_change_loser', new_loser_rating - loser_rating
  );
END;
$$;


ALTER FUNCTION "public"."calculate_elo_rating"("winner_rating" integer, "loser_rating" integer, "k_factor" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_elo_rating_change"("player_rating" integer, "opponent_rating" integer, "result" numeric, "k_factor" integer DEFAULT 32) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  expected_score NUMERIC;
  rating_change INTEGER;
BEGIN
  -- 期待勝率を計算 (Elo Rating System)
  expected_score := 1.0 / (1.0 + POWER(10.0, (opponent_rating - player_rating) / 400.0));
  
  -- レーティング変動を計算
  rating_change := ROUND(k_factor * (result - expected_score));
  
  RETURN rating_change;
END;
$$;


ALTER FUNCTION "public"."calculate_elo_rating_change"("player_rating" integer, "opponent_rating" integer, "result" numeric, "k_factor" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_elo_rating_with_format"("winner_rating" integer, "loser_rating" integer, "battle_format" "text" DEFAULT 'MAIN_BATTLE'::"text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  k_factor INTEGER;
  expected_winner NUMERIC;
  expected_loser NUMERIC;
  new_winner_rating INTEGER;
  new_loser_rating INTEGER;
BEGIN
  k_factor := get_k_factor_by_format(battle_format);
  expected_winner := 1.0 / (1.0 + power(10.0, (loser_rating - winner_rating) / 400.0));
  expected_loser := 1.0 / (1.0 + power(10.0, (winner_rating - loser_rating) / 400.0));
  new_winner_rating := winner_rating + k_factor * (1.0 - expected_winner);
  new_loser_rating := loser_rating + k_factor * (0.0 - expected_loser);
  new_winner_rating := GREATEST(new_winner_rating, 1100);
  new_loser_rating := GREATEST(new_loser_rating, 1100);
  RETURN json_build_object(
    'winner_rating', new_winner_rating,
    'loser_rating', new_loser_rating,
    'rating_change_winner', new_winner_rating - winner_rating,
    'rating_change_loser', new_loser_rating - loser_rating,
    'k_factor_used', k_factor,
    'battle_format', battle_format
  );
END;
$$;


ALTER FUNCTION "public"."calculate_elo_rating_with_format"("winner_rating" integer, "loser_rating" integer, "battle_format" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_elo_rating_with_format"("winner_rating" integer, "loser_rating" integer, "battle_format" "text") IS 'v2: Matches production. Calculates ELO rating with K-factor based on text battle_format.';



CREATE OR REPLACE FUNCTION "public"."calculate_tie_rating_with_format"("player1_rating" integer, "player2_rating" integer, "battle_format" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  k_factor INTEGER;
  player1_change INTEGER;
  player2_change INTEGER;
  new_player1_rating INTEGER;
  new_player2_rating INTEGER;
BEGIN
  k_factor := get_k_factor_by_format(battle_format);
  player1_change := calculate_elo_rating_change(player1_rating, player2_rating, 0.5, k_factor);
  player2_change := calculate_elo_rating_change(player2_rating, player1_rating, 0.5, k_factor);
  new_player1_rating := GREATEST(player1_rating + player1_change, 1100);
  new_player2_rating := GREATEST(player2_rating + player2_change, 1100);
  RETURN json_build_object(
    'player1_rating', new_player1_rating,
    'player2_rating', new_player2_rating,
    'player1_change', new_player1_rating - player1_rating,
    'player2_change', new_player2_rating - player2_rating,
    'k_factor_used', k_factor,
    'battle_format', battle_format
  );
END;
$$;


ALTER FUNCTION "public"."calculate_tie_rating_with_format"("player1_rating" integer, "player2_rating" integer, "battle_format" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_tie_rating_with_format"("player1_rating" integer, "player2_rating" integer, "battle_format" "text") IS 'v2: Matches production. Calculates tie rating with K-factor based on text battle_format.';



CREATE OR REPLACE FUNCTION "public"."call_edge_function"("function_name" "text", "payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  edge_function_url text;
BEGIN
  -- Edge Function のURL を構築
  edge_function_url := 'https://qgqcjtjxaoplhxurbpis.supabase.co/functions/v1/' || function_name;

  -- HTTP POST でEdge Functionを呼び出し（非同期）
  -- NOTE: http 拡張を使用
  PERFORM net.http_post(
    url := edge_function_url,
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::jsonb->>'aud'
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  -- エラーが発生してもトリガー処理は継続
  RAISE LOG 'Failed to call edge function %: %', function_name, SQLERRM;
END;
$$;


ALTER FUNCTION "public"."call_edge_function"("function_name" "text", "payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_submit_video"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
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
$$;


ALTER FUNCTION "public"."can_submit_video"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_submit_video"() IS 'シーズンオフ機能: 動画投稿の可否を判定する関数。アクティブなシーズンがない場合や、シーズン終了1日前の場合はFALSEを返す';



CREATE OR REPLACE FUNCTION "public"."cancel_vote"("p_battle_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote CHAR(1);
  v_existing_season_id UUID;
  v_existing_comment TEXT;
  v_has_comment BOOLEAN := FALSE;
  v_vote_points_decrement INTEGER := 0;
  v_vote_count_decrement INTEGER := 0;  -- 🆕 通算投票カウント減算用の変数
  v_current_season_id UUID;
  v_debug_info JSON;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- 既存の投票情報を取得（コメントの有無も確認）
  SELECT vote, season_id, comment 
  INTO v_existing_vote, v_existing_season_id, v_existing_comment
  FROM battle_votes
  WHERE battle_id = p_battle_id AND user_id = v_user_id;

  IF v_existing_vote IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No vote to cancel');
  END IF;

  -- コメントの有無を判定
  v_has_comment := v_existing_comment IS NOT NULL AND LENGTH(TRIM(v_existing_comment)) > 0;

  -- アクティブシーズンを取得
  BEGIN
    SELECT id INTO v_current_season_id 
    FROM public.seasons 
    WHERE status = 'active'
      AND start_at <= NOW()
      AND end_at >= NOW()
    ORDER BY start_at DESC
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_current_season_id := NULL;
  END;

  -- ポイント減算量を決定
  IF v_existing_season_id IS NOT NULL THEN
    IF v_has_comment THEN
      -- 🔧 修正: コメント付き投票の取り消し: シーズンポイント-3、通算投票カウント-3
      v_vote_points_decrement := 3;
      v_vote_count_decrement := 3;
    ELSE
      -- 普通の投票の取り消し: シーズンポイント-1、通算投票カウント-1
      v_vote_points_decrement := 1;
      v_vote_count_decrement := 1;
    END IF;
  ELSE
    -- シーズンIDがない場合はシーズンポイント減算なし、通算投票カウントのみ-1
    v_vote_points_decrement := 0;
    v_vote_count_decrement := 1;
  END IF;

  -- デバッグ情報を作成
  v_debug_info := json_build_object(
    'has_comment', v_has_comment,
    'comment_length', COALESCE(LENGTH(v_existing_comment), 0),
    'vote_points_decrement', v_vote_points_decrement,
    'vote_count_decrement', v_vote_count_decrement,  -- 🆕 通算投票カウント減算量
    'existing_season_id', v_existing_season_id,
    'current_season_id', v_current_season_id,
    'vote_type', CASE WHEN v_has_comment THEN 'comment_vote' ELSE 'simple_vote' END,
    'current_time', NOW()
  );

  -- 投票を削除
  DELETE FROM battle_votes
  WHERE battle_id = p_battle_id AND user_id = v_user_id;

  -- バトルの投票数を更新
  IF v_existing_vote = 'A' THEN
    UPDATE active_battles SET votes_a = votes_a - 1 WHERE id = p_battle_id;
  ELSE
    UPDATE active_battles SET votes_b = votes_b - 1 WHERE id = p_battle_id;
  END IF;

  -- 🔧 修正: ユーザーの投票数を更新（コメント有無に応じた適切なポイント減算）
  IF v_existing_season_id IS NOT NULL THEN
    UPDATE profiles 
    SET 
      vote_count = GREATEST(0, vote_count - v_vote_count_decrement),  -- 🔧 修正: コメント有無に応じた減算
      season_vote_points = GREATEST(0, season_vote_points - v_vote_points_decrement),
      updated_at = NOW()
    WHERE id = v_user_id;
  ELSE
    -- シーズンIDがない場合は通算投票数のみ減算
    UPDATE profiles 
    SET 
      vote_count = GREATEST(0, vote_count - v_vote_count_decrement),  -- 🔧 修正: コメント有無に応じた減算
      updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  RETURN json_build_object(
    'success', true, 
    'cancelled_vote', v_existing_vote,
    'had_comment', v_has_comment,
    'comment_preview', CASE 
      WHEN v_has_comment THEN LEFT(v_existing_comment, 50) || '...'
      ELSE NULL 
    END,
    'vote_points_deducted', v_vote_points_decrement,
    'vote_count_deducted', v_vote_count_decrement,  -- 🆕 通算投票カウント減算量
    'had_season_id', v_existing_season_id IS NOT NULL,
    'season_id', v_existing_season_id,
    'vote_type', CASE WHEN v_has_comment THEN 'comment_vote' ELSE 'simple_vote' END,
    'debug', v_debug_info
  );
END;
$$;


ALTER FUNCTION "public"."cancel_vote"("p_battle_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cancel_vote"("p_battle_id" "uuid") IS 'v3 (Fixed Vote Count): Cancel vote with appropriate point deduction - both vote_count and season_vote_points follow comment bonus rules (-3 for comment votes, -1 for simple votes)';



CREATE OR REPLACE FUNCTION "public"."check_phone_availability"("phone_input" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  normalized_phone TEXT;
  existing_count INTEGER;
  rate_limit_result JSON;
  phone_hash TEXT;
BEGIN
  IF phone_input IS NULL OR trim(phone_input) = '' THEN
    RETURN json_build_object(
      'available', false,
      'error', 'invalid_input',
      'message', '電話番号が入力されていません。'
    );
  END IF;
  
  normalized_phone := normalize_phone_number(phone_input);
  
  IF normalized_phone IS NULL THEN
    RETURN json_build_object(
      'available', false,
      'error', 'invalid_format',
      'message', '電話番号の形式が正しくありません。'
    );
  END IF;
  
  rate_limit_result := check_rate_limit(normalized_phone);
  IF (rate_limit_result->>'allowed')::boolean = false THEN
    RETURN json_build_object(
      'available', false,
      'error', 'rate_limit_exceeded',
      'message', rate_limit_result->>'message'
    );
  END IF;
  
  SELECT COUNT(*) INTO existing_count
  FROM phone_verifications 
  WHERE phone_number = normalized_phone 
    AND is_active = true;
  
  IF existing_count > 0 THEN
    -- ハッシュ化を事前に行う（byteaキャスト付き）
    phone_hash := encode(sha256(normalized_phone::bytea), 'hex');
    
    PERFORM log_security_event(
      'PHONE_DUPLICATE_ATTEMPT',
      NULL,
      normalized_phone,
      json_build_object(
        'phone_number_hash', phone_hash,
        'normalized_phone', normalized_phone,
        'attempt_count', existing_count
      )::jsonb
    );
    
    RETURN json_build_object(
      'available', false,
      'error', 'phone_already_registered',
      'message', 'この電話番号は既に他のアカウントで使用されています。別の電話番号をお試しください。'
    );
  END IF;
  
  -- ハッシュ化を事前に行う（byteaキャスト付き）
  phone_hash := encode(sha256(normalized_phone::bytea), 'hex');
  
  PERFORM log_audit_event(
    'phone_verifications',
    'CHECK_AVAILABILITY',
    NULL,
    json_build_object(
      'phone_number_hash', phone_hash,
      'result', 'available'
    )::jsonb
  );
  
  RETURN json_build_object(
    'available', true,
    'message', '電話番号は利用可能です。',
    'normalized_phone', normalized_phone
  );
  
EXCEPTION
  WHEN others THEN
    PERFORM log_audit_event(
      'phone_verifications',
      'CHECK_AVAILABILITY',
      NULL,
      json_build_object(
        'error', SQLERRM,
        'sqlstate', SQLSTATE
      )::jsonb,
      false,
      SQLERRM
    );
    
    RETURN json_build_object(
      'available', false,
      'error', 'system_error',
      'message', 'システムエラーが発生しました。しばらくしてからお試しください。'
    );
END;
$$;


ALTER FUNCTION "public"."check_phone_availability"("phone_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("phone_number" "text") RETURNS "json"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  attempt_count INTEGER;
  last_attempt TIMESTAMP WITH TIME ZONE;
  phone_hash TEXT;
BEGIN
  -- 電話番号のハッシュ化を事前に行う（byteaキャスト付き）
  phone_hash := encode(sha256(phone_number::bytea), 'hex');
  
  SELECT COUNT(*), MAX(created_at)
  INTO attempt_count, last_attempt
  FROM audit_logs
  WHERE details->>'phone_number_hash' = phone_hash
    AND action = 'SEND_SMS'
    AND created_at > NOW() - INTERVAL '1 hour';
  
  IF attempt_count >= 3 THEN
    PERFORM log_security_event(
      'RATE_LIMIT_EXCEEDED',
      NULL,
      phone_number,
      json_build_object(
        'attempt_count', attempt_count,
        'last_attempt', last_attempt,
        'limit_period', '1 hour'
      )::jsonb
    );
    
    RETURN json_build_object(
      'allowed', false,
      'message', 'SMS送信の制限に達しました。1時間後に再度お試しください。',
      'retry_after', EXTRACT(EPOCH FROM (last_attempt + INTERVAL '1 hour' - NOW()))
    );
  END IF;
  
  RETURN json_build_object(
    'allowed', true,
    'remaining_attempts', 3 - attempt_count
  );
END;
$$;


ALTER FUNCTION "public"."check_rate_limit"("phone_number" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_submission_cooldown"("p_user_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
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


ALTER FUNCTION "public"."check_submission_cooldown"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_submission_cooldown"("p_user_id" "uuid") IS '1時間投稿制限チェック関数：ユーザーの最後の投稿から1時間経過したかを確認し、投稿可能性と残り時間を返す';



CREATE OR REPLACE FUNCTION "public"."cleanup_all_deleted_user_videos"() RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_deleted_user RECORD;
  v_cleanup_result JSON;
  v_total_videos_deleted INTEGER := 0;
  v_total_videos_failed INTEGER := 0;
  v_processed_users INTEGER := 0;
BEGIN
  -- 削除済みユーザーをループ処理
  FOR v_deleted_user IN
    SELECT id 
    FROM profiles 
    WHERE is_deleted = TRUE
    LIMIT 50  -- 一度に処理するユーザー数を制限
  LOOP
    -- 各ユーザーの動画を削除（適切な関数を呼び出し）
    SELECT delete_user_videos_from_storage(v_deleted_user.id) INTO v_cleanup_result;
    
    -- 結果を集計
    v_total_videos_deleted := v_total_videos_deleted + COALESCE((v_cleanup_result->>'deleted_count')::INTEGER, 0);
    v_total_videos_failed := v_total_videos_failed + COALESCE((v_cleanup_result->>'failed_count')::INTEGER, 0);
    v_processed_users := v_processed_users + 1;
    
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'processed_users', v_processed_users,
    'total_videos_deleted', v_total_videos_deleted,
    'total_videos_failed', v_total_videos_failed,
    'message', 'Bulk video cleanup completed'
  );
END;
$$;


ALTER FUNCTION "public"."cleanup_all_deleted_user_videos"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_battle_with_season_update"("p_battle_id" "uuid", "p_winner_id" "uuid" DEFAULT NULL::"uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_global_rating_result JSON;
  v_season_points_result JSON;
  v_current_season_id UUID;
BEGIN
  -- アクティブシーズンを取得
  SELECT id INTO v_current_season_id 
  FROM seasons 
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- 1. 既存のglobal_rating更新（既存システム）
  BEGIN
    SELECT update_battle_ratings_safe(p_battle_id, p_winner_id) INTO v_global_rating_result;
  EXCEPTION WHEN OTHERS THEN
    v_global_rating_result := json_build_object(
      'success', false,
      'error', 'global_rating_update_failed',
      'message', SQLERRM
    );
  END;

  -- 2. 新しいseason_points更新（シーズン制）
  BEGIN
    IF v_current_season_id IS NOT NULL THEN
      SELECT update_season_points_after_battle(p_battle_id, p_winner_id) INTO v_season_points_result;
    ELSE
      v_season_points_result := json_build_object(
        'success', false,
        'error', 'no_active_season',
        'message', 'アクティブなシーズンがないためシーズンポイント更新をスキップ'
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_season_points_result := json_build_object(
      'success', false,
      'error', 'season_points_update_failed',
      'message', SQLERRM
    );
  END;

  RETURN json_build_object(
    'success', true,
    'battle_id', p_battle_id,
    'winner_id', p_winner_id,
    'current_season_id', v_current_season_id,
    'global_rating_update', v_global_rating_result,
    'season_points_update', v_season_points_result
  );
END;
$$;


ALTER FUNCTION "public"."complete_battle_with_season_update"("p_battle_id" "uuid", "p_winner_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."complete_battle_with_season_update"("p_battle_id" "uuid", "p_winner_id" "uuid") IS 'バトル完了時の統合処理：global_ratingとseason_pointsの両方を更新';



CREATE OR REPLACE FUNCTION "public"."complete_battle_with_video_archiving"("p_battle_id" "uuid", "p_winner_id" "uuid" DEFAULT NULL::"uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
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
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Battle not found'); END IF;
  SELECT id INTO v_current_season_id FROM public.seasons WHERE status='active' ORDER BY start_at DESC LIMIT 1;
  SELECT COALESCE(is_deleted,FALSE), username, language INTO v_player1_deleted, v_player1_username, v_player1_language FROM public.profiles WHERE id = v_battle_rec.player1_user_id;
  SELECT COALESCE(is_deleted,FALSE), username, language INTO v_player2_deleted, v_player2_username, v_player2_language FROM public.profiles WHERE id = v_battle_rec.player2_user_id;
  SELECT video_url INTO v_player1_video_url FROM public.submissions WHERE id = v_battle_rec.player1_submission_id;
  SELECT video_url INTO v_player2_video_url FROM public.submissions WHERE id = v_battle_rec.player2_submission_id;
  INSERT INTO public.archived_battles (original_battle_id, winner_id, final_votes_a, final_votes_b, battle_format, player1_user_id, player2_user_id, player1_submission_id, player2_submission_id, player1_video_url, player2_video_url, season_id, archived_at, created_at, updated_at)
  VALUES (p_battle_id, p_winner_id, v_battle_rec.votes_a, v_battle_rec.votes_b, v_battle_rec.battle_format, v_battle_rec.player1_user_id, v_battle_rec.player2_user_id, v_battle_rec.player1_submission_id, v_battle_rec.player2_submission_id, v_player1_video_url, v_player2_video_url, v_current_season_id, NOW(), NOW(), NOW()) RETURNING id INTO v_archived_battle_id;
  INSERT INTO public.archived_battle_votes (archived_battle_id, user_id, vote, comment, created_at)
    SELECT v_archived_battle_id, bv.user_id, bv.vote, bv.comment, bv.created_at FROM public.battle_votes bv WHERE bv.battle_id = p_battle_id AND bv.comment IS NOT NULL AND bv.comment != '';
  UPDATE public.submissions SET status='BATTLE_ENDED', updated_at=NOW() WHERE id IN (v_battle_rec.player1_submission_id, v_battle_rec.player2_submission_id);
  SELECT update_battle_ratings_safe(p_battle_id, p_winner_id, v_player1_deleted, v_player2_deleted) INTO v_rating_result;
  BEGIN SELECT update_season_points_after_battle(p_battle_id, p_winner_id) INTO v_season_result; EXCEPTION WHEN undefined_function THEN v_season_result := json_build_object('skipped', true, 'reason', 'function not found'); END;
  IF p_winner_id IS NULL THEN v_player1_outcome:='draw'; v_player2_outcome:='draw';
  ELSIF p_winner_id = v_battle_rec.player1_user_id THEN v_player1_outcome:='win'; v_player2_outcome:='lose';
  ELSIF p_winner_id = v_battle_rec.player2_user_id THEN v_player1_outcome:='lose'; v_player2_outcome:='win';
  ELSE v_player1_outcome:='draw'; v_player2_outcome:='draw'; END IF;
  IF NOT v_player1_deleted THEN
    v_json_msg := public.get_battle_result_notification_text(v_player1_outcome, v_player2_username, v_player1_language);
    INSERT INTO public.notifications (user_id, title, message, type, related_battle_id, is_read, created_at, updated_at)
    VALUES (v_battle_rec.player1_user_id, v_json_msg->>'title', v_json_msg->>'message', CASE v_player1_outcome WHEN 'win' THEN 'battle_win' WHEN 'lose' THEN 'battle_lose' ELSE 'battle_draw' END, p_battle_id, false, NOW(), NOW());
  END IF;
  IF NOT v_player2_deleted THEN
    v_json_msg := public.get_battle_result_notification_text(v_player2_outcome, v_player1_username, v_player2_language);
    INSERT INTO public.notifications (user_id, title, message, type, related_battle_id, is_read, created_at, updated_at)
    VALUES (v_battle_rec.player2_user_id, v_json_msg->>'title', v_json_msg->>'message', CASE v_player2_outcome WHEN 'win' THEN 'battle_win' WHEN 'lose' THEN 'battle_lose' ELSE 'battle_draw' END, p_battle_id, false, NOW(), NOW());
  END IF;
  DELETE FROM public.active_battles WHERE id = p_battle_id;
  RETURN json_build_object('success', true,'archived_battle_id', v_archived_battle_id,'winner_id', p_winner_id,'season_id', v_current_season_id,'final_votes_a', v_battle_rec.votes_a,'final_votes_b', v_battle_rec.votes_b,'player1_video_url', v_player1_video_url,'player2_video_url', v_player2_video_url,'player1_deleted', v_player1_deleted,'player2_deleted', v_player2_deleted,'rating_update', v_rating_result,'season_points_update', v_season_result,'notifications_sent', CASE WHEN v_player1_deleted AND v_player2_deleted THEN 0 WHEN v_player1_deleted OR v_player2_deleted THEN 1 ELSE 2 END,'multilang', true);
EXCEPTION WHEN OTHERS THEN RETURN json_build_object('success', false, 'error', 'Transaction failed', 'error_details', SQLERRM); END;$$;


ALTER FUNCTION "public"."complete_battle_with_video_archiving"("p_battle_id" "uuid", "p_winner_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."complete_battle_with_video_archiving"("p_battle_id" "uuid", "p_winner_id" "uuid") IS 'Battle completion with localized notifications';



CREATE OR REPLACE FUNCTION "public"."create_community"("p_name" "text", "p_description" "text", "p_password" "text" DEFAULT NULL::"text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_user_id uuid;
  v_community_id uuid;
  v_password_hash text;
  v_user_rating integer;
  v_existing_community_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;

  SELECT rating INTO v_user_rating FROM profiles WHERE id = v_user_id;

  IF p_password IS NOT NULL AND p_password != '' THEN
    v_password_hash := crypt(p_password, gen_salt('bf'));
  END IF;

  SELECT current_community_id INTO v_existing_community_id 
  FROM profiles WHERE id = v_user_id;
  
  IF v_existing_community_id IS NOT NULL THEN
    DELETE FROM community_members 
    WHERE user_id = v_user_id AND community_id = v_existing_community_id;
    
    PERFORM update_community_stats(v_existing_community_id);
  END IF;

  INSERT INTO communities (name, description, owner_user_id, password_hash, average_rating)
  VALUES (p_name, p_description, v_user_id, v_password_hash, v_user_rating)
  RETURNING id INTO v_community_id;

  INSERT INTO community_members (community_id, user_id, role)
  VALUES (v_community_id, v_user_id, 'owner')
  ON CONFLICT (user_id) DO UPDATE SET 
    community_id = v_community_id,
    role = 'owner',
    joined_at = now();

  PERFORM update_community_stats(v_community_id);

  RETURN json_build_object(
    'success', true,
    'community_id', v_community_id,
    'message', 'Community created successfully'
  );
EXCEPTION
  WHEN unique_violation THEN
    IF SQLERRM LIKE '%communities_name_key%' THEN
      RETURN json_build_object('success', false, 'message', 'Community name already exists');
    ELSE
      RETURN json_build_object('success', false, 'message', 'Duplicate entry error');
    END IF;
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."create_community"("p_name" "text", "p_description" "text", "p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_submission_with_cooldown_check"("p_user_id" "uuid", "p_video_url" "text", "p_battle_format" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  last_submission_time timestamp;
  can_submit_now boolean;
  cooldown_remaining interval;
  new_submission_id uuid;
  remaining_minutes integer;
  valid_battle_format text;
BEGIN
  -- バトルフォーマットの検証と正規化
  valid_battle_format := UPPER(p_battle_format);
  IF valid_battle_format NOT IN ('MAIN_BATTLE', 'MINI_BATTLE', 'THEME_CHALLENGE') THEN
    valid_battle_format := 'MAIN_BATTLE'; -- デフォルト値
  END IF;

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
  
  -- 1時間制限をチェック（正しいenum値を使用）
  SELECT created_at INTO last_submission_time
  FROM submissions
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 hour'
    AND status != 'WITHDRAWN'::submission_status  -- 正しいenum値を使用
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
    status,
    created_at,
    updated_at
  ) VALUES (
    p_user_id, 
    p_video_url, 
    valid_battle_format::battle_format,
    'WAITING_OPPONENT'::submission_status,  -- 正しいenum値を使用
    NOW(),
    NOW()
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
      'message_params', json_build_object('error', SQLERRM, 'detail', SQLSTATE)
    );
END;
$$;


ALTER FUNCTION "public"."create_submission_with_cooldown_check"("p_user_id" "uuid", "p_video_url" "text", "p_battle_format" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_submission_with_cooldown_check"("p_user_id" "uuid", "p_video_url" "text", "p_battle_format" "text") IS '1時間制限チェック付き投稿作成関数（enum値修正版）：正しいenum値を使用して投稿を作成';



CREATE OR REPLACE FUNCTION "public"."delete_community"("p_community_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_user_id uuid;
  v_community communities%ROWTYPE;
BEGIN
  -- 現在のユーザーを取得
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;

  -- コミュニティ情報を取得
  SELECT * INTO v_community FROM communities WHERE id = p_community_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Community not found');
  END IF;

  -- オーナー権限確認
  IF v_community.owner_user_id != v_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Only the owner can delete this community');
  END IF;

  -- 関連データを削除（CASCADE）
  -- 1. チャットメッセージを削除
  DELETE FROM community_chat_messages WHERE community_id = p_community_id;
  
  -- 2. メンバーを削除（トリガーでprofiles.current_community_idも更新される）
  DELETE FROM community_members WHERE community_id = p_community_id;
  
  -- 3. コミュニティ本体を削除
  DELETE FROM communities WHERE id = p_community_id;

  RETURN json_build_object(
    'success', true, 
    'message', 'Community deleted successfully'
  );
END;
$$;


ALTER FUNCTION "public"."delete_community"("p_community_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_videos_from_storage"("p_user_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'storage'
    AS $_$
DECLARE
  v_video_record RECORD;
  v_deleted_count INTEGER := 0;
  v_failed_count INTEGER := 0;
  v_deleted_urls TEXT[] := '{}';
  v_failed_urls TEXT[] := '{}';
  v_storage_path TEXT;
BEGIN
  -- ユーザーに関連する全ての動画URLを取得
  -- submissions, archived_battlesから動画URLを収集
  FOR v_video_record IN
    -- submissionsテーブルから
    SELECT video_url, 'submissions' as source_table
    FROM submissions 
    WHERE user_id = p_user_id
      AND video_url IS NOT NULL
    UNION
    -- archived_battlesのplayer1_video_url
    SELECT player1_video_url as video_url, 'archived_battles_p1' as source_table
    FROM archived_battles 
    WHERE player1_user_id = p_user_id
      AND player1_video_url IS NOT NULL
    UNION
    -- archived_battlesのplayer2_video_url  
    SELECT player2_video_url as video_url, 'archived_battles_p2' as source_table
    FROM archived_battles 
    WHERE player2_user_id = p_user_id
      AND player2_video_url IS NOT NULL
  LOOP
    BEGIN
      -- Supabase Storage URLからファイルパスを抽出
      -- 例: https://xxx.supabase.co/storage/v1/object/public/videos/path/to/file.mp4
      -- -> videos/path/to/file.mp4
      v_storage_path := regexp_replace(
        v_video_record.video_url, 
        '.*\\/storage\\/v1\\/object\\/public\\/([^?]+)(\\?.*)?$', 
        '\\1'
      );
      
      -- Storageから物理削除
      -- storage.objects テーブルから直接削除
      DELETE FROM storage.objects 
      WHERE bucket_id = 'videos' 
        AND name = replace(v_storage_path, 'videos/', '');
      
      IF FOUND THEN
        v_deleted_count := v_deleted_count + 1;
        v_deleted_urls := v_deleted_urls || v_video_record.video_url;
      ELSE
        v_failed_count := v_failed_count + 1;
        v_failed_urls := v_failed_urls || v_video_record.video_url;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      v_failed_count := v_failed_count + 1;
      v_failed_urls := v_failed_urls || v_video_record.video_url;
      -- エラーログは出力するが処理は継続
      RAISE NOTICE 'Failed to delete video: %, Error: %', v_video_record.video_url, SQLERRM;
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'failed_count', v_failed_count,
    'deleted_urls', v_deleted_urls,
    'failed_urls', v_failed_urls,
    'user_id', p_user_id
  );
END;
$_$;


ALTER FUNCTION "public"."delete_user_videos_from_storage"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."end_current_season"() RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_current_season RECORD;
  v_player_ranking_count INTEGER := 0;
  v_voter_ranking_count INTEGER := 0;

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

  -- Phase 1: バトルランキング（当該シーズン参加者のみ、タイブレーク適用）
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

  -- Phase 2: 投票者ランキング（既存・DENSE_RANK）
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
    'message', FORMAT('シーズンが正常に終了しました。アクティブバトル%s件を強制終了しました。新しいシーズンを開始するには start_new_season() 関数を実行してください。', v_forced_battles_count)
  );
END;
$$;


ALTER FUNCTION "public"."end_current_season"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."end_current_season"() IS 'シーズン終了処理：アクティブバトル強制終了・ランキングアーカイブ（タイブレーク込みのDENSE_RANK）・ポイントリセット';



CREATE OR REPLACE FUNCTION "public"."find_match_and_create_battle"("p_submission_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_submission submissions;
  v_opponent submissions;
  v_battle_id UUID;
  v_voting_end_time TIMESTAMPTZ;
  v_submitter_rating INTEGER;
  v_opponent_rating INTEGER;
  v_rating_diff INTEGER;
  v_submitter_username TEXT;
  v_opponent_username TEXT;
BEGIN
  -- Get the submission details
  SELECT * INTO v_submission
  FROM public.submissions
  WHERE id = p_submission_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'battle_created', false,
      'error', 'Submission not found'
    );
  END IF;

  -- Get submitter's rating and username
  SELECT rating, username INTO v_submitter_rating, v_submitter_username
  FROM public.profiles
  WHERE id = v_submission.user_id;

  -- Only process if submission is waiting for opponent
  IF v_submission.status != 'WAITING_OPPONENT' THEN
    RETURN json_build_object(
      'battle_created', false,
      'error', 'Submission is not waiting for opponent',
      'current_status', v_submission.status
    );
  END IF;

  -- Find an opponent with same battle format and similar rating (strict initial matching: ±50)
  SELECT s.* INTO v_opponent
  FROM public.submissions s
  JOIN public.profiles p ON s.user_id = p.id
  WHERE s.battle_format = v_submission.battle_format
    AND s.status = 'WAITING_OPPONENT'
    AND s.user_id != v_submission.user_id
    AND s.id != p_submission_id
    AND ABS(p.rating - v_submitter_rating) <= 50  -- 初期マッチング: ±50レート制限
  ORDER BY 
    ABS(p.rating - v_submitter_rating) ASC,  -- レート差最小優先
    s.created_at ASC  -- 同じレート差なら先着順
  LIMIT 1;

  -- If no opponent found with strict rating, try with relaxed rating (±100)
  IF NOT FOUND THEN
    SELECT s.* INTO v_opponent
    FROM public.submissions s
    JOIN public.profiles p ON s.user_id = p.id
    WHERE s.battle_format = v_submission.battle_format
      AND s.status = 'WAITING_OPPONENT'
      AND s.user_id != v_submission.user_id
      AND s.id != p_submission_id
      AND ABS(p.rating - v_submitter_rating) <= 100  -- 緩和された制限: ±100
    ORDER BY 
      ABS(p.rating - v_submitter_rating) ASC,
      s.created_at ASC
    LIMIT 1;
  END IF;

  -- If still no opponent found, submission stays waiting for progressive matching
  IF NOT FOUND THEN
    RETURN json_build_object(
      'battle_created', false,
      'message', 'No suitable opponent found within rating range, submission waiting for progressive matching',
      'waiting', true,
      'submitter_rating', v_submitter_rating,
      'max_rating_diff_tried', 100
    );
  END IF;

  -- Get opponent's rating and username
  SELECT rating, username INTO v_opponent_rating, v_opponent_username
  FROM public.profiles
  WHERE id = v_opponent.user_id;

  -- Calculate rating difference
  v_rating_diff := ABS(v_submitter_rating - v_opponent_rating);

  -- 🔄 投票期間を3日間に変更（5日→3日）
  v_voting_end_time := NOW() + INTERVAL '3 days';

  -- Create the battle record
  INSERT INTO public.active_battles (
    player1_submission_id,
    player2_submission_id,
    player1_user_id,
    player2_user_id,
    battle_format,
    status,
    votes_a,
    votes_b,
    end_voting_at,
    created_at,
    updated_at
  ) VALUES (
    v_submission.id,
    v_opponent.id,
    v_submission.user_id,
    v_opponent.user_id,
    v_submission.battle_format,
    'ACTIVE',
    0,
    0,
    v_voting_end_time,
    NOW(),
    NOW()
  ) RETURNING id INTO v_battle_id;

  -- Update submissions to matched
  UPDATE public.submissions
  SET
    status = 'MATCHED_IN_BATTLE',
    active_battle_id = v_battle_id,
    updated_at = NOW()
  WHERE id IN (v_submission.id, v_opponent.id);

  -- ✅ 新機能: マッチング通知をプレイヤー両方に送信
  -- 投稿者（p_submission_id のオーナー）への通知
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    related_battle_id,
    is_read,
    created_at,
    updated_at
  ) VALUES (
    v_submission.user_id,
    'バトルマッチングが完了しました！',
    FORMAT('対戦相手 %s さんとのバトルが開始されました。投票期間は3日間です。', v_opponent_username),
    'battle_matched',
    v_battle_id,
    false,
    NOW(),
    NOW()
  );

  -- 相手（v_opponent のオーナー）への通知
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    related_battle_id,
    is_read,
    created_at,
    updated_at
  ) VALUES (
    v_opponent.user_id,
    'バトルマッチングが完了しました！',
    FORMAT('対戦相手 %s さんとのバトルが開始されました。投票期間は3日間です。', v_submitter_username),
    'battle_matched',
    v_battle_id,
    false,
    NOW(),
    NOW()
  );

  -- Return success with detailed matching info
  RETURN json_build_object(
    'battle_created', true,
    'battle_id', v_battle_id,
    'opponent_id', v_opponent.user_id,
    'voting_ends_at', v_voting_end_time,
    'message', 'Battle created successfully with 3-day voting period',
    'notifications_sent', 2,
    'match_details', json_build_object(
      'submitter_rating', v_submitter_rating,
      'opponent_rating', v_opponent_rating,
      'rating_difference', v_rating_diff,
      'match_type', 'immediate_edge_function',
      'voting_period_days', 3
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'battle_created', false,
      'error', 'Database error occurred',
      'error_details', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."find_match_and_create_battle"("p_submission_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."find_match_and_create_battle"("p_submission_id" "uuid") IS 'マッチング時に両プレイヤーにbattle_matched通知を送信する即座マッチング関数';



CREATE OR REPLACE FUNCTION "public"."generate_archived_battles_for_active_season"("p_pairs" "jsonb") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
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


ALTER FUNCTION "public"."generate_archived_battles_for_active_season"("p_pairs" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_archived_battles_for_active_season"("p_pairs" "jsonb") IS '指定ペアに対して active_battles を作成し、complete_battle_with_video_archiving() で即時アーカイブまで実施する補助関数。アクティブシーズン必須。';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'upcoming'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "seasons_status_check" CHECK (("status" = ANY (ARRAY['upcoming'::"text", 'active'::"text", 'ended'::"text"])))
);


ALTER TABLE "public"."seasons" OWNER TO "postgres";


COMMENT ON TABLE "public"."seasons" IS 'シーズン管理テーブル（3ヶ月毎の競技期間）';



COMMENT ON COLUMN "public"."seasons"."name" IS 'シーズン名（例: 2025-Q3）';



COMMENT ON COLUMN "public"."seasons"."status" IS 'シーズン状態（upcoming/active/ended）';



CREATE OR REPLACE FUNCTION "public"."get_active_season"() RETURNS "public"."seasons"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_season seasons;
BEGIN
  SELECT * INTO v_season
  FROM public.seasons
  WHERE status = 'active'
    AND start_at <= NOW()
    AND end_at >= NOW()
  ORDER BY start_at DESC
  LIMIT 1;
  
  RETURN v_season;
END;
$$;


ALTER FUNCTION "public"."get_active_season"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ad_stats"("period" "text", "p_placement_key" "text" DEFAULT NULL::"text", "p_campaign_id" "uuid" DEFAULT NULL::"uuid", "p_flight_id" "uuid" DEFAULT NULL::"uuid", "p_creative_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("day" "date", "creative_id" "uuid", "placement_id" "uuid", "flight_id" "uuid", "impressions" bigint, "clicks" bigint, "ctr" numeric)
    LANGUAGE "sql" STABLE
    AS $$
  with base as (
    select * from mv_ad_stats_daily
    where day >= (case when period = '7d' then (current_date - interval '6 days')
                       when period = '24h' then (current_date - interval '1 day')
                       else (current_date - interval '6 days') end)
  ), f as (
    select b.*
    from base b
    left join ad_placements ap on ap.id = b.placement_id
    where (p_placement_key is null or ap.key = p_placement_key)
      and (p_campaign_id is null or exists (
            select 1 from ad_flights f2 where f2.id = b.flight_id and f2.campaign_id = p_campaign_id))
      and (p_flight_id is null or b.flight_id = p_flight_id)
      and (p_creative_id is null or b.creative_id = p_creative_id)
  )
  select 
    day::date,
    creative_id,
    placement_id,
    flight_id,
    sum(impressions)::bigint as impressions,
    sum(clicks)::bigint as clicks,
    case when sum(impressions) > 0 then round((sum(clicks)::numeric / sum(impressions)::numeric)*100, 4) else 0 end as ctr
  from f
  group by 1,2,3,4
  order by day desc;
$$;


ALTER FUNCTION "public"."get_ad_stats"("period" "text", "p_placement_key" "text", "p_campaign_id" "uuid", "p_flight_id" "uuid", "p_creative_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_ad_stats"("period" "text", "p_placement_key" "text", "p_campaign_id" "uuid", "p_flight_id" "uuid", "p_creative_id" "uuid") IS 'Fetch aggregated ad stats for given period (24h or 7d) filtered optionally by placement key / campaign / flight / creative. Returns day-level rows with CTR%';



CREATE OR REPLACE FUNCTION "public"."get_all_seasons"() RETURNS TABLE("id" "uuid", "name" "text", "start_at" timestamp with time zone, "end_at" timestamp with time zone, "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.start_at,
    s.end_at,
    s.status
  FROM seasons s
  ORDER BY s.start_at DESC; -- 新しいシーズンから順に
END;
$$;


ALTER FUNCTION "public"."get_all_seasons"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_all_seasons"() IS 'シーズン一覧を取得（必要最小限の5列: id, name, start_at, end_at, status）';



CREATE OR REPLACE FUNCTION "public"."get_battle_comments"("p_battle_id" "uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "username" "text", "avatar_url" "text", "vote" character, "comment" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_is_active_battle boolean := false;
  v_is_archived_battle boolean := false;
BEGIN
  -- Check if this is an active battle
  SELECT EXISTS(
    SELECT 1 FROM public.active_battles ab WHERE ab.id = p_battle_id
  ) INTO v_is_active_battle;

  IF v_is_active_battle THEN
    -- Return comments from active battle (existing logic)
    RETURN QUERY
    SELECT 
      bv.id,
      bv.user_id,
      COALESCE(p.username, 'Anonymous') as username,
      p.avatar_url,
      bv.vote,
      bv.comment,
      bv.created_at
    FROM public.battle_votes bv
    LEFT JOIN public.profiles p ON bv.user_id = p.id
    WHERE bv.battle_id = p_battle_id 
      AND bv.comment IS NOT NULL 
      AND bv.comment != ''
    ORDER BY bv.created_at DESC;

  ELSE
    -- Check if this is an archived battle (by archived_battle.id)
    SELECT EXISTS(
      SELECT 1 FROM public.archived_battles ab WHERE ab.id = p_battle_id
    ) INTO v_is_archived_battle;

    IF v_is_archived_battle THEN
      -- Return comments from archived battle
      RETURN QUERY
      SELECT 
        abv.id,
        abv.user_id,
        COALESCE(p.username, 'Anonymous') as username,
        p.avatar_url,
        abv.vote,
        abv.comment,
        abv.created_at
      FROM public.archived_battle_votes abv
      LEFT JOIN public.profiles p ON abv.user_id = p.id
      WHERE abv.archived_battle_id = p_battle_id 
        AND abv.comment IS NOT NULL 
        AND abv.comment != ''
      ORDER BY abv.created_at DESC;

    ELSE
      -- Also check if this is an original_battle_id from archived_battles
      -- This handles cases where frontend passes the original active battle ID
      RETURN QUERY
      SELECT 
        abv.id,
        abv.user_id,
        COALESCE(p.username, 'Anonymous') as username,
        p.avatar_url,
        abv.vote,
        abv.comment,
        abv.created_at
      FROM public.archived_battle_votes abv
      LEFT JOIN public.profiles p ON abv.user_id = p.id
      JOIN public.archived_battles ab ON abv.archived_battle_id = ab.id
      WHERE ab.original_battle_id = p_battle_id 
        AND abv.comment IS NOT NULL 
        AND abv.comment != ''
      ORDER BY abv.created_at DESC;
    END IF;
  END IF;

  RETURN;
END;
$$;


ALTER FUNCTION "public"."get_battle_comments"("p_battle_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_battle_result_notification_text"("p_outcome" "text", "p_opponent_username" "text", "p_language" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_lang TEXT := COALESCE(p_language, 'en');
  v_title TEXT;
  v_message TEXT;
BEGIN
  v_lang := LOWER(v_lang);
  IF v_lang ~ '^zh' THEN v_lang := 'zh-CN';
  ELSIF v_lang ~ '^pt' THEN v_lang := 'pt-BR'; END IF;
  IF v_lang NOT IN ('en','ja','ko','zh-CN','es','pt-BR','fr','de') THEN v_lang := 'en'; END IF;
  CASE v_lang
    WHEN 'ja' THEN CASE p_outcome
      WHEN 'win' THEN v_title:='バトル勝利！'; v_message:=FORMAT('対戦相手 %s とのバトルに勝利しました！', COALESCE(p_opponent_username,'Unknown'));
      WHEN 'lose' THEN v_title:='バトル結果'; v_message:=FORMAT('対戦相手 %s とのバトルは惜敗でした。次回頑張りましょう！', COALESCE(p_opponent_username,'Unknown'));
      ELSE v_title:='バトル結果'; v_message:=FORMAT('対戦相手 %s とのバトルは引き分けでした。', COALESCE(p_opponent_username,'Unknown')); END CASE;
    WHEN 'ko' THEN CASE p_outcome
      WHEN 'win' THEN v_title:='배틀 승리!'; v_message:=FORMAT('%s 님과의 배틀에서 승리했습니다!', COALESCE(p_opponent_username,'Unknown'));
      WHEN 'lose' THEN v_title:='배틀 결과'; v_message:=FORMAT('%s 님과의 배틀에서 아쉽게 패배했습니다. 다음에 다시 도전하세요!', COALESCE(p_opponent_username,'Unknown'));
      ELSE v_title:='배틀 결과'; v_message:=FORMAT('%s 님과의 배틀은 무승부였습니다.', COALESCE(p_opponent_username,'Unknown')); END CASE;
    WHEN 'zh-CN' THEN CASE p_outcome
      WHEN 'win' THEN v_title:='战斗胜利！'; v_message:=FORMAT('你战胜了对手 %s ！', COALESCE(p_opponent_username,'Unknown'));
      WHEN 'lose' THEN v_title:='战斗结果'; v_message:=FORMAT('与对手 %s 的战斗惜败。下次加油！', COALESCE(p_opponent_username,'Unknown'));
      ELSE v_title:='战斗结果'; v_message:=FORMAT('与对手 %s 的战斗以平局结束。', COALESCE(p_opponent_username,'Unknown')); END CASE;
    WHEN 'es' THEN CASE p_outcome
      WHEN 'win' THEN v_title:='¡Victoria en la batalla!'; v_message:=FORMAT('Has ganado la batalla contra %s.', COALESCE(p_opponent_username,'Unknown'));
      WHEN 'lose' THEN v_title:='Resultado de la batalla'; v_message:=FORMAT('Perdiste contra %s. ¡Sigue intentando!', COALESCE(p_opponent_username,'Unknown'));
      ELSE v_title:='Resultado de la batalla'; v_message:=FORMAT('La batalla contra %s terminó en empate.', COALESCE(p_opponent_username,'Unknown')); END CASE;
    WHEN 'pt-BR' THEN CASE p_outcome
      WHEN 'win' THEN v_title:='Vitória na batalha!'; v_message:=FORMAT('Você venceu a batalha contra %s!', COALESCE(p_opponent_username,'Unknown'));
      WHEN 'lose' THEN v_title:='Resultado da batalha'; v_message:=FORMAT('Você perdeu para %s. Tente novamente!', COALESCE(p_opponent_username,'Unknown'));
      ELSE v_title:='Resultado da batalha'; v_message:=FORMAT('A batalha contra %s terminou em empate.', COALESCE(p_opponent_username,'Unknown')); END CASE;
    WHEN 'fr' THEN CASE p_outcome
      WHEN 'win' THEN v_title:='Victoire !'; v_message:=FORMAT('Vous avez remporté la bataille contre %s !', COALESCE(p_opponent_username,'Unknown'));
      WHEN 'lose' THEN v_title:='Résultat de la bataille'; v_message:=FORMAT('Vous avez perdu contre %s. Réessayez !', COALESCE(p_opponent_username,'Unknown'));
      ELSE v_title:='Résultat de la bataille'; v_message:=FORMAT('La bataille contre %s s''est terminée par une égalité.', COALESCE(p_opponent_username,'Unknown')); END CASE;
    WHEN 'de' THEN CASE p_outcome
      WHEN 'win' THEN v_title:='Kampf gewonnen!'; v_message:=FORMAT('Du hast den Kampf gegen %s gewonnen!', COALESCE(p_opponent_username,'Unknown'));
      WHEN 'lose' THEN v_title:='Kampfergebnis'; v_message:=FORMAT('Du hast gegen %s knapp verloren. Viel Erfolg beim nächsten Mal!', COALESCE(p_opponent_username,'Unknown'));
      ELSE v_title:='Kampfergebnis'; v_message:=FORMAT('Der Kampf gegen %s endete unentschieden.', COALESCE(p_opponent_username,'Unknown')); END CASE;
    ELSE CASE p_outcome
      WHEN 'win' THEN v_title:='Battle Victory!'; v_message:=FORMAT('You won the battle against %s!', COALESCE(p_opponent_username,'Unknown'));
      WHEN 'lose' THEN v_title:='Battle Result'; v_message:=FORMAT('You lost the battle against %s. Try again next time!', COALESCE(p_opponent_username,'Unknown'));
      ELSE v_title:='Battle Result'; v_message:=FORMAT('Your battle against %s ended in a draw.', COALESCE(p_opponent_username,'Unknown')); END CASE; END CASE;
  RETURN json_build_object('title', v_title, 'message', v_message);
END;$$;


ALTER FUNCTION "public"."get_battle_result_notification_text"("p_outcome" "text", "p_opponent_username" "text", "p_language" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_battle_result_notification_text"("p_outcome" "text", "p_opponent_username" "text", "p_language" "text") IS 'Battle result notification localized';



CREATE OR REPLACE FUNCTION "public"."get_k_factor_by_format"("battle_format" "text") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  CASE battle_format
    WHEN 'MAIN_BATTLE' THEN RETURN 64;      -- Updated: 32 → 64 (doubled impact)
    WHEN 'MINI_BATTLE' THEN RETURN 24;      -- Unchanged: moderate impact
    WHEN 'THEME_CHALLENGE' THEN RETURN 20;  -- Unchanged: conservative impact
    ELSE RETURN 64; -- Updated default to match MAIN_BATTLE
  END CASE;
END;
$$;


ALTER FUNCTION "public"."get_k_factor_by_format"("battle_format" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_k_factor_by_format"("battle_format" "text") IS 'バトル形式別Kファクター取得関数：MAIN_BATTLE(64), MINI_BATTLE(24), THEME_CHALLENGE(20)を返す。2025-08-02: MAIN_BATTLEを32から64に変更してレーティング変動を倍増。';



CREATE OR REPLACE FUNCTION "public"."get_k_factor_by_format"("battle_format" "public"."battle_format") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  CASE battle_format
    WHEN 'MAIN_BATTLE' THEN RETURN 32;
    WHEN 'MINI_BATTLE' THEN RETURN 24;
    WHEN 'THEME_CHALLENGE' THEN RETURN 20;
    ELSE RETURN 32; -- Default K-factor
  END CASE;
END;
$$;


ALTER FUNCTION "public"."get_k_factor_by_format"("battle_format" "public"."battle_format") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_loss_streak_before_battle"("p_user_id" "uuid", "p_season_id" "uuid", "p_battle_original_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_streak INTEGER := 0;
  rec RECORD;
  v_excluded_archived_id uuid;
BEGIN
  SELECT id INTO v_excluded_archived_id
  FROM archived_battles
  WHERE original_battle_id = p_battle_original_id OR id = p_battle_original_id
  LIMIT 1;

  FOR rec IN
    SELECT id, winner_id, player1_user_id, player2_user_id, archived_at
    FROM archived_battles
    WHERE season_id = p_season_id
      AND (player1_user_id = p_user_id OR player2_user_id = p_user_id)
      AND (v_excluded_archived_id IS NULL OR id <> v_excluded_archived_id)
    ORDER BY archived_at DESC
  LOOP
    IF rec.winner_id IS NULL THEN EXIT; -- draw break
    ELSIF rec.winner_id = p_user_id THEN EXIT; -- win break
    ELSE v_streak := v_streak + 1; END IF; -- loss
  END LOOP;
  RETURN v_streak;
END;$$;


ALTER FUNCTION "public"."get_loss_streak_before_battle"("p_user_id" "uuid", "p_season_id" "uuid", "p_battle_original_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_loss_streak_before_battle"("p_user_id" "uuid", "p_season_id" "uuid", "p_battle_original_id" "uuid") IS 'Returns consecutive loss count for user within season BEFORE current battle (identified by original battle id).';



CREATE OR REPLACE FUNCTION "public"."get_original_email_hint"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_hash TEXT;
BEGIN
  -- 管理者やサポート用：元メールのハッシュのみ返す
  SELECT raw_user_meta_data->>'original_email_hash' INTO v_hash
  FROM auth.users 
  WHERE id = p_user_id;
  
  RETURN v_hash;
END;
$$;


ALTER FUNCTION "public"."get_original_email_hint"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_original_email_hint"("p_user_id" "uuid") IS 'サポート用：削除されたユーザーの元メールアドレスのハッシュを取得（復旧時の確認用）。';



CREATE OR REPLACE FUNCTION "public"."get_public_profile"("profile_id" "uuid") RETURNS TABLE("id" "uuid", "username" "text", "avatar_url" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- 匿名ユーザーには基本情報のみ返す
  IF auth.role() = 'anon' THEN
    RETURN QUERY
    SELECT p.id, p.username, p.avatar_url, p.created_at
    FROM public.profiles p
    WHERE p.id = profile_id;
  ELSE
    -- 認証ユーザーには全情報を返す
    RETURN QUERY
    SELECT p.id, p.username, p.avatar_url, p.created_at
    FROM public.profiles p
    WHERE p.id = profile_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_public_profile"("profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_rank_color_from_rating"("rating" integer) RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  CASE 
    WHEN rating >= 1800 THEN RETURN 'rainbow'; -- Grandmaster: Rainbow/Multicolor
    WHEN rating >= 1600 THEN RETURN 'purple';  -- Master: Purple
    WHEN rating >= 1400 THEN RETURN 'blue';    -- Expert: Blue
    WHEN rating >= 1300 THEN RETURN 'green';   -- Advanced: Green
    WHEN rating >= 1200 THEN RETURN 'yellow';  -- Intermediate: Yellow
    WHEN rating >= 1100 THEN RETURN 'gray';    -- Beginner: Gray
    ELSE RETURN 'unranked';                     -- Unranked: Default
  END CASE;
END;
$$;


ALTER FUNCTION "public"."get_rank_color_from_rating"("rating" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_rank_color_from_rating"("rating" integer) IS 'Returns rank color for UI styling based on rating';



CREATE OR REPLACE FUNCTION "public"."get_rank_from_rating"("rating" integer) RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  CASE 
    WHEN rating >= 1800 THEN RETURN 'Grandmaster';
    WHEN rating >= 1600 THEN RETURN 'Master';
    WHEN rating >= 1400 THEN RETURN 'Expert';
    WHEN rating >= 1300 THEN RETURN 'Advanced';
    WHEN rating >= 1200 THEN RETURN 'Intermediate';
    WHEN rating >= 1100 THEN RETURN 'Beginner';
    ELSE RETURN 'Unranked';
  END CASE;
END;
$$;


ALTER FUNCTION "public"."get_rank_from_rating"("rating" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_rank_from_rating"("rating" integer) IS 'Returns rank name based on rating: Grandmaster(1800+), Master(1600+), Expert(1400+), Advanced(1300+), Intermediate(1200+), Beginner(1100+)';



CREATE OR REPLACE FUNCTION "public"."get_season_rankings_by_id"("p_season_id" "uuid") RETURNS TABLE("rank" integer, "points" integer, "user_id" "uuid", "username" "text", "avatar_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.rank,
    sr.points,
    sr.user_id,
    COALESCE(p.username, 'deleted-user-' || sr.user_id::text) as username,
    p.avatar_url
  FROM season_rankings sr
  LEFT JOIN profiles p ON sr.user_id = p.id
  WHERE sr.season_id = p_season_id
  ORDER BY sr.rank ASC;
END;
$$;


ALTER FUNCTION "public"."get_season_rankings_by_id"("p_season_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_season_voter_rankings_by_id"("p_season_id" "uuid") RETURNS TABLE("rank" bigint, "user_id" "uuid", "username" "text", "avatar_url" "text", "votes" integer, "season_id" "uuid")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        svr.rank::bigint,
        svr.user_id,
        p.username,
        p.avatar_url,
        svr.votes,
        svr.season_id
    FROM
        public.season_voter_rankings AS svr
    JOIN
        public.profiles AS p ON svr.user_id = p.id
    WHERE
        svr.season_id = p_season_id
    ORDER BY
        svr.rank ASC;
END;
$$;


ALTER FUNCTION "public"."get_season_voter_rankings_by_id"("p_season_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_submission_status"() RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
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
  ELSIF v_active_season.id IS NOT NULL AND NOW() >= (v_active_season.end_at - INTERVAL '5 days') THEN
    -- シーズン終了5日前
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
$$;


ALTER FUNCTION "public"."get_submission_status"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_submission_status"() IS 'シーズンオフ機能: 投稿状態の詳細情報（理由、次のシーズン開始日など）を取得する関数';



CREATE OR REPLACE FUNCTION "public"."get_top_rankings"("p_limit" integer DEFAULT 10) RETURNS TABLE("user_id" "uuid", "username" "text", "avatar_url" "text", "rating" integer, "season_points" integer, "rank_name" "text", "rank_color" "text", "battles_won" numeric, "battles_lost" numeric, "win_rate" numeric, "user_position" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.user_id,
    r.username,
    r.avatar_url,
    r.rating,
    r.season_points,
    r.rank_name,
    r.rank_color,
    r.battles_won,
    r.battles_lost,
    r.win_rate,
    r."position"
  FROM rankings_view r
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_top_rankings"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_voter_rankings"("p_limit" integer DEFAULT 10) RETURNS TABLE("user_id" "uuid", "username" "text", "avatar_url" "text", "vote_count" integer, "rating" integer, "rank_name" "text", "rank_color" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "user_position" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.user_id,
    v.username,
    v.avatar_url,
    v.vote_count,
    v.rating,
    v.rank_name,
    v.rank_color,
    v.created_at,
    v.updated_at,
    v."position"
  FROM voter_rankings_view v
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_top_voter_rankings"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_current_community"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_user_id uuid;
  v_community_data json;
BEGIN
  -- ユーザーIDを確定
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;

  -- 現在のコミュニティ情報を取得
  SELECT json_build_object(
    'id', c.id,
    'name', c.name,
    'description', c.description,
    'member_count', c.member_count,
    'average_rating', c.average_rating,
    'created_at', c.created_at,
    'user_role', cm.role
  ) INTO v_community_data
  FROM communities c
  JOIN community_members cm ON c.id = cm.community_id
  WHERE cm.user_id = v_user_id;

  IF v_community_data IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User is not in any community');
  END IF;

  RETURN json_build_object('success', true, 'community', v_community_data);
END;
$$;


ALTER FUNCTION "public"."get_user_current_community"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_email_language"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_language TEXT;
BEGIN
  SELECT language INTO v_language
  FROM profiles 
  WHERE id = p_user_id;
  
  -- デフォルトは英語
  RETURN COALESCE(v_language, 'en');
END;
$$;


ALTER FUNCTION "public"."get_user_email_language"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_email_language"("p_user_id" "uuid") IS 'ユーザーのメール送信言語を取得';



CREATE OR REPLACE FUNCTION "public"."get_user_profile"("p_user_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'id', p.id,
    'username', p.username,
    'email', p.email,
    'avatar_url', p.avatar_url,
    'bio', p.bio,
    'rating', p.rating,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  )
  INTO v_result
  FROM profiles p
  WHERE p.id = p_user_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user ID: %', p_user_id;
  END IF;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    SELECT json_build_object(
      'success', false,
      'error', SQLERRM
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_user_profile"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_rank"("p_user_id" "uuid") RETURNS TABLE("user_id" "uuid", "username" "text", "avatar_url" "text", "rating" integer, "season_points" integer, "rank_name" "text", "rank_color" "text", "battles_won" numeric, "battles_lost" numeric, "win_rate" numeric, "user_position" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.user_id,
    r.username,
    r.avatar_url,
    r.rating,
    r.season_points,
    r.rank_name,
    r.rank_color,
    r.battles_won,
    r.battles_lost,
    r.win_rate,
    r."position"
  FROM rankings_view r
  WHERE r.user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."get_user_rank"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_season_rank"("user_id_input" "uuid") RETURNS TABLE("user_id" "uuid", "username" "text", "avatar_url" "text", "season_points" integer, "rating" integer, "rank_name" "text", "rank_color" "text", "battles_won" bigint, "battles_lost" bigint, "win_rate" double precision, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "position" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
    -- まずランキングビューから検索
    RETURN QUERY
    SELECT * FROM season_rankings_view srv WHERE srv.user_id = user_id_input;
    
    -- ランキングにいない場合は個別にユーザー情報を取得
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            p.id,
            p.username,
            p.avatar_url,
            p.season_points,
            p.rating,
            get_rank_from_rating(p.rating) AS rank_name,
            get_rank_color_from_rating(p.rating) AS rank_color,
            0::bigint AS battles_won,  -- バトル未経験
            0::bigint AS battles_lost,
            0.0::double precision AS win_rate,
            p.created_at,
            p.updated_at,
            NULL::bigint AS "position"  -- ランク外はNULL
        FROM profiles p
        WHERE p.id = user_id_input AND p.is_deleted = false;
        
        -- ユーザー自体が存在しない場合はデフォルト値
        IF NOT FOUND THEN
            RETURN QUERY
            SELECT 
                user_id_input,
                'Unknown User'::text,
                NULL::text,
                1200::integer,
                1200::integer,
                'Bronze'::text,
                '#CD7F32'::text,
                0::bigint,
                0::bigint,
                0.0::double precision,
                NOW(),
                NOW(),
                NULL::bigint;
        END IF;
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_user_season_rank"("user_id_input" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_season_voter_rank"("user_id_input" "uuid") RETURNS TABLE("id" "uuid", "username" "text", "avatar_url" "text", "season_vote_points" integer, "rank" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
    -- まずランキングビューから検索
    RETURN QUERY
    SELECT 
        svr.id,
        svr.username,
        svr.avatar_url,
        svr.season_vote_points,
        svr.rank
    FROM season_voter_rankings_view svr 
    WHERE svr.id = user_id_input;
    
    -- ランキングにいない場合は個別にユーザー情報を取得
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            p.id,
            p.username,
            p.avatar_url,
            p.season_vote_points,
            NULL::bigint AS rank  -- ランク外はNULL
        FROM profiles p
        WHERE p.id = user_id_input AND p.is_deleted = false;
        
        -- ユーザー自体が存在しない場合はデフォルト値
        IF NOT FOUND THEN
            RETURN QUERY
            SELECT 
                user_id_input,
                'Unknown User'::text,
                NULL::text,
                0::integer,
                NULL::bigint;
        END IF;
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_user_season_voter_rank"("user_id_input" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_vote"("p_battle_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote public.battle_votes;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', true,
      'has_voted', false,
      'vote', null
    );
  END IF;

  -- Check if user has voted
  SELECT * INTO v_existing_vote
  FROM public.battle_votes
  WHERE battle_id = p_battle_id AND user_id = v_user_id;

  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'has_voted', true,
      'vote', v_existing_vote.vote
    );
  ELSE
    RETURN json_build_object(
      'success', true,
      'has_voted', false,
      'vote', null
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_user_vote"("p_battle_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_voter_rank"("p_user_id" "uuid") RETURNS TABLE("user_id" "uuid", "username" "text", "avatar_url" "text", "vote_count" integer, "rating" integer, "rank_name" "text", "rank_color" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "user_position" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.user_id,
    v.username,
    v.avatar_url,
    v.vote_count,
    v.rating,
    v.rank_name,
    v.rank_color,
    v.created_at,
    v.updated_at,
    v."position"
  FROM voter_rankings_view v
  WHERE v.user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."get_user_voter_rank"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_waiting_submissions"() RETURNS TABLE("id" "uuid", "user_id" "uuid", "battle_format" "public"."battle_format", "video_url" "text", "created_at" timestamp with time zone, "waiting_since" timestamp with time zone, "max_allowed_rating_diff" integer, "attempts_count" integer, "updated_at" timestamp with time zone, "username" "text", "avatar_url" "text", "user_rating" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  SELECT 
    s.id,
    s.user_id,
    s.battle_format,
    s.video_url,
    s.created_at,
    s.created_at as waiting_since,
    100 as max_allowed_rating_diff,
    0 as attempts_count,
    s.updated_at,
    p.username,
    p.avatar_url,
    p.rating as user_rating
  FROM public.submissions s
  JOIN public.profiles p ON s.user_id = p.id
  WHERE s.status = 'WAITING_OPPONENT'
  ORDER BY s.created_at ASC;
$$;


ALTER FUNCTION "public"."get_waiting_submissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."grant_season_rewards"("season_id_param" "uuid") RETURNS TABLE("user_id" "uuid", "reward_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  -- シーズン終了時のランキング上位3位に報酬を付与
  WITH season_rankings AS (
    SELECT 
      p.id as user_id,
      p.rating,
      ROW_NUMBER() OVER (ORDER BY p.rating DESC) as rank
    FROM profiles p
    WHERE p.id IN (
      SELECT DISTINCT COALESCE(b.user1_id, b.user2_id)
      FROM battles b 
      WHERE b.season_id = season_id_param
        AND b.status = 'completed'
    )
  ),
  reward_grants AS (
    INSERT INTO user_rewards (user_id, reward_id, earned_season_id)
    SELECT 
      sr.user_id,
      r.id as reward_id,
      season_id_param
    FROM season_rankings sr
    JOIN rewards r ON (
      r.season_id = season_id_param 
      AND (r.rank_requirement IS NULL OR sr.rank <= r.rank_requirement)
    )
    LEFT JOIN user_rewards ur ON (ur.user_id = sr.user_id AND ur.reward_id = r.id)
    WHERE ur.id IS NULL -- 重複防止
    RETURNING user_id, reward_id
  )
  SELECT 
    rg.user_id,
    COUNT(*)::INTEGER as reward_count
  FROM reward_grants rg
  GROUP BY rg.user_id;
END;
$$;


ALTER FUNCTION "public"."grant_season_rewards"("season_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  detected_language VARCHAR(2) DEFAULT 'ja';
BEGIN
  -- ユーザーのメタデータから言語設定を取得を試行
  -- フロントエンドから言語情報が渡される場合に備える
  IF NEW.raw_user_meta_data ? 'language' THEN
    detected_language := COALESCE(NEW.raw_user_meta_data->>'language', 'ja');
    -- 有効な言語コードかチェック
    IF detected_language NOT IN ('ja', 'en') THEN
      detected_language := 'ja';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, username, email, avatar_url, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    NEW.email,
    '/images/FI.png',  -- デフォルトアバター
    detected_language  -- 検出された言語またはデフォルト（日本語）
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."join_community"("p_community_id" "uuid", "p_password" "text" DEFAULT NULL::"text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_user_id uuid;
  v_community communities%ROWTYPE;
  v_existing_community_id uuid;
  v_result json;
BEGIN
  -- 現在のユーザーを取得
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;

  -- コミュニティ情報を取得
  SELECT * INTO v_community FROM communities WHERE id = p_community_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Community not found');
  END IF;

  -- パスワード確認（プライベートコミュニティの場合）
  IF v_community.password_hash IS NOT NULL THEN
    IF p_password IS NULL OR crypt(p_password, v_community.password_hash) != v_community.password_hash THEN
      RETURN json_build_object('success', false, 'message', 'Invalid password');
    END IF;
  END IF;

  -- 既存のコミュニティから退出
  SELECT current_community_id INTO v_existing_community_id 
  FROM profiles WHERE id = v_user_id;
  
  IF v_existing_community_id IS NOT NULL THEN
    -- 既存コミュニティから退出
    DELETE FROM community_members 
    WHERE user_id = v_user_id AND community_id = v_existing_community_id;
    
    -- 既存コミュニティの統計を更新
    PERFORM update_community_stats(v_existing_community_id);
  END IF;

  -- 新しいコミュニティに参加
  INSERT INTO community_members (community_id, user_id, role)
  VALUES (p_community_id, v_user_id, 'member')
  ON CONFLICT (user_id) DO UPDATE SET 
    community_id = p_community_id,
    joined_at = now();

  -- 新しいコミュニティの統計を更新
  PERFORM update_community_stats(p_community_id);

  RETURN json_build_object(
    'success', true, 
    'message', 'Successfully joined community',
    'community_id', p_community_id
  );
END;
$$;


ALTER FUNCTION "public"."join_community"("p_community_id" "uuid", "p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."kick_member_from_community"("p_community_id" "uuid", "p_target_user_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_user_id uuid;
  v_user_role community_role;
  v_target_role community_role;
  v_target_rating integer;
  v_current_member_count integer;
  v_current_average_rating numeric;
BEGIN
  v_user_id := auth.uid();
  
  -- 実行者の役割を確認
  SELECT role INTO v_user_role
  FROM public.community_members
  WHERE community_id = p_community_id AND user_id = v_user_id;

  IF v_user_role NOT IN ('owner', 'admin') THEN
    RETURN json_build_object('success', false, 'message', 'Only owner or admin can kick members');
  END IF;

  -- 対象者の役割を確認
  SELECT role INTO v_target_role
  FROM public.community_members
  WHERE community_id = p_community_id AND user_id = p_target_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Target user is not a member');
  END IF;

  -- オーナーはキックできない
  IF v_target_role = 'owner' THEN
    RETURN json_build_object('success', false, 'message', 'Cannot kick the owner');
  END IF;

  -- アドミンは他のアドミンをキックできない
  IF v_user_role = 'admin' AND v_target_role = 'admin' THEN
    RETURN json_build_object('success', false, 'message', 'Admin cannot kick another admin');
  END IF;

  -- 対象者のレーティングを取得
  SELECT rating INTO v_target_rating FROM public.profiles WHERE id = p_target_user_id;

  -- コミュニティの現在の統計を取得
  SELECT member_count, average_rating 
  INTO v_current_member_count, v_current_average_rating
  FROM public.communities 
  WHERE id = p_community_id;

  -- メンバーを削除
  DELETE FROM public.community_members
  WHERE community_id = p_community_id AND user_id = p_target_user_id;

  -- コミュニティの統計を更新
  UPDATE public.communities
  SET 
    member_count = v_current_member_count - 1,
    average_rating = CASE 
      WHEN v_current_member_count = 2 THEN (
        SELECT rating FROM public.profiles p 
        JOIN public.community_members cm ON p.id = cm.user_id 
        WHERE cm.community_id = p_community_id
        LIMIT 1
      )
      ELSE ((v_current_average_rating * v_current_member_count) - v_target_rating) / (v_current_member_count - 1)
    END,
    updated_at = now()
  WHERE id = p_community_id;

  RETURN json_build_object('success', true, 'message', 'Member kicked successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."kick_member_from_community"("p_community_id" "uuid", "p_target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."leave_community"("p_community_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_user_id uuid;
  v_user_role community_role;
  v_user_rating integer;
  v_current_member_count integer;
  v_current_average_rating numeric;
BEGIN
  v_user_id := auth.uid();
  
  -- ユーザーの役割を確認
  SELECT role INTO v_user_role
  FROM public.community_members
  WHERE community_id = p_community_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Not a member of this community');
  END IF;

  -- オーナーは退出不可（コミュニティを削除する必要がある）
  IF v_user_role = 'owner' THEN
    RETURN json_build_object('success', false, 'message', 'Owner cannot leave. Transfer ownership or delete the community.');
  END IF;

  -- ユーザーのレーティングを取得
  SELECT rating INTO v_user_rating FROM public.profiles WHERE id = v_user_id;

  -- コミュニティの現在の統計を取得
  SELECT member_count, average_rating 
  INTO v_current_member_count, v_current_average_rating
  FROM public.communities 
  WHERE id = p_community_id;

  -- メンバーから削除
  DELETE FROM public.community_members
  WHERE community_id = p_community_id AND user_id = v_user_id;

  -- コミュニティの統計を更新
  IF v_current_member_count > 1 THEN
    UPDATE public.communities
    SET 
      member_count = v_current_member_count - 1,
      average_rating = CASE 
        WHEN v_current_member_count = 2 THEN (
          SELECT rating FROM public.profiles p 
          JOIN public.community_members cm ON p.id = cm.user_id 
          WHERE cm.community_id = p_community_id
          LIMIT 1
        )
        ELSE ((v_current_average_rating * v_current_member_count) - v_user_rating) / (v_current_member_count - 1)
      END,
      updated_at = now()
    WHERE id = p_community_id;
  END IF;

  RETURN json_build_object('success', true, 'message', 'Successfully left the community');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."leave_community"("p_community_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_api_access"("table_name" "text", "operation" "text", "user_id" "uuid" DEFAULT NULL::"uuid", "query_params" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name,
        action,
        user_id,
        details,
        success,
        created_at
    ) VALUES (
        table_name,
        operation,
        COALESCE(user_id, auth.uid()),
        query_params,
        true,
        NOW()
    );
EXCEPTION
    WHEN OTHERS THEN
        -- ログ記録失敗でも元の処理は続行
        NULL;
END;
$$;


ALTER FUNCTION "public"."log_api_access"("table_name" "text", "operation" "text", "user_id" "uuid", "query_params" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_audit_event"("p_table_name" "text", "p_action" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_details" "jsonb" DEFAULT NULL::"jsonb", "p_success" boolean DEFAULT true, "p_error_message" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name,
    action,
    user_id,
    details,
    success,
    error_message,
    created_at
  ) VALUES (
    p_table_name,
    p_action,
    p_user_id,
    p_details,
    p_success,
    p_error_message,
    NOW()
  );
END;
$$;


ALTER FUNCTION "public"."log_audit_event"("p_table_name" "text", "p_action" "text", "p_user_id" "uuid", "p_details" "jsonb", "p_success" boolean, "p_error_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_password_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- パスワード変更をログに記録
  PERFORM public.log_security_event(
    'password_change',
    jsonb_build_object(
      'user_id', NEW.id,
      'timestamp', NOW()
    )
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_password_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_security_event"("p_event_type" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_phone_number" "text" DEFAULT NULL::"text", "p_event_data" "jsonb" DEFAULT NULL::"jsonb", "p_severity_level" integer DEFAULT 3) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  phone_hash TEXT;
BEGIN
  -- 電話番号のハッシュ化を事前に行う（byteaキャスト付き）
  IF p_phone_number IS NOT NULL THEN
    phone_hash := encode(sha256(p_phone_number::bytea), 'hex');
  ELSE
    phone_hash := NULL;
  END IF;
  
  INSERT INTO security_audit_log (
    event_type,
    user_id,
    phone_number_hash,
    event_data,
    severity_level,
    created_at
  ) VALUES (
    p_event_type,
    p_user_id,
    phone_hash,
    p_event_data,
    p_severity_level,
    NOW()
  );
END;
$$;


ALTER FUNCTION "public"."log_security_event"("p_event_type" "text", "p_user_id" "uuid", "p_phone_number" "text", "p_event_data" "jsonb", "p_severity_level" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_phone_number"("phone_input" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public', 'auth'
    AS $_$
DECLARE
  cleaned_phone TEXT;
  result_phone TEXT;
BEGIN
  IF phone_input IS NULL OR trim(phone_input) = '' THEN
    RETURN NULL;
  END IF;
  
  cleaned_phone := regexp_replace(phone_input, '[^\d+]', '', 'g');
  
  IF cleaned_phone = '' THEN
    RETURN NULL;
  END IF;
  
  CASE 
    WHEN cleaned_phone ~ '^\+81[1-9]\d{8,9}$' THEN
      result_phone := cleaned_phone;
    WHEN cleaned_phone ~ '^0[1-9]\d{8,9}$' THEN
      result_phone := '+81' || substring(cleaned_phone from 2);
    WHEN cleaned_phone ~ '^[1-9]\d{8,9}$' THEN
      result_phone := '+81' || cleaned_phone;
    WHEN cleaned_phone ~ '^81[1-9]\d{8,9}$' THEN
      result_phone := '+' || cleaned_phone;
    WHEN cleaned_phone ~ '^\+[1-9]\d{6,14}$' THEN
      result_phone := cleaned_phone;
    ELSE
      RETURN NULL;
  END CASE;
  
  IF result_phone !~ '^\+[1-9]\d{6,14}$' THEN
    RETURN NULL;
  END IF;
  
  RETURN result_phone;
END;
$_$;


ALTER FUNCTION "public"."normalize_phone_number"("phone_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_battle_completed_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  -- バトルがCOMPLETEDステータスになった場合
  IF NEW.status = 'COMPLETED' AND (OLD IS NULL OR OLD.status != 'COMPLETED') THEN
    PERFORM call_edge_function(
      'notify-battle-completed',
      jsonb_build_object('battle_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_battle_completed_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_battle_created_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  -- バトルが新しくACTIVEステータスになった場合のみ
  IF NEW.status = 'ACTIVE' AND (OLD IS NULL OR OLD.status != 'ACTIVE') THEN
    PERFORM call_edge_function(
      'notify-battle-created',
      jsonb_build_object('battle_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_battle_created_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_vote_cast_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  voted_user_id uuid;
BEGIN
  -- 投票されたユーザーIDを特定（AかBかによって異なる）
  IF NEW.vote = 'A' THEN
    SELECT player1_user_id INTO voted_user_id 
    FROM active_battles 
    WHERE id = NEW.battle_id;
  ELSE
    SELECT player2_user_id INTO voted_user_id 
    FROM active_battles 
    WHERE id = NEW.battle_id;
  END IF;
  
  -- 新しい投票が追加された場合
  PERFORM call_edge_function(
    'notify-vote-cast',
    jsonb_build_object(
      'battle_id', NEW.battle_id,
      'voter_id', NEW.user_id,
      'voted_user_id', voted_user_id
    )
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_vote_cast_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_expired_battles"() RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  rec RECORD;
  v_winner_id UUID;
  v_is_tie BOOLEAN;
  v_result JSON;
  v_processed_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_processed_battles JSON[] := ARRAY[]::JSON[];
  v_errors JSON[] := ARRAY[]::JSON[];
BEGIN
  -- Loop through active battles that have passed their voting end time
  FOR rec IN
    SELECT id, player1_user_id, player2_user_id, votes_a, votes_b
    FROM public.active_battles
    WHERE end_voting_at < now() AND status = 'ACTIVE'
  LOOP
    BEGIN
      -- Mark the battle as 'PROCESSING_RESULTS' to prevent double-processing
      UPDATE public.active_battles
      SET status = 'PROCESSING_RESULTS', updated_at = now()
      WHERE id = rec.id;

      -- Determine the winner or if it's a tie
      IF rec.votes_a > rec.votes_b THEN
        v_winner_id := rec.player1_user_id;
        v_is_tie := FALSE;
      ELSIF rec.votes_b > rec.votes_a THEN
        v_winner_id := rec.player2_user_id;
        v_is_tie := FALSE;
      ELSE
        v_winner_id := NULL; -- It's a tie
        v_is_tie := TRUE;
      END IF;

      -- ✅ 新しい動画URL保存付きの関数を使用
      SELECT complete_battle_with_video_archiving(rec.id, v_winner_id) INTO v_result;

      -- 処理成功をカウント・記録
      v_processed_count := v_processed_count + 1;
      v_processed_battles := v_processed_battles || json_build_object(
        'battle_id', rec.id,
        'winner_id', v_winner_id,
        'is_tie', v_is_tie,
        'votes_a', rec.votes_a,
        'votes_b', rec.votes_b,
        'completion_result', v_result
      );

      -- Log successful completion (引数数を修正)
      RAISE NOTICE 'Battle % completed successfully', rec.id;

    EXCEPTION WHEN OTHERS THEN
      -- If any error occurs, log it and revert the status to 'ACTIVE' for a retry
      v_error_count := v_error_count + 1;
      v_errors := v_errors || json_build_object(
        'battle_id', rec.id,
        'error_message', SQLERRM,
        'error_time', now()
      );
      
      RAISE NOTICE 'Error processing battle %: %', rec.id, SQLERRM;
      UPDATE public.active_battles
      SET status = 'ACTIVE'
      WHERE id = rec.id AND status = 'PROCESSING_RESULTS';
    END;
  END LOOP;

  -- 処理結果をJSON形式で返却
  RETURN json_build_object(
    'success', true,
    'processed_count', v_processed_count,
    'error_count', v_error_count,
    'processed_battles', v_processed_battles,
    'errors', v_errors,
    'execution_time', now()
  );
END;
$$;


ALTER FUNCTION "public"."process_expired_battles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."progressive_matchmaking"() RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_submission_rec RECORD;
  v_opponent_rec RECORD;
  v_battle_id UUID;
  v_voting_end_time TIMESTAMPTZ;
  v_processed_count INTEGER := 0;
  v_matched_count INTEGER := 0;
  v_duplicate_prevention_count INTEGER := 0;
  v_results JSON[] := '{}';
  v_match_result JSON;
  v_rating_tolerance INTEGER;
  v_waiting_hours NUMERIC;
  v_submitter_rating INTEGER;
  v_opponent_rating INTEGER;
  v_submitter_username TEXT;
  v_opponent_username TEXT;
BEGIN
  -- 初期待機期間を10分に設定（即座マッチングの猶予期間）
  FOR v_submission_rec IN
    SELECT 
      s.id,
      s.user_id,
      s.created_at,
      s.battle_format,
      s.video_url,
      p.rating,
      p.username,
      EXTRACT(EPOCH FROM (NOW() - s.created_at)) / 3600 as waiting_hours
    FROM public.submissions s
    JOIN public.profiles p ON s.user_id = p.id
    WHERE s.status = 'WAITING_OPPONENT'
      AND s.created_at + INTERVAL '10 minutes' <= NOW()  -- 初期待機10分
    ORDER BY s.created_at ASC
  LOOP
    v_processed_count := v_processed_count + 1;
    v_waiting_hours := v_submission_rec.waiting_hours;
    v_submitter_rating := v_submission_rec.rating;
    v_submitter_username := v_submission_rec.username;
    
    -- 🎯 新しい積極的な時間ベース許容レート差システム
    IF v_waiting_hours < 3 THEN
      v_rating_tolerance := 100;  -- 0-3時間: ±100（最初の数時間は、質の高いマッチングを維持する）
    ELSIF v_waiting_hours < 12 THEN
      v_rating_tolerance := 200;  -- 3-12時間: ±200（半日以内に、マッチングの可能性を大きく広げる）
    ELSIF v_waiting_hours < 24 THEN
      v_rating_tolerance := 400;  -- 12-24時間: ±400（1日待てば、かなり広い範囲の相手とマッチングできる）
    ELSE
      v_rating_tolerance := 999999; -- 24時間以降: 無制限（24時間経過した投稿は、必ず誰かとマッチング）
    END IF;
    
    -- 🛡️ 重複バトル防止機能付き対戦相手検索
    -- 48時間以内に対戦したことがない相手のみを検索対象とする
    SELECT 
      s2.id,
      s2.user_id,
      s2.created_at,
      s2.video_url,
      p2.rating,
      p2.username
    INTO v_opponent_rec
    FROM public.submissions s2
    JOIN public.profiles p2 ON s2.user_id = p2.id
    WHERE s2.status = 'WAITING_OPPONENT'
      AND s2.id != v_submission_rec.id
      AND s2.user_id != v_submission_rec.user_id
      AND s2.battle_format = v_submission_rec.battle_format
      AND s2.created_at + INTERVAL '10 minutes' <= NOW()  -- 相手も10分間待機済み
      AND ABS(p2.rating - v_submitter_rating) <= v_rating_tolerance
      -- 🛡️ 重複バトル防止条件: 48時間以内に同じ相手との対戦履歴がないことを確認
      AND NOT EXISTS (
        -- active_battlesテーブルから48時間以内の対戦履歴をチェック
        SELECT 1 FROM public.active_battles ab
        JOIN public.submissions s1 ON (ab.player1_submission_id = s1.id OR ab.player2_submission_id = s1.id)
        JOIN public.submissions s3 ON (ab.player1_submission_id = s3.id OR ab.player2_submission_id = s3.id)
        WHERE ab.created_at >= NOW() - INTERVAL '48 hours'
          AND s1.user_id = v_submission_rec.user_id
          AND s3.user_id = s2.user_id
          AND s1.id != s3.id
      )
      AND NOT EXISTS (
        -- archived_battlesテーブルからも48時間以内の対戦履歴をチェック
        SELECT 1 FROM public.archived_battles ab
        JOIN public.submissions s1 ON (ab.player1_submission_id = s1.id OR ab.player2_submission_id = s1.id)
        JOIN public.submissions s3 ON (ab.player1_submission_id = s3.id OR ab.player2_submission_id = s3.id)
        WHERE ab.created_at >= NOW() - INTERVAL '48 hours'
          AND s1.user_id = v_submission_rec.user_id
          AND s3.user_id = s2.user_id
          AND s1.id != s3.id
      )
    ORDER BY ABS(p2.rating - v_submitter_rating) ASC, s2.created_at ASC
    LIMIT 1;
    
    -- マッチした場合はバトルを作成
    IF FOUND THEN
      -- バトル作成
      v_battle_id := gen_random_uuid();
      -- 🔄 投票期間を3日間に変更（5日→3日）
      v_voting_end_time := NOW() + INTERVAL '3 days';
      v_opponent_username := v_opponent_rec.username;
      
      -- active_battles テーブルに挿入
      INSERT INTO public.active_battles (
        id,
        player1_submission_id,
        player2_submission_id,
        player1_user_id,
        player2_user_id,
        battle_format,
        status,
        votes_a,
        votes_b,
        end_voting_at,
        created_at,
        updated_at
      ) VALUES (
        v_battle_id,
        v_submission_rec.id,
        v_opponent_rec.id,
        v_submission_rec.user_id,
        v_opponent_rec.user_id,
        v_submission_rec.battle_format,
        'ACTIVE',
        0,
        0,
        v_voting_end_time,
        NOW(),
        NOW()
      );
      
      -- 両方の投稿ステータスを更新
      UPDATE public.submissions 
      SET 
        status = 'MATCHED_IN_BATTLE',
        active_battle_id = v_battle_id,
        updated_at = NOW()
      WHERE id IN (v_submission_rec.id, v_opponent_rec.id);

      -- ✅ 段階的マッチング成功時の通知送信
      -- 投稿者への通知
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        related_battle_id,
        is_read,
        created_at,
        updated_at
      ) VALUES (
        v_submission_rec.user_id,
        'バトルマッチングが完了しました！',
        FORMAT('対戦相手 %s さんとのバトルが開始されました。投票期間は3日間です。', v_opponent_username),
        'battle_matched',
        v_battle_id,
        false,
        NOW(),
        NOW()
      );

      -- 相手への通知
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        related_battle_id,
        is_read,
        created_at,
        updated_at
      ) VALUES (
        v_opponent_rec.user_id,
        'バトルマッチングが完了しました！',
        FORMAT('対戦相手 %s さんとのバトルが開始されました。投票期間は3日間です。', v_submitter_username),
        'battle_matched',
        v_battle_id,
        false,
        NOW(),
        NOW()
      );
      
      v_matched_count := v_matched_count + 1;
      
      -- マッチング結果を記録
      v_match_result := json_build_object(
        'submission_id', v_submission_rec.id,
        'opponent_id', v_opponent_rec.id,
        'battle_id', v_battle_id,
        'submitter_rating', v_submitter_rating,
        'opponent_rating', v_opponent_rec.rating,
        'rating_difference', ABS(v_submitter_rating - v_opponent_rec.rating),
        'waiting_hours', ROUND(v_waiting_hours, 2),
        'rating_tolerance_used', v_rating_tolerance,
        'matched', true,
        'match_type', 'progressive_aggressive_with_duplicate_prevention',
        'voting_period_days', 3,
        'duplicate_prevention_active', true,
        'notifications_sent', 2
      );
      
      v_results := v_results || v_match_result;
      
      RAISE NOTICE 'Progressive aggressive match with duplicate prevention: % vs % (rating diff: %, waited: % hours, tolerance: ±%) - Notifications sent', 
        v_submission_rec.id, v_opponent_rec.id, 
        ABS(v_submitter_rating - v_opponent_rec.rating), ROUND(v_waiting_hours, 2), v_rating_tolerance;
        
    ELSE
      -- マッチしなかった場合の記録
      -- 重複防止により除外された候補数をカウント
      SELECT COUNT(*) INTO v_duplicate_prevention_count
      FROM public.submissions s2
      JOIN public.profiles p2 ON s2.user_id = p2.id
      WHERE s2.status = 'WAITING_OPPONENT'
        AND s2.id != v_submission_rec.id
        AND s2.user_id != v_submission_rec.user_id
        AND s2.battle_format = v_submission_rec.battle_format
        AND s2.created_at + INTERVAL '10 minutes' <= NOW()
        AND ABS(p2.rating - v_submitter_rating) <= v_rating_tolerance
        AND (
          EXISTS (
            SELECT 1 FROM public.active_battles ab
            JOIN public.submissions s1 ON (ab.player1_submission_id = s1.id OR ab.player2_submission_id = s1.id)
            JOIN public.submissions s3 ON (ab.player1_submission_id = s3.id OR ab.player2_submission_id = s3.id)
            WHERE ab.created_at >= NOW() - INTERVAL '48 hours'
              AND s1.user_id = v_submission_rec.user_id
              AND s3.user_id = s2.user_id
              AND s1.id != s3.id
          ) OR EXISTS (
            SELECT 1 FROM public.archived_battles ab
            JOIN public.submissions s1 ON (ab.player1_submission_id = s1.id OR ab.player2_submission_id = s1.id)
            JOIN public.submissions s3 ON (ab.player1_submission_id = s3.id OR ab.player2_submission_id = s3.id)
            WHERE ab.created_at >= NOW() - INTERVAL '48 hours'
              AND s1.user_id = v_submission_rec.user_id
              AND s3.user_id = s2.user_id
              AND s1.id != s3.id
          )
        );
      
      v_match_result := json_build_object(
        'submission_id', v_submission_rec.id,
        'submitter_rating', v_submitter_rating,
        'waiting_hours', ROUND(v_waiting_hours, 2),
        'rating_tolerance_used', v_rating_tolerance,
        'matched', false,
        'reason', 'No suitable opponent found',
        'candidates_excluded_by_duplicate_prevention', v_duplicate_prevention_count,
        'duplicate_prevention_active', true
      );
      
      v_results := v_results || v_match_result;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'processed_submissions', v_processed_count,
    'matches_created', v_matched_count,
    'results', v_results,
    'timestamp', NOW(),
    'function_version', 'v8_aggressive_time_based_matching_3day_voting',
    'execution_interval', '30_minutes',
    'initial_wait_period', '10_minutes',
    'duplicate_prevention_window', '48_hours',
    'voting_period_days', 3,
    'rating_tolerance_schedule', json_build_object(
      '0_to_3_hours', 100,
      '3_to_12_hours', 200,
      '12_to_24_hours', 400,
      '24_hours_plus', 'unlimited'
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in progressive_matchmaking: %', SQLERRM;
  RETURN json_build_object(
    'error', SQLERRM,
    'processed_submissions', v_processed_count,
    'matches_created', v_matched_count,
    'timestamp', NOW(),
    'function_version', 'v8_aggressive_time_based_matching_3day_voting'
  );
END;
$$;


ALTER FUNCTION "public"."progressive_matchmaking"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."progressive_matchmaking"() IS '
積極的な時間ベース段階的マッチングシステム + 重複バトル防止機能:

■ 新しい許容レート差システム（積極的マッチング）:
- 0-3時間: ±100レート差（最初の数時間は、質の高いマッチングを維持する）
- 3-12時間: ±200レート差（半日以内に、マッチングの可能性を大きく広げる）
- 12-24時間: ±400レート差（1日待てば、かなり広い範囲の相手とマッチングできるようにする）
- 24時間以降: 無制限（24時間経過した投稿は、必ず誰かとマッチングさせ、待ち続ける状態を完全になくす）

■ 重複バトル防止機能:
- 48時間以内に同じ相手と対戦したユーザー同士は再マッチしない
- active_battlesとarchived_battlesの両方から履歴チェック

■ 通知機能:
- マッチング成立時に両プレイヤーに自動通知送信

■ 実行仕様:
- 実行間隔: 30分ごと（pg_cron）
- 初期待機期間: 10分間（即時マッチングとの競合回避）
- 投票期間: 5日間
';



CREATE OR REPLACE FUNCTION "public"."recompute_season_points_fixed"("p_season_id" "uuid" DEFAULT NULL::"uuid", "p_base_points" integer DEFAULT 1200, "p_dry_run" boolean DEFAULT true) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_season_id uuid;
  v_total_battles int := 0;
  v_participants int := 0;
  v_skipped_deleted int := 0;
BEGIN
  -- Resolve season
  IF p_season_id IS NULL THEN
    SELECT id
    INTO v_season_id
    FROM seasons
    WHERE status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    v_season_id := p_season_id;
  END IF;

  IF v_season_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_active_season',
      'message', 'アクティブなシーズンが見つかりません'
    );
  END IF;

  WITH battles AS (
    SELECT *
    FROM archived_battles ab
    WHERE ab.season_id = v_season_id
  ),
  deltas AS (
    -- Player1 perspective
    SELECT
      b.player1_user_id AS user_id,
      CASE
        WHEN b.winner_id IS NULL THEN 8
        WHEN b.winner_id = b.player1_user_id THEN 16
        WHEN b.winner_id = b.player2_user_id THEN 4
        ELSE 0
      END::int AS delta
    FROM battles b
    UNION ALL
    -- Player2 perspective
    SELECT
      b.player2_user_id AS user_id,
      CASE
        WHEN b.winner_id IS NULL THEN 8
        WHEN b.winner_id = b.player2_user_id THEN 16
        WHEN b.winner_id = b.player1_user_id THEN 4
        ELSE 0
      END::int AS delta
    FROM battles b
  ),
  totals AS (
    SELECT d.user_id, SUM(d.delta)::int AS total_delta
    FROM deltas d
    GROUP BY d.user_id
  ),
  joined AS (
    SELECT t.user_id,
           t.total_delta,
           p.season_points AS old_points,
           GREATEST(p_base_points + t.total_delta, 1100) AS new_points,
           COALESCE(p.is_deleted, FALSE) AS is_deleted
    FROM totals t
    JOIN profiles p ON p.id = t.user_id
  ),
  active_users AS (
    SELECT * FROM joined WHERE is_deleted = FALSE
  ),
  deleted_users AS (
    SELECT * FROM joined WHERE is_deleted = TRUE
  )
  SELECT
    (SELECT COUNT(*) FROM battles),
    (SELECT COUNT(*) FROM active_users),
    (SELECT COUNT(*) FROM deleted_users)
  INTO v_total_battles, v_participants, v_skipped_deleted;

  IF NOT p_dry_run THEN
    WITH battles AS (
      SELECT *
      FROM archived_battles ab
      WHERE ab.season_id = v_season_id
    ),
    deltas AS (
      SELECT b.player1_user_id AS user_id,
             CASE
               WHEN b.winner_id IS NULL THEN 8
               WHEN b.winner_id = b.player1_user_id THEN 16
               WHEN b.winner_id = b.player2_user_id THEN 4
               ELSE 0
             END::int AS delta
      FROM battles b
      UNION ALL
      SELECT b.player2_user_id AS user_id,
             CASE
               WHEN b.winner_id IS NULL THEN 8
               WHEN b.winner_id = b.player2_user_id THEN 16
               WHEN b.winner_id = b.player1_user_id THEN 4
               ELSE 0
             END::int AS delta
      FROM battles b
    ),
    totals AS (
      SELECT d.user_id, SUM(d.delta)::int AS total_delta
      FROM deltas d
      GROUP BY d.user_id
    ),
    joined AS (
      SELECT t.user_id,
             t.total_delta,
             p.season_points AS old_points,
             GREATEST(p_base_points + t.total_delta, 1100) AS new_points,
             COALESCE(p.is_deleted, FALSE) AS is_deleted
      FROM totals t
      JOIN profiles p ON p.id = t.user_id
    ),
    active_users AS (
      SELECT * FROM joined WHERE is_deleted = FALSE
    )
    UPDATE profiles p
    SET season_points = au.new_points,
        updated_at = NOW()
    FROM active_users au
    WHERE p.id = au.user_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'season_id', v_season_id,
    'base_points', p_base_points,
    'dry_run', p_dry_run,
    'total_battles', v_total_battles,
    'participants', v_participants,
    'skipped_deleted_users', v_skipped_deleted,
    'changes_preview', (
      SELECT COALESCE(json_agg(row_to_json(x)), '[]'::json)
      FROM (
        WITH battles AS (
          SELECT *
          FROM archived_battles ab
          WHERE ab.season_id = v_season_id
        ),
        deltas AS (
          SELECT b.player1_user_id AS user_id,
                 CASE
                   WHEN b.winner_id IS NULL THEN 8
                   WHEN b.winner_id = b.player1_user_id THEN 16
                   WHEN b.winner_id = b.player2_user_id THEN 4
                   ELSE 0
                 END::int AS delta
          FROM battles b
          UNION ALL
          SELECT b.player2_user_id AS user_id,
                 CASE
                   WHEN b.winner_id IS NULL THEN 8
                   WHEN b.winner_id = b.player2_user_id THEN 16
                   WHEN b.winner_id = b.player1_user_id THEN 4
                   ELSE 0
                 END::int AS delta
          FROM battles b
        ),
        totals AS (
          SELECT d.user_id, SUM(d.delta)::int AS total_delta
          FROM deltas d
          GROUP BY d.user_id
        ),
        joined AS (
          SELECT t.user_id,
                 t.total_delta,
                 p.season_points AS old_points,
                 GREATEST(p_base_points + t.total_delta, 1100) AS new_points,
                 COALESCE(p.is_deleted, FALSE) AS is_deleted
          FROM totals t
          JOIN profiles p ON p.id = t.user_id
        ),
        active_users AS (
          SELECT * FROM joined WHERE is_deleted = FALSE
        )
        SELECT user_id, old_points, new_points, (new_points - old_points) AS change, total_delta
        FROM active_users
        ORDER BY total_delta DESC
        LIMIT 50
      ) x
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'recompute_failed',
      'error_details', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."recompute_season_points_fixed"("p_season_id" "uuid", "p_base_points" integer, "p_dry_run" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recompute_season_vote_metrics"("p_season_id" "uuid" DEFAULT NULL::"uuid", "p_truncate" boolean DEFAULT true) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_season_id uuid;
  v_rows int := 0;
  v_battles int := 0;
  v_rec record;
BEGIN
  -- Resolve season when NULL: use active season
  IF p_season_id IS NULL THEN
    SELECT id INTO v_season_id FROM public.seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1;
  ELSE
    v_season_id := p_season_id;
  END IF;

  IF v_season_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'no_active_season');
  END IF;

  IF p_truncate THEN
    DELETE FROM public.season_user_metrics WHERE season_id = v_season_id;
  END IF;

  FOR v_rec IN SELECT id FROM public.archived_battles WHERE season_id = v_season_id ORDER BY archived_at ASC LOOP
    PERFORM public.update_season_vote_metrics_after_battle(v_rec.id);
    v_battles := v_battles + 1;
  END LOOP;

  SELECT COUNT(*) INTO v_rows FROM public.season_user_metrics WHERE season_id = v_season_id;

  RETURN json_build_object('success', true, 'season_id', v_season_id, 'battles_processed', v_battles, 'rows', v_rows);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."recompute_season_vote_metrics"("p_season_id" "uuid", "p_truncate" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_phone_verification"("p_user_id" "uuid", "p_phone_number" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  normalized_phone TEXT;
  existing_record RECORD;
  old_phone_hash TEXT;
  new_phone_hash TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_user_id',
      'message', 'ユーザーIDが無効です。'
    );
  END IF;
  
  IF p_phone_number IS NULL OR trim(p_phone_number) = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_phone_number',
      'message', '電話番号が入力されていません。'
    );
  END IF;
  
  normalized_phone := normalize_phone_number(p_phone_number);
  IF normalized_phone IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_phone_format',
      'message', '電話番号の形式が正しくありません。'
    );
  END IF;
  
  SELECT * INTO existing_record
  FROM phone_verifications
  WHERE user_id = p_user_id AND is_active = true;
  
  IF FOUND THEN
    -- ハッシュ化を事前に行う（byteaキャスト付き）
    old_phone_hash := encode(sha256(existing_record.phone_number::bytea), 'hex');
    new_phone_hash := encode(sha256(normalized_phone::bytea), 'hex');
    
    UPDATE phone_verifications 
    SET 
      phone_number = normalized_phone,
      verified_at = NOW(),
      updated_at = NOW()
    WHERE user_id = p_user_id AND is_active = true;
    
    PERFORM log_audit_event(
      'phone_verifications',
      'UPDATE',
      p_user_id,
      json_build_object(
        'old_phone_hash', old_phone_hash,
        'new_phone_hash', new_phone_hash
      )::jsonb
    );
  ELSE
    -- ハッシュ化を事前に行う（byteaキャスト付き）
    new_phone_hash := encode(sha256(normalized_phone::bytea), 'hex');
    
    INSERT INTO phone_verifications (
      user_id,
      phone_number,
      verified_at,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      normalized_phone,
      NOW(),
      NOW(),
      NOW()
    );
    
    PERFORM log_audit_event(
      'phone_verifications',
      'INSERT',
      p_user_id,
      json_build_object(
        'phone_number_hash', new_phone_hash
      )::jsonb
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'phone_number_hash', encode(sha256(normalized_phone::bytea), 'hex'),
    'message', '電話番号認証を記録しました。'
  );
  
EXCEPTION
  WHEN unique_violation THEN
    PERFORM log_security_event(
      'PHONE_DUPLICATE_ATTEMPT',
      p_user_id,
      normalized_phone,
      json_build_object(
        'context', 'record_verification',
        'error', SQLERRM
      )::jsonb
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'phone_already_exists',
      'message', 'この電話番号は既に他のアカウントで使用されています。'
    );
  WHEN others THEN
    PERFORM log_audit_event(
      'phone_verifications',
      'INSERT',
      p_user_id,
      json_build_object(
        'error', SQLERRM,
        'sqlstate', SQLSTATE
      )::jsonb,
      false,
      SQLERRM
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'system_error',
      'message', 'システムエラーが発生しました。しばらくしてからお試しください。'
    );
END;
$$;


ALTER FUNCTION "public"."record_phone_verification"("p_user_id" "uuid", "p_phone_number" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_mv_ad_stats_daily"() RETURNS TABLE("refreshed" boolean, "rows" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_after int;
begin
  refresh materialized view mv_ad_stats_daily;
  select count(*) into v_after from mv_ad_stats_daily;
  return query select true as refreshed, v_after as rows;
end;$$;


ALTER FUNCTION "public"."refresh_mv_ad_stats_daily"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_mv_ad_stats_daily"() IS 'Refresh mv_ad_stats_daily (non-concurrent) and return row count.';



CREATE OR REPLACE FUNCTION "public"."restore_season_points_from_snapshot"("p_season_id" "uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_season_id uuid := p_season_id;
  v_target_ts timestamptz;
  v_rows int := 0;
BEGIN
  IF v_season_id IS NULL THEN
    SELECT id INTO v_season_id FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1;
  END IF;

  IF v_season_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'no_active_season');
  END IF;

  SELECT MAX(captured_at) INTO v_target_ts
  FROM public.season_points_snapshots
  WHERE season_id = v_season_id
    AND (p_note IS NULL OR note = p_note);

  IF v_target_ts IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'no_snapshot');
  END IF;

  WITH latest AS (
    SELECT s.user_id, s.season_points
    FROM public.season_points_snapshots s
    WHERE s.season_id = v_season_id AND s.captured_at = v_target_ts
  )
  UPDATE public.profiles p
  SET season_points = l.season_points,
      updated_at = NOW()
  FROM latest l
  WHERE p.id = l.user_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'season_id', v_season_id,
    'restored_rows', v_rows,
    'captured_at', v_target_ts,
    'note', p_note
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'restore_failed', 'error_details', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."restore_season_points_from_snapshot"("p_season_id" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."safe_delete_user_account"("p_user_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  -- 新しいv4関数を呼び出し
  RETURN safe_delete_user_account_v4(p_user_id);
END;
$$;


ALTER FUNCTION "public"."safe_delete_user_account"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."safe_delete_user_account"("p_user_id" "uuid") IS '改良版：auth.usersのメールアドレスも匿名化し、メールアドレスの再利用を可能にする安全な削除関数。';



CREATE OR REPLACE FUNCTION "public"."safe_delete_user_account_v4"("p_user_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_has_active_battles BOOLEAN := FALSE;
  v_has_archived_battles BOOLEAN := FALSE;
  v_username TEXT;
  v_original_email TEXT;
  v_permanently_anonymized_email TEXT;
  v_timestamp BIGINT;
  v_video_deletion_result JSON;
  v_identities_deleted INTEGER := 0;
BEGIN
  -- 現在のユーザー名とメールアドレスを取得
  SELECT username INTO v_username FROM profiles WHERE id = p_user_id;
  SELECT email INTO v_original_email FROM auth.users WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- タイムスタンプ付きの完全に一意な匿名化メールアドレスを生成
  v_timestamp := EXTRACT(EPOCH FROM NOW())::BIGINT;
  v_permanently_anonymized_email := 'permanently-deleted-' || v_timestamp || '-' || SUBSTRING(p_user_id::text, 1, 8) || '@void.deleted';

  -- 🎬 ユーザーの動画データを全て削除
  BEGIN
    SELECT delete_user_videos_from_storage(p_user_id) INTO v_video_deletion_result;
  EXCEPTION WHEN OTHERS THEN
    -- 動画削除に失敗してもアカウント削除は継続
    v_video_deletion_result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'deleted_count', 0,
      'failed_count', 0
    );
  END;

  -- アクティブバトルの存在確認
  SELECT EXISTS(
    SELECT 1 FROM active_battles 
    WHERE player1_user_id = p_user_id OR player2_user_id = p_user_id
  ) INTO v_has_active_battles;
  
  -- アーカイブバトルの存在確認
  SELECT EXISTS(
    SELECT 1 FROM archived_battles 
    WHERE player1_user_id = p_user_id OR player2_user_id = p_user_id
  ) INTO v_has_archived_battles;
  
  -- 🆕 auth.identitiesテーブルからも完全削除（メール解放の鍵）
  DELETE FROM auth.identities 
  WHERE user_id = p_user_id 
     OR identity_data::text LIKE '%' || v_original_email || '%';
  GET DIAGNOSTICS v_identities_deleted = ROW_COUNT;
  
  -- アクティブバトルまたはアーカイブバトルがある場合はソフト削除（完全メール解放版）
  IF v_has_active_battles OR v_has_archived_battles THEN
    
    -- 進行中のバトルがある場合は強制終了処理
    IF v_has_active_battles THEN
      UPDATE active_battles 
      SET status = 'PROCESSING_RESULTS',
          updated_at = NOW()
      WHERE (player1_user_id = p_user_id OR player2_user_id = p_user_id)
        AND status = 'ACTIVE';
    END IF;
    
    -- profilesテーブルをソフト削除（匿名化）
    UPDATE profiles 
    SET 
      is_deleted = TRUE,
      deleted_at = NOW(),
      username = 'deleted-user-' || SUBSTRING(p_user_id::text, 1, 8),
      email = v_permanently_anonymized_email,
      avatar_url = NULL,
      bio = 'このアカウントは削除されました',
      updated_at = NOW()
    WHERE id = p_user_id;
    
    -- 🆕 auth.usersテーブルのメールアドレスを完全に匿名化（元のメール情報も完全削除）
    UPDATE auth.users
    SET 
      email = v_permanently_anonymized_email,
      raw_user_meta_data = jsonb_build_object(
        'permanently_deleted', true,
        'deletion_timestamp', v_timestamp,
        'original_email_permanently_released', true,
        'deletion_method', 'soft_delete_with_complete_email_release_v4',
        'identities_deleted', v_identities_deleted,
        'videos_deleted', v_video_deletion_result
      ),
      updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN json_build_object(
      'success', true, 
      'method', 'soft_delete_with_complete_email_release_v4',
      'reason', CASE 
        WHEN v_has_active_battles THEN 'User has active battles'
        ELSE 'User has battle history'
      END,
      'original_username', v_username,
      'original_email_completely_released', true,
      'email_available_for_immediate_reuse', true,
      'identities_deleted', v_identities_deleted,
      'timestamp', v_timestamp,
      'video_cleanup', v_video_deletion_result
    );
    
  ELSE
    -- バトル履歴がない場合は物理削除（完全削除版）
    
    -- 関連データを全て削除
    DELETE FROM battle_votes WHERE user_id = p_user_id;
    DELETE FROM notifications WHERE user_id = p_user_id;
    DELETE FROM submissions WHERE user_id = p_user_id;
    DELETE FROM posts WHERE user_id = p_user_id;
    DELETE FROM comments WHERE user_id = p_user_id;
    DELETE FROM profiles WHERE id = p_user_id;
    
    -- auth.usersからも完全削除
    DELETE FROM auth.users WHERE id = p_user_id;
    
    RETURN json_build_object(
      'success', true, 
      'method', 'complete_physical_delete_v4',
      'reason', 'No battle history found',
      'original_username', v_username,
      'original_email_completely_released', true,
      'email_available_for_immediate_reuse', true,
      'identities_deleted', v_identities_deleted,
      'video_cleanup', v_video_deletion_result
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."safe_delete_user_account_v4"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."safe_delete_user_account_v4"("p_user_id" "uuid") IS 'アカウント削除v4: auth.identitiesも含む完全なメールアドレス解放システム';



CREATE OR REPLACE FUNCTION "public"."set_user_language_from_browser"("p_user_id" "uuid", "p_browser_language" "text" DEFAULT NULL::"text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_detected_language TEXT;
BEGIN
  -- ブラウザ言語から対応言語を判定
  IF p_browser_language IS NULL THEN
    -- デフォルトは英語
    v_detected_language := 'en';
  ELSIF p_browser_language ILIKE 'ja%' OR p_browser_language ILIKE '%jp%' THEN
    -- 日本語の場合
    v_detected_language := 'ja';
  ELSIF p_browser_language ILIKE 'en%' THEN
    -- 英語の場合
    v_detected_language := 'en';
  ELSE
    -- その他の言語は英語をデフォルト
    v_detected_language := 'en';
  END IF;
  
  -- profilesテーブルを更新
  UPDATE profiles 
  SET 
    language = v_detected_language,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'browser_language', p_browser_language,
    'detected_language', v_detected_language,
    'supported_languages', ARRAY['ja', 'en']
  );
END;
$$;


ALTER FUNCTION "public"."set_user_language_from_browser"("p_user_id" "uuid", "p_browser_language" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_user_language_from_browser"("p_user_id" "uuid", "p_browser_language" "text") IS 'ブラウザ言語設定からユーザー言語を自動検出・設定';



CREATE OR REPLACE FUNCTION "public"."setup_custom_email_templates"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  -- この関数は設定の記録用
  -- 実際のメールテンプレートはSupabaseダッシュボードで設定
  
  RETURN 'Custom email templates configuration documented. Please configure in Supabase Dashboard > Authentication > Email Templates';
END;
$$;


ALTER FUNCTION "public"."setup_custom_email_templates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."snapshot_season_points"("p_season_id" "uuid" DEFAULT NULL::"uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_season_id uuid;
  v_rows int := 0;
BEGIN
  IF p_season_id IS NULL THEN
    SELECT id
    INTO v_season_id
    FROM seasons
    WHERE status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    v_season_id := p_season_id;
  END IF;

  IF v_season_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'no_active_season');
  END IF;

  INSERT INTO public.season_points_snapshots (season_id, user_id, season_points, note)
  SELECT v_season_id, p.id, p.season_points, p_note
  FROM public.profiles p;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'season_id', v_season_id,
    'captured_rows', v_rows,
    'note', p_note
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'snapshot_failed',
      'error_details', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."snapshot_season_points"("p_season_id" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_new_season"() RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_existing_active_season RECORD;
  v_target_season RECORD;
  v_current_time TIMESTAMPTZ := NOW();
  v_user_count INTEGER := 0;
BEGIN
  -- アクティブなシーズンが既に存在するかチェック
  SELECT * INTO v_existing_active_season
  FROM seasons 
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'active_season_exists',
      'message', 'アクティブなシーズンが既に存在します',
      'existing_season', json_build_object(
        'id', v_existing_active_season.id,
        'name', v_existing_active_season.name,
        'start_at', v_existing_active_season.start_at,
        'end_at', v_existing_active_season.end_at
      )
    );
  END IF;

  -- upcomingシーズンの中で、開始時間が現在時刻より前で最も近いものを取得
  SELECT * INTO v_target_season
  FROM seasons 
  WHERE status = 'upcoming'          -- upcomingのみ対象（endedを除外）
    AND start_at <= v_current_time   -- 開始時間が現在時刻より前
  ORDER BY start_at DESC             -- 現在時刻に最も近い（新しい）もの
  LIMIT 1;
  
  -- 適切なシーズンが見つからない場合
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_suitable_season',
      'message', '開始可能なシーズンが見つかりません。開始時間が現在時刻より前のupcomingシーズンが必要です。',
      'current_time', v_current_time
    );
  END IF;
  
  -- シーズンをアクティブ化
  UPDATE seasons 
  SET 
    status = 'active',
    updated_at = v_current_time
  WHERE id = v_target_season.id;
  
  -- 全ユーザーにシーズン開始通知を作成
  INSERT INTO notifications (user_id, title, message, type, related_season_id)
  SELECT 
    auth.users.id,
    '🎉 新シーズン開始！',
    v_target_season.name || ' が開始されました！新しいバトルにチャレンジしましょう！',
    'season_start',
    v_target_season.id
  FROM auth.users
  WHERE auth.users.id IN (SELECT id FROM profiles); -- プロフィールが存在するユーザーのみ
  
  -- 作成された通知数を取得
  GET DIAGNOSTICS v_user_count = ROW_COUNT;
  
  -- 成功レスポンス
  RETURN json_build_object(
    'success', true,
    'activated_season', json_build_object(
      'id', v_target_season.id,
      'name', v_target_season.name,
      'start_at', v_target_season.start_at,
      'end_at', v_target_season.end_at,
      'previous_status', 'upcoming',
      'activated_at', v_current_time
    ),
    'notifications_created', v_user_count,
    'message', 'シーズンが正常にアクティブ化され、' || v_user_count || '人のユーザーに通知が送信されました。'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- エラーが発生した場合
    RETURN json_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'シーズンアクティブ化中にエラーが発生しました: ' || SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."start_new_season"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_video"("p_video_url" "text", "p_battle_format" "public"."battle_format" DEFAULT 'MAIN_BATTLE'::"public"."battle_format") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
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
$$;


ALTER FUNCTION "public"."submit_video"("p_video_url" "text", "p_battle_format" "public"."battle_format") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."submit_video"("p_video_url" "text", "p_battle_format" "public"."battle_format") IS 'バトル投稿機能（v2.0）- シーズン終了1日前から投稿停止。2025-07-28に修正。';



CREATE OR REPLACE FUNCTION "public"."sync_user_community"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  -- メンバー追加時
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles 
    SET current_community_id = NEW.community_id 
    WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;
  
  -- メンバー削除時
  IF TG_OP = 'DELETE' THEN
    UPDATE profiles 
    SET current_community_id = NULL 
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_user_community"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_update_season_vote_metrics_after_battle"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM public.update_season_vote_metrics_after_battle(NEW.id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."tg_update_season_vote_metrics_after_battle"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_battle_ratings_safe"("p_battle_id" "uuid", "p_winner_id" "uuid", "p_player1_deleted" boolean DEFAULT false, "p_player2_deleted" boolean DEFAULT false) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_battle active_battles;
  v_player1_rating INTEGER;
  v_player2_rating INTEGER;
  v_player1_new_rating INTEGER;
  v_player2_new_rating INTEGER;
  v_player1_change INTEGER;
  v_player2_change INTEGER;
  v_k_factor INTEGER;
BEGIN
  -- Get battle details
  SELECT * INTO v_battle FROM active_battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    -- Try archived battles
    SELECT 
      player1_user_id, player2_user_id, battle_format
    INTO 
      v_battle.player1_user_id, v_battle.player2_user_id, v_battle.battle_format
    FROM archived_battles 
    WHERE original_battle_id = p_battle_id;
  END IF;

  -- Get K-factor for battle format
  SELECT get_k_factor_by_format(v_battle.battle_format) INTO v_k_factor;

  -- Get current ratings (only for non-deleted users)
  IF NOT p_player1_deleted THEN
    SELECT rating INTO v_player1_rating FROM profiles WHERE id = v_battle.player1_user_id;
  END IF;
  
  IF NOT p_player2_deleted THEN
    SELECT rating INTO v_player2_rating FROM profiles WHERE id = v_battle.player2_user_id;
  END IF;

  -- Calculate and update ratings only for non-deleted users
  IF NOT p_player1_deleted AND NOT p_player2_deleted THEN
    -- Both users active: normal rating calculation
    IF p_winner_id = v_battle.player1_user_id THEN
      -- Player 1 wins
      SELECT calculate_elo_rating_change(v_player1_rating, v_player2_rating, 1.0, v_k_factor) INTO v_player1_change;
      SELECT calculate_elo_rating_change(v_player2_rating, v_player1_rating, 0.0, v_k_factor) INTO v_player2_change;
    ELSIF p_winner_id = v_battle.player2_user_id THEN
      -- Player 2 wins
      SELECT calculate_elo_rating_change(v_player1_rating, v_player2_rating, 0.0, v_k_factor) INTO v_player1_change;
      SELECT calculate_elo_rating_change(v_player2_rating, v_player1_rating, 1.0, v_k_factor) INTO v_player2_change;
    ELSE
      -- Tie
      SELECT calculate_elo_rating_change(v_player1_rating, v_player2_rating, 0.5, v_k_factor) INTO v_player1_change;
      SELECT calculate_elo_rating_change(v_player2_rating, v_player1_rating, 0.5, v_k_factor) INTO v_player2_change;
    END IF;

    -- Apply rating changes
    v_player1_new_rating := v_player1_rating + v_player1_change;
    v_player2_new_rating := v_player2_rating + v_player2_change;

    -- Update profiles
    UPDATE profiles SET rating = v_player1_new_rating WHERE id = v_battle.player1_user_id;
    UPDATE profiles SET rating = v_player2_new_rating WHERE id = v_battle.player2_user_id;

  ELSIF NOT p_player1_deleted THEN
    -- Only player 1 active: gets win bonus if they won
    IF p_winner_id = v_battle.player1_user_id THEN
      v_player1_change := v_k_factor / 2; -- Half K-factor bonus for winning against deleted user
    ELSE
      v_player1_change := 0; -- No penalty for losing to deleted user
    END IF;
    
    v_player1_new_rating := v_player1_rating + v_player1_change;
    UPDATE profiles SET rating = v_player1_new_rating WHERE id = v_battle.player1_user_id;
    
  ELSIF NOT p_player2_deleted THEN
    -- Only player 2 active: gets win bonus if they won
    IF p_winner_id = v_battle.player2_user_id THEN
      v_player2_change := v_k_factor / 2; -- Half K-factor bonus for winning against deleted user
    ELSE
      v_player2_change := 0; -- No penalty for losing to deleted user
    END IF;
    
    v_player2_new_rating := v_player2_rating + v_player2_change;
    UPDATE profiles SET rating = v_player2_new_rating WHERE id = v_battle.player2_user_id;
  END IF;

  -- Update archived battle with rating changes
  UPDATE archived_battles 
  SET 
    player1_rating_change = COALESCE(v_player1_change, 0),
    player2_rating_change = COALESCE(v_player2_change, 0),
    player1_final_rating = COALESCE(v_player1_new_rating, v_player1_rating),
    player2_final_rating = COALESCE(v_player2_new_rating, v_player2_rating)
  WHERE original_battle_id = p_battle_id;

  RETURN json_build_object(
    'success', true,
    'player1_rating_change', COALESCE(v_player1_change, 0),
    'player2_rating_change', COALESCE(v_player2_change, 0),
    'player1_new_rating', COALESCE(v_player1_new_rating, v_player1_rating),
    'player2_new_rating', COALESCE(v_player2_new_rating, v_player2_rating),
    'player1_deleted', p_player1_deleted,
    'player2_deleted', p_player2_deleted
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to update ratings safely',
      'error_details', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."update_battle_ratings_safe"("p_battle_id" "uuid", "p_winner_id" "uuid", "p_player1_deleted" boolean, "p_player2_deleted" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_community_stats"("p_community_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  UPDATE communities
  SET 
    member_count = (
      SELECT COUNT(*) FROM community_members
      WHERE community_id = p_community_id
    ),
    average_rating = COALESCE((
      SELECT AVG(p.rating)::integer
      FROM community_members cm
      JOIN profiles p ON cm.user_id = p.id
      WHERE cm.community_id = p_community_id
    ), 1200),
    updated_at = now()
  WHERE id = p_community_id;
END;
$$;


ALTER FUNCTION "public"."update_community_stats"("p_community_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_community_stats_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  UPDATE communities c
  SET 
    member_count = (
      SELECT COUNT(*) FROM community_members 
      WHERE community_id = c.id
    ),
    average_rating = COALESCE((
      SELECT AVG(p.rating)::integer 
      FROM community_members cm
      JOIN profiles p ON cm.user_id = p.id
      WHERE cm.community_id = c.id
    ), 1200),
    updated_at = now()
  WHERE c.id = COALESCE(NEW.community_id, OLD.community_id);
  
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_community_stats_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_member_role"("p_community_id" "uuid", "p_target_user_id" "uuid", "p_new_role" "public"."community_role") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_user_id uuid;
  v_user_role community_role;
BEGIN
  v_user_id := auth.uid();
  
  -- 実行者の役割を確認
  SELECT role INTO v_user_role
  FROM public.community_members
  WHERE community_id = p_community_id AND user_id = v_user_id;

  -- オーナーのみ役割変更可能
  IF v_user_role != 'owner' THEN
    RETURN json_build_object('success', false, 'message', 'Only owner can change member roles');
  END IF;

  -- 自分自身の役割は変更不可
  IF v_user_id = p_target_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Cannot change your own role');
  END IF;

  -- ownerロールは設定不可（所有権譲渡は別関数）
  IF p_new_role = 'owner' THEN
    RETURN json_build_object('success', false, 'message', 'Use transfer_ownership function to change owner');
  END IF;

  -- 役割を更新
  UPDATE public.community_members
  SET role = p_new_role
  WHERE community_id = p_community_id AND user_id = p_target_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Target user is not a member');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Role updated successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."update_member_role"("p_community_id" "uuid", "p_target_user_id" "uuid", "p_new_role" "public"."community_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_onboarding_status"("p_user_id" "uuid", "p_has_seen_onboarding" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  UPDATE profiles 
  SET 
    has_seen_onboarding = p_has_seen_onboarding,
    updated_at = now()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ユーザーが見つかりません: %', p_user_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_onboarding_status"("p_user_id" "uuid", "p_has_seen_onboarding" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_post_comments_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.posts
        SET comments_count = comments_count + 1
        WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.posts
        SET comments_count = GREATEST(0, comments_count - 1) -- Ensure count doesn't go below 0
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$$;


ALTER FUNCTION "public"."update_post_comments_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_season_points_after_battle"("p_battle_id" "uuid", "p_winner_id" "uuid" DEFAULT NULL::"uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_battle RECORD;
  v_player1_season_points INTEGER;
  v_player2_season_points INTEGER;
  v_player1_new_points INTEGER;
  v_player2_new_points INTEGER;
  v_player1_change INTEGER := 0;
  v_player2_change INTEGER := 0;
  v_current_season_id UUID;
  v_player1_deleted BOOLEAN := FALSE;
  v_player2_deleted BOOLEAN := FALSE;
  v_player1_loss_streak_before INTEGER := 0;
  v_player2_loss_streak_before INTEGER := 0;
  v_player1_loss_streak_after  INTEGER := 0;
  v_player2_loss_streak_after  INTEGER := 0;
BEGIN
  SELECT id INTO v_current_season_id FROM seasons WHERE status='active' ORDER BY created_at DESC LIMIT 1;
  IF v_current_season_id IS NULL THEN
    RETURN json_build_object('success', false,'error','no_active_season','message','アクティブなシーズンが見つかりません');
  END IF;

  SELECT ab.player1_user_id, ab.player2_user_id, ab.battle_format INTO v_battle
  FROM archived_battles ab
  WHERE ab.original_battle_id = p_battle_id OR ab.id = p_battle_id;
  IF NOT FOUND THEN
    SELECT player1_user_id, player2_user_id, battle_format INTO v_battle FROM active_battles WHERE id = p_battle_id;
  END IF;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false,'error','battle_not_found','message','バトルが見つかりません');
  END IF;

  SELECT COALESCE(is_deleted,false) INTO v_player1_deleted FROM profiles WHERE id = v_battle.player1_user_id;
  SELECT COALESCE(is_deleted,false) INTO v_player2_deleted FROM profiles WHERE id = v_battle.player2_user_id;
  IF NOT v_player1_deleted THEN SELECT season_points INTO v_player1_season_points FROM profiles WHERE id=v_battle.player1_user_id; END IF;
  IF NOT v_player2_deleted THEN SELECT season_points INTO v_player2_season_points FROM profiles WHERE id=v_battle.player2_user_id; END IF;

  IF NOT v_player1_deleted THEN v_player1_loss_streak_before := get_loss_streak_before_battle(v_battle.player1_user_id, v_current_season_id, p_battle_id); END IF;
  IF NOT v_player2_deleted THEN v_player2_loss_streak_before := get_loss_streak_before_battle(v_battle.player2_user_id, v_current_season_id, p_battle_id); END IF;

  IF p_winner_id IS NULL THEN
    IF NOT v_player1_deleted THEN v_player1_change := 8; v_player1_loss_streak_after := 0; END IF;
    IF NOT v_player2_deleted THEN v_player2_change := 8; v_player2_loss_streak_after := 0; END IF;
  ELSIF p_winner_id = v_battle.player1_user_id THEN
    IF NOT v_player1_deleted THEN v_player1_change := 16; v_player1_loss_streak_after := 0; END IF;
    IF NOT v_player2_deleted THEN v_player2_change := CASE v_player2_loss_streak_before WHEN 0 THEN 4 WHEN 1 THEN 2 ELSE 0 END; v_player2_loss_streak_after := v_player2_loss_streak_before + 1; END IF;
  ELSIF p_winner_id = v_battle.player2_user_id THEN
    IF NOT v_player2_deleted THEN v_player2_change := 16; v_player2_loss_streak_after := 0; END IF;
    IF NOT v_player1_deleted THEN v_player1_change := CASE v_player1_loss_streak_before WHEN 0 THEN 4 WHEN 1 THEN 2 ELSE 0 END; v_player1_loss_streak_after := v_player1_loss_streak_before + 1; END IF;
  ELSE
    v_player1_loss_streak_after := v_player1_loss_streak_before;
    v_player2_loss_streak_after := v_player2_loss_streak_before;
  END IF;

  IF NOT v_player1_deleted THEN
    v_player1_new_points := GREATEST(v_player1_season_points + v_player1_change, 1100);
    UPDATE profiles SET season_points = v_player1_new_points, updated_at = NOW() WHERE id = v_battle.player1_user_id;
  END IF;
  IF NOT v_player2_deleted THEN
    v_player2_new_points := GREATEST(v_player2_season_points + v_player2_change, 1100);
    UPDATE profiles SET season_points = v_player2_new_points, updated_at = NOW() WHERE id = v_battle.player2_user_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'season_id', v_current_season_id,
    'battle_format', v_battle.battle_format,
    'calculation_method', 'fixed_points_loss_decay_v1',
    'is_tie', (p_winner_id IS NULL),
    'player1_deleted', v_player1_deleted,
    'player2_deleted', v_player2_deleted,
    'player1_points', json_build_object('old_points', COALESCE(v_player1_season_points,0),'change',COALESCE(v_player1_change,0),'new_points', COALESCE(v_player1_new_points,v_player1_season_points,0)),
    'player2_points', json_build_object('old_points', COALESCE(v_player2_season_points,0),'change',COALESCE(v_player2_change,0),'new_points', COALESCE(v_player2_new_points,v_player2_season_points,0)),
    'player1_loss_streak_before', v_player1_loss_streak_before,
    'player1_loss_streak_after', v_player1_loss_streak_after,
    'player2_loss_streak_before', v_player2_loss_streak_before,
    'player2_loss_streak_after', v_player2_loss_streak_after
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false,'error','Failed to update season points (loss decay)','error_details', SQLERRM);
END;$$;


ALTER FUNCTION "public"."update_season_points_after_battle"("p_battle_id" "uuid", "p_winner_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_season_points_after_battle"("p_battle_id" "uuid", "p_winner_id" "uuid") IS 'Season points allocation with losing streak decay (Win+16 / Draw+8 / Loss: 4→2→0).';



CREATE OR REPLACE FUNCTION "public"."update_season_vote_metrics_after_battle"("p_archived_battle_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  b RECORD;
  v_for_a int; v_against_a int; v_total_a int;
  v_for_b int; v_against_b int; v_total_b int;
  v_ratio_a numeric(7,4); v_ratio_b numeric(7,4);
  v_season uuid;
BEGIN
  SELECT * INTO b
  FROM public.archived_battles
  WHERE id = p_archived_battle_id;

  IF NOT FOUND THEN
    RETURN; -- nothing to do
  END IF;

  v_season := b.season_id;

  -- Player A
  v_for_a := COALESCE(b.final_votes_a,0);
  v_against_a := COALESCE(b.final_votes_b,0);
  v_total_a := v_for_a + v_against_a;
  v_ratio_a := CASE WHEN NULLIF(v_total_a,0) IS NULL THEN 0 ELSE (v_for_a - v_against_a)::numeric / v_total_a END;

  -- Player B
  v_for_b := COALESCE(b.final_votes_b,0);
  v_against_b := COALESCE(b.final_votes_a,0);
  v_total_b := v_for_b + v_against_b;
  v_ratio_b := CASE WHEN NULLIF(v_total_b,0) IS NULL THEN 0 ELSE (v_for_b - v_against_b)::numeric / v_total_b END;

  -- Upsert for player1
  INSERT INTO public.season_user_metrics AS m (
    season_id, user_id, battles_played, total_votes_for, total_votes_against,
    total_votes, wins, losses, draws, weighted_vote_share, sum_margin_ratio, last_battle_at, updated_at
  )
  VALUES (
    v_season, b.player1_user_id, 1, v_for_a, v_against_a, v_total_a,
    CASE WHEN b.winner_id = b.player1_user_id THEN 1 ELSE 0 END,
    CASE WHEN b.winner_id = b.player2_user_id THEN 1 ELSE 0 END,
    CASE WHEN b.winner_id IS NULL THEN 1 ELSE 0 END,
    CASE WHEN NULLIF(v_total_a,0) IS NULL THEN 0 ELSE v_for_a::numeric / v_total_a END,
    v_ratio_a,
    b.archived_at, NOW()
  )
  ON CONFLICT (season_id, user_id) DO UPDATE SET
    battles_played = m.battles_played + 1,
    total_votes_for = m.total_votes_for + EXCLUDED.total_votes_for,
    total_votes_against = m.total_votes_against + EXCLUDED.total_votes_against,
    total_votes = m.total_votes + EXCLUDED.total_votes,
    wins = m.wins + EXCLUDED.wins,
    losses = m.losses + EXCLUDED.losses,
    draws = m.draws + EXCLUDED.draws,
    weighted_vote_share = CASE WHEN NULLIF(m.total_votes + EXCLUDED.total_votes,0) IS NULL THEN 0 ELSE (m.total_votes_for + EXCLUDED.total_votes_for)::numeric / (m.total_votes + EXCLUDED.total_votes) END,
    sum_margin_ratio = m.sum_margin_ratio + EXCLUDED.sum_margin_ratio,
    last_battle_at = GREATEST(m.last_battle_at, EXCLUDED.last_battle_at),
    updated_at = NOW();

  -- Upsert for player2
  INSERT INTO public.season_user_metrics AS m (
    season_id, user_id, battles_played, total_votes_for, total_votes_against,
    total_votes, wins, losses, draws, weighted_vote_share, sum_margin_ratio, last_battle_at, updated_at
  )
  VALUES (
    v_season, b.player2_user_id, 1, v_for_b, v_against_b, v_total_b,
    CASE WHEN b.winner_id = b.player2_user_id THEN 1 ELSE 0 END,
    CASE WHEN b.winner_id = b.player1_user_id THEN 1 ELSE 0 END,
    CASE WHEN b.winner_id IS NULL THEN 1 ELSE 0 END,
    CASE WHEN NULLIF(v_total_b,0) IS NULL THEN 0 ELSE v_for_b::numeric / v_total_b END,
    v_ratio_b,
    b.archived_at, NOW()
  )
  ON CONFLICT (season_id, user_id) DO UPDATE SET
    battles_played = m.battles_played + 1,
    total_votes_for = m.total_votes_for + EXCLUDED.total_votes_for,
    total_votes_against = m.total_votes_against + EXCLUDED.total_votes_against,
    total_votes = m.total_votes + EXCLUDED.total_votes,
    wins = m.wins + EXCLUDED.wins,
    losses = m.losses + EXCLUDED.losses,
    draws = m.draws + EXCLUDED.draws,
    weighted_vote_share = CASE WHEN NULLIF(m.total_votes + EXCLUDED.total_votes,0) IS NULL THEN 0 ELSE (m.total_votes_for + EXCLUDED.total_votes_for)::numeric / (m.total_votes + EXCLUDED.total_votes) END,
    sum_margin_ratio = m.sum_margin_ratio + EXCLUDED.sum_margin_ratio,
    last_battle_at = GREATEST(m.last_battle_at, EXCLUDED.last_battle_at),
    updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."update_season_vote_metrics_after_battle"("p_archived_battle_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_avatar"("p_user_id" "uuid", "p_avatar_url" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Check if user exists and is the authenticated user
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Can only update own profile';
  END IF;

  -- Update the avatar URL in profiles table
  UPDATE profiles 
  SET 
    avatar_url = p_avatar_url,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user ID: %', p_user_id;
  END IF;

  -- Return success response
  SELECT json_build_object(
    'success', true,
    'message', 'Avatar updated successfully',
    'avatar_url', p_avatar_url
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error response
    SELECT json_build_object(
      'success', false,
      'error', SQLERRM
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."update_user_avatar"("p_user_id" "uuid", "p_avatar_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_language"("p_user_id" "uuid", "p_language" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_supported_languages TEXT[] := ARRAY['ja', 'en'];
BEGIN
  -- サポートされている言語かチェック
  IF NOT (p_language = ANY(v_supported_languages)) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unsupported language',
      'supported_languages', v_supported_languages
    );
  END IF;
  
  -- 言語設定を更新
  UPDATE profiles 
  SET 
    language = p_language,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'language', p_language
  );
END;
$$;


ALTER FUNCTION "public"."update_user_language"("p_user_id" "uuid", "p_language" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_user_language"("p_user_id" "uuid", "p_language" "text") IS 'ユーザー言語設定を更新';



CREATE OR REPLACE FUNCTION "public"."update_user_profile_details"("p_user_id" "uuid", "p_username" "text", "p_bio" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_result JSON;
  v_current_username TEXT;
BEGIN
  -- Check if user exists and is the authenticated user
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Can only update own profile';
  END IF;

  -- Check if username is being changed and if it already exists
  SELECT username INTO v_current_username FROM profiles WHERE id = p_user_id;
  IF p_username IS DISTINCT FROM v_current_username THEN
    IF EXISTS (SELECT 1 FROM profiles WHERE username = p_username AND id != p_user_id) THEN
      RAISE EXCEPTION 'Username already taken: %', p_username;
    END IF;
  END IF;

  -- Update the profile details in profiles table
  UPDATE profiles 
  SET 
    username = COALESCE(p_username, profiles.username),
    bio = COALESCE(p_bio, profiles.bio),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user ID: %', p_user_id;
  END IF;

  -- Return success response with updated data
  SELECT json_build_object(
    'success', true,
    'message', 'Profile details updated successfully',
    'profile', (SELECT row_to_json(p) FROM profiles p WHERE p.id = p_user_id)
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error response
    SELECT json_build_object(
      'success', false,
      'error', SQLERRM
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."update_user_profile_details"("p_user_id" "uuid", "p_username" "text", "p_bio" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_battle_vote"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  battle_record RECORD;
  voter_id UUID;
BEGIN
  -- 認証チェック
  voter_id := auth.uid();
  IF voter_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for voting';
  END IF;
  
  -- 投票者IDの設定
  NEW.user_id := voter_id;
  
  -- バトル情報の取得（JOINを使って一度に取得）
  SELECT 
    ab.status, 
    ab.end_voting_at,
    s1.user_id as player1_id,
    s2.user_id as player2_id
  INTO battle_record
  FROM public.active_battles ab
  LEFT JOIN public.submissions s1 ON ab.player1_submission_id = s1.id
  LEFT JOIN public.submissions s2 ON ab.player2_submission_id = s2.id
  WHERE ab.id = NEW.battle_id;
  
  -- バトル存在チェック
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle not found';
  END IF;
  
  -- バトルステータスチェック
  IF battle_record.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Voting is not allowed for this battle status: %', battle_record.status;
  END IF;
  
  -- 投票期限チェック
  IF NOW() > battle_record.end_voting_at THEN
    RAISE EXCEPTION 'Voting period has ended';
  END IF;
  
  -- 自分のバトルには投票できない
  IF voter_id = battle_record.player1_id OR voter_id = battle_record.player2_id THEN
    RAISE EXCEPTION 'Cannot vote on your own battle';
  END IF;
  
  -- 投票値の検証
  IF NEW.vote NOT IN ('A', 'B') THEN
    RAISE EXCEPTION 'Invalid vote value: %', NEW.vote;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_battle_vote"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vote_battle"("p_battle_id" "uuid", "p_vote" character) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote CHAR(1);
  v_current_season seasons;
  v_season_id UUID := NULL;
  v_season_vote_points_increment INTEGER := 0;  -- シーズンポイント増加量
  v_debug_info JSON;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_vote NOT IN ('A', 'B') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid vote');
  END IF;

  -- アクティブシーズンを取得（より堅牢なアプローチ）
  BEGIN
    SELECT * INTO v_current_season
    FROM public.seasons
    WHERE status = 'active'
      AND start_at <= NOW()
      AND end_at >= NOW()
    ORDER BY start_at DESC
    LIMIT 1;
    
    IF FOUND THEN
      v_season_id := v_current_season.id;
      v_season_vote_points_increment := 1;  -- シーズンがアクティブな場合のみ+1ポイント
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- シーズン取得エラーでも投票は続行（season_idはNULLのまま）
    v_season_id := NULL;
    v_season_vote_points_increment := 0;
  END;

  -- デバッグ情報を作成
  v_debug_info := json_build_object(
    'season_found', v_season_id IS NOT NULL,
    'season_id', v_season_id,
    'season_name', COALESCE(v_current_season.name, 'No active season'),
    'season_vote_points_increment', v_season_vote_points_increment,
    'vote_type', 'simple_vote',
    'current_time', NOW()
  );

  -- 既存の投票をチェック
  SELECT vote INTO v_existing_vote
  FROM battle_votes
  WHERE battle_id = p_battle_id AND user_id = v_user_id;

  IF v_existing_vote IS NOT NULL THEN
    -- 既存の投票を更新
    UPDATE battle_votes
    SET vote = p_vote, 
        season_id = v_season_id,
        created_at = NOW()
    WHERE battle_id = p_battle_id AND user_id = v_user_id;

    -- バトルの投票数を更新（古い投票を減算、新しい投票を加算）
    IF v_existing_vote = 'A' AND p_vote = 'B' THEN
      UPDATE active_battles SET votes_a = votes_a - 1, votes_b = votes_b + 1 WHERE id = p_battle_id;
    ELSIF v_existing_vote = 'B' AND p_vote = 'A' THEN
      UPDATE active_battles SET votes_b = votes_b - 1, votes_a = votes_a + 1 WHERE id = p_battle_id;
    END IF;

  ELSE
    -- 新しい投票を挿入
    INSERT INTO battle_votes (battle_id, user_id, vote, season_id, created_at)
    VALUES (p_battle_id, v_user_id, p_vote, v_season_id, NOW());

    -- バトルの投票数を更新
    IF p_vote = 'A' THEN
      UPDATE active_battles SET votes_a = votes_a + 1 WHERE id = p_battle_id;
    ELSE
      UPDATE active_battles SET votes_b = votes_b + 1 WHERE id = p_battle_id;
    END IF;

    -- 🔧 修正: ユーザーの投票数を増加（新規投票のみ）
    -- vote_count は常に+1、season_vote_points はシーズンがアクティブな場合のみ増加
    UPDATE profiles 
    SET 
      vote_count = vote_count + 1,  -- 🔧 常に+1（シーズンの有無に関係なく）
      season_vote_points = season_vote_points + v_season_vote_points_increment,  -- シーズンがある場合のみ+1
      updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  RETURN json_build_object(
    'success', true, 
    'vote', p_vote, 
    'existing_vote', v_existing_vote,
    'season_id', v_season_id,
    'season_vote_points_added', CASE WHEN v_existing_vote IS NULL THEN v_season_vote_points_increment ELSE 0 END,
    'vote_count_added', CASE WHEN v_existing_vote IS NULL THEN 1 ELSE 0 END,  -- 🔧 常に+1
    'vote_type', 'simple_vote',
    'debug', v_debug_info
  );
END;
$$;


ALTER FUNCTION "public"."vote_battle"("p_battle_id" "uuid", "p_vote" character) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."vote_battle"("p_battle_id" "uuid", "p_vote" character) IS 'v6 (Fixed Vote Count): Always increments vote_count regardless of season status. Season points only increment when season is active.';



CREATE OR REPLACE FUNCTION "public"."vote_battle_fixed"("p_battle_id" "uuid", "p_vote" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_user_id UUID;
  v_battle public.active_battles;
  v_existing_vote public.battle_votes;
  v_player1_user_id UUID;
  v_player2_user_id UUID;
  v_current_season_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'authentication_required',
      'message', 'ログインが必要です'
    );
  END IF;

  -- Validate vote parameter
  IF p_vote NOT IN ('A', 'B') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_vote',
      'message', '投票は A または B である必要があります'
    );
  END IF;

  -- Get battle information
  SELECT * INTO v_battle
  FROM public.active_battles
  WHERE id = p_battle_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'battle_not_found',
      'message', 'バトルが見つかりません'
    );
  END IF;

  -- Check if battle is still active
  IF v_battle.status != 'ACTIVE' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'voting_closed',
      'message', 'このバトルの投票は終了しています'
    );
  END IF;

  -- Check if voting period has expired
  IF v_battle.end_voting_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'voting_expired',
      'message', '投票期間が終了しています'
    );
  END IF;

  -- Get player user IDs to prevent self-voting
  v_player1_user_id := v_battle.player1_user_id;
  v_player2_user_id := v_battle.player2_user_id;

  -- Prevent self-voting
  IF v_user_id = v_player1_user_id OR v_user_id = v_player2_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'self_voting_not_allowed',
      'message', '自分のバトルには投票できません'
    );
  END IF;

  -- Check if user has already voted
  SELECT * INTO v_existing_vote
  FROM public.battle_votes
  WHERE battle_id = p_battle_id AND user_id = v_user_id;

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'already_voted',
      'message', 'このバトルにはすでに投票済みです'
    );
  END IF;

  -- Check for an active season - 明示的に変数に代入
  SELECT id INTO v_current_season_id 
  FROM public.seasons 
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Insert vote with explicit season_id
  INSERT INTO public.battle_votes (battle_id, user_id, vote, season_id)
  VALUES (p_battle_id, v_user_id, p_vote::"char", v_current_season_id);

  -- Update vote counts in active_battles
  IF p_vote = 'A' THEN
    UPDATE public.active_battles
    SET votes_a = votes_a + 1
    WHERE id = p_battle_id;
  ELSE
    UPDATE public.active_battles
    SET votes_b = votes_b + 1
    WHERE id = p_battle_id;
  END IF;

  -- Always increment both vote_count and season_vote_points if season exists
  IF v_current_season_id IS NOT NULL THEN
    UPDATE public.profiles
    SET 
      vote_count = vote_count + 1,
      season_vote_points = COALESCE(season_vote_points, 0) + 1,
      updated_at = NOW()
    WHERE id = v_user_id;
  ELSE
    UPDATE public.profiles
    SET 
      vote_count = vote_count + 1,
      updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', '投票が完了しました',
    'vote', p_vote,
    'debug_season_id', v_current_season_id,
    'debug_user_id', v_user_id
  );
END;
$$;


ALTER FUNCTION "public"."vote_battle_fixed"("p_battle_id" "uuid", "p_vote" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vote_battle_with_comment"("p_battle_id" "uuid", "p_vote" character, "p_comment" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_user_id UUID;
  v_battle public.active_battles;
  v_existing_vote public.battle_votes;
  v_player1_user_id UUID;
  v_player2_user_id UUID;
  v_current_season_id UUID;
  v_season_found BOOLEAN := FALSE;
  v_is_new_vote BOOLEAN := FALSE;
  v_has_existing_vote BOOLEAN := FALSE;
  v_season_vote_points_increment INTEGER := 0;  -- シーズンポイント増加量
  v_vote_count_increment INTEGER := 3;  -- 🔧 通算投票カウント（常に+3）
  v_debug_info JSON;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Validate vote parameter
  IF p_vote NOT IN ('A', 'B') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid vote'
    );
  END IF;

  -- Get battle information
  SELECT * INTO v_battle
  FROM public.active_battles
  WHERE id = p_battle_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Battle not found or not active'
    );
  END IF;

  -- Check if battle is still active
  IF v_battle.status != 'ACTIVE' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Battle not found or not active'
    );
  END IF;

  -- Check if voting period has expired
  IF v_battle.end_voting_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Voting period has ended'
    );
  END IF;

  -- Get player user IDs to prevent self-voting
  v_player1_user_id := v_battle.player1_user_id;
  v_player2_user_id := v_battle.player2_user_id;

  -- Prevent self-voting
  IF v_user_id = v_player1_user_id OR v_user_id = v_player2_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot vote on your own battle'
    );
  END IF;

  -- Check if user has already voted（明示的なフラグを設定）
  SELECT * INTO v_existing_vote
  FROM public.battle_votes
  WHERE battle_id = p_battle_id AND user_id = v_user_id;

  -- 既存投票の判定結果を明示的に保存
  v_has_existing_vote := FOUND;

  -- アクティブシーズンを取得
  BEGIN
    SELECT id INTO v_current_season_id 
    FROM public.seasons 
    WHERE status = 'active'
      AND start_at <= NOW()
      AND end_at >= NOW()
    ORDER BY start_at DESC
    LIMIT 1;
    
    IF FOUND THEN
      v_season_found := TRUE;
      v_season_vote_points_increment := 3;  -- シーズンがアクティブな場合のみ+3ポイント
    ELSE
      v_current_season_id := NULL;
      v_season_found := FALSE;
      v_season_vote_points_increment := 0;  -- シーズンがない場合は0
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    v_current_season_id := NULL;
    v_season_found := FALSE;
    v_season_vote_points_increment := 0;
  END;

  -- デバッグ情報を作成
  v_debug_info := json_build_object(
    'season_found', v_season_found,
    'season_id', v_current_season_id,
    'has_existing_vote', v_has_existing_vote,
    'season_vote_points_increment', v_season_vote_points_increment,
    'vote_count_increment', v_vote_count_increment,  -- 常に+3
    'vote_type', 'comment_vote',
    'current_time', NOW()
  );

  -- 既存投票の判定を明示的なフラグで行う
  IF v_has_existing_vote THEN
    -- 既存の投票を更新（コメントも更新）
    UPDATE public.battle_votes 
    SET 
      vote = p_vote, 
      comment = p_comment, 
      season_id = v_current_season_id,
      created_at = NOW()
    WHERE battle_id = p_battle_id AND user_id = v_user_id;
    
    -- バトルの投票数を更新（古い投票を減算、新しい投票を加算）
    IF v_existing_vote.vote = 'A' AND p_vote = 'B' THEN
      UPDATE public.active_battles SET votes_a = votes_a - 1, votes_b = votes_b + 1 WHERE id = p_battle_id;
    ELSIF v_existing_vote.vote = 'B' AND p_vote = 'A' THEN
      UPDATE public.active_battles SET votes_b = votes_b - 1, votes_a = votes_a + 1 WHERE id = p_battle_id;
    END IF;

    v_is_new_vote := FALSE;

  ELSE
    -- 新しい投票を挿入
    INSERT INTO public.battle_votes (battle_id, user_id, vote, comment, season_id)
    VALUES (p_battle_id, v_user_id, p_vote, p_comment, v_current_season_id);

    -- バトルの投票数を更新
    IF p_vote = 'A' THEN
      UPDATE public.active_battles SET votes_a = votes_a + 1 WHERE id = p_battle_id;
    ELSE
      UPDATE public.active_battles SET votes_b = votes_b + 1 WHERE id = p_battle_id;
    END IF;

    -- 🔧 修正: ユーザーの投票数を増加（新規投票のみ）
    -- vote_count は常に+3、season_vote_points はシーズンがアクティブな場合のみ+3
    UPDATE public.profiles
    SET 
      vote_count = vote_count + v_vote_count_increment,  -- 🔧 常に+3（コメントボーナス）
      season_vote_points = CASE 
        WHEN v_season_found AND v_current_season_id IS NOT NULL 
        THEN COALESCE(season_vote_points, 0) + v_season_vote_points_increment
        ELSE season_vote_points
      END,
      updated_at = NOW()
    WHERE id = v_user_id;

    v_is_new_vote := TRUE;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Vote with comment recorded successfully',
    'vote', p_vote,
    'comment', p_comment,
    'season_id', v_current_season_id,
    'season_found', v_season_found,
    'is_new_vote', v_is_new_vote,
    'has_existing_vote', v_has_existing_vote,
    'season_vote_points_added', CASE WHEN v_is_new_vote THEN v_season_vote_points_increment ELSE 0 END,
    'vote_count_added', CASE WHEN v_is_new_vote THEN v_vote_count_increment ELSE 0 END,  -- 常に+3
    'vote_type', 'comment_vote',
    'debug', v_debug_info
  );
END;
$$;


ALTER FUNCTION "public"."vote_battle_with_comment"("p_battle_id" "uuid", "p_vote" character, "p_comment" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."vote_battle_with_comment"("p_battle_id" "uuid", "p_vote" character, "p_comment" "text") IS 'v6 (Fixed Vote Count): Always increments vote_count (+3) regardless of season status. Season points (+3) only increment when season is active.';



CREATE OR REPLACE FUNCTION "public"."withdraw_submission"("p_submission_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Update submission status to withdrawn (only if it's waiting and belongs to the user)
  UPDATE public.submissions
  SET 
    status = 'WITHDRAWN',
    updated_at = NOW()
  WHERE id = p_submission_id 
    AND user_id = v_user_id 
    AND status = 'WAITING_OPPONENT';

  -- Return true if a row was updated
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."withdraw_submission"("p_submission_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."active_battles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player1_submission_id" "uuid" NOT NULL,
    "player2_submission_id" "uuid" NOT NULL,
    "status" "public"."battle_status" DEFAULT 'ACTIVE'::"public"."battle_status" NOT NULL,
    "votes_a" integer DEFAULT 0 NOT NULL,
    "votes_b" integer DEFAULT 0 NOT NULL,
    "end_voting_at" timestamp with time zone DEFAULT ("now"() + '5 days'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "player1_user_id" "uuid" NOT NULL,
    "player2_user_id" "uuid" NOT NULL,
    "battle_format" "public"."battle_format" NOT NULL,
    "season_id" "uuid"
);


ALTER TABLE "public"."active_battles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."active_battles"."season_id" IS 'バトルが実施されたシーズン（分析用）';



CREATE TABLE IF NOT EXISTS "public"."ad_placement_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "placement_id" "uuid",
    "simple_ad_id" "uuid",
    "priority" integer DEFAULT 100,
    "is_pinned" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ad_placement_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ad_placements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "description" "text",
    "size" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ad_placements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."advertisers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "contact_info" "jsonb",
    "billing_info" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."advertisers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."archived_battle_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "archived_battle_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "vote" character(1) NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "archived_battle_votes_vote_check" CHECK (("vote" = ANY (ARRAY['A'::"bpchar", 'B'::"bpchar"])))
);


ALTER TABLE "public"."archived_battle_votes" OWNER TO "postgres";


COMMENT ON TABLE "public"."archived_battle_votes" IS 'Stores votes and comments from archived battles to preserve them after active battles are deleted';



COMMENT ON COLUMN "public"."archived_battle_votes"."archived_battle_id" IS 'Reference to the archived battle this vote belongs to';



COMMENT ON COLUMN "public"."archived_battle_votes"."user_id" IS 'User who made this vote, NULL for anonymous votes';



COMMENT ON COLUMN "public"."archived_battle_votes"."vote" IS 'Vote choice: A for player1, B for player2';



COMMENT ON COLUMN "public"."archived_battle_votes"."comment" IS 'Optional comment left with the vote';



CREATE TABLE IF NOT EXISTS "public"."archived_battles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "original_battle_id" "uuid" NOT NULL,
    "winner_id" "uuid",
    "final_votes_a" integer DEFAULT 0 NOT NULL,
    "final_votes_b" integer DEFAULT 0 NOT NULL,
    "archived_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "player1_user_id" "uuid" NOT NULL,
    "player2_user_id" "uuid" NOT NULL,
    "player1_submission_id" "uuid" NOT NULL,
    "player2_submission_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "battle_format" "public"."battle_format" NOT NULL,
    "player1_rating_change" integer DEFAULT 0,
    "player2_rating_change" integer DEFAULT 0,
    "player1_final_rating" integer,
    "player2_final_rating" integer,
    "player1_video_url" "text",
    "player2_video_url" "text",
    "season_id" "uuid"
);


ALTER TABLE "public"."archived_battles" OWNER TO "postgres";


COMMENT ON TABLE "public"."archived_battles" IS 'v4 FINAL: Schema fully aligned with production, handles dependencies, and fixes SQL syntax.';



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "action" "text" NOT NULL,
    "user_id" "uuid",
    "details" "jsonb",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "session_id" "text",
    "function_name" "text",
    "execution_time_ms" integer,
    "success" boolean DEFAULT true,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "audit_logs_action_check" CHECK (("action" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text", 'SELECT'::"text", 'VERIFY'::"text", 'SEND_SMS'::"text", 'CHECK_AVAILABILITY'::"text"])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."battle_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "battle_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "vote" character(1) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "comment" "text",
    "season_id" "uuid",
    CONSTRAINT "user_id_required" CHECK (("user_id" IS NOT NULL))
);


ALTER TABLE "public"."battle_votes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."battle_votes"."season_id" IS '投票が行われたシーズン（分析用）';



CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."communities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "owner_user_id" "uuid" NOT NULL,
    "password_hash" "text",
    "member_count" integer DEFAULT 1,
    "average_rating" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."communities" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."communities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "community_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."community_chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_members" (
    "community_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."community_role" DEFAULT 'member'::"public"."community_role" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."community_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "email" "text" NOT NULL,
    "bio" "text",
    "rating" integer DEFAULT 1200 NOT NULL,
    "language" character varying DEFAULT 'ja'::character varying,
    "vote_count" integer DEFAULT 0 NOT NULL,
    "is_deleted" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "has_seen_onboarding" boolean DEFAULT false NOT NULL,
    "current_community_id" "uuid",
    "season_points" integer DEFAULT 1200 NOT NULL,
    "season_vote_points" integer DEFAULT 0 NOT NULL,
    "phone_number" character varying,
    "phone_verified" boolean DEFAULT false,
    CONSTRAINT "profiles_language_check" CHECK ((("language")::"text" = ANY ((ARRAY['en'::character varying, 'ja'::character varying, 'ko'::character varying, 'zh-CN'::character varying, 'es'::character varying, 'pt-BR'::character varying, 'fr'::character varying, 'de'::character varying])::"text"[])))
);

ALTER TABLE ONLY "public"."profiles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."season_points" IS 'シーズンごとのバトルポイント（3ヶ月毎にリセット）';



COMMENT ON COLUMN "public"."profiles"."season_vote_points" IS 'シーズンごとの投票ポイント（3ヶ月毎にリセット）';



COMMENT ON COLUMN "public"."profiles"."phone_number" IS '電話番号（国際フォーマット例: +81-90-1234-5678）';



COMMENT ON COLUMN "public"."profiles"."phone_verified" IS '電話番号認証完了フラグ（新規ユーザーはtrue、既存ユーザーはfalse）';



CREATE OR REPLACE VIEW "public"."community_rankings_view" WITH ("security_invoker"='true') AS
 SELECT "c"."id" AS "community_id",
    "p"."id" AS "user_id",
    "p"."username",
    "p"."avatar_url",
    "p"."rating",
    "dense_rank"() OVER (PARTITION BY "c"."id" ORDER BY "p"."rating" DESC, "p"."created_at") AS "community_rank"
   FROM (("public"."community_members" "cm"
     JOIN "public"."communities" "c" ON (("cm"."community_id" = "c"."id")))
     JOIN "public"."profiles" "p" ON (("cm"."user_id" = "p"."id")))
  WHERE ("p"."is_deleted" = false);


ALTER TABLE "public"."community_rankings_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."community_rankings_view" IS 'SECURITY INVOKER: コミュニティ内のメンバーランキング。';



CREATE TABLE IF NOT EXISTS "public"."email_template_specs" (
    "id" integer NOT NULL,
    "template_type" character varying(50) NOT NULL,
    "subject" "text" NOT NULL,
    "html_content" "text" NOT NULL,
    "text_content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_template_specs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."email_template_specs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."email_template_specs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."email_template_specs_id_seq" OWNED BY "public"."email_template_specs"."id";



CREATE OR REPLACE VIEW "public"."global_community_rankings_view" WITH ("security_invoker"='true') AS
 SELECT "communities"."id",
    "communities"."name",
    "communities"."description",
    "communities"."owner_user_id",
    "communities"."member_count",
    "communities"."average_rating",
    "communities"."created_at",
    "dense_rank"() OVER (ORDER BY "communities"."average_rating" DESC, "communities"."member_count" DESC, "communities"."created_at") AS "rank"
   FROM "public"."communities"
  ORDER BY ("dense_rank"() OVER (ORDER BY "communities"."average_rating" DESC, "communities"."member_count" DESC, "communities"."created_at"));


ALTER TABLE "public"."global_community_rankings_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."global_community_rankings_view" IS 'SECURITY INVOKER: 全コミュニティのランキング。';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" character varying(50) NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "related_battle_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "related_season_id" "uuid",
    "related_site_news_id" "uuid",
    CONSTRAINT "notifications_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['info'::character varying, 'success'::character varying, 'warning'::character varying, 'battle_matched'::character varying, 'battle_win'::character varying, 'battle_lose'::character varying, 'battle_draw'::character varying, 'season_start'::character varying, 'news_article'::character varying])::"text"[])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phone_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "phone_number" "text" NOT NULL,
    "verified_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "verification_method" "text" DEFAULT 'sms'::"text",
    "country_code" "text" DEFAULT '+81'::"text",
    CONSTRAINT "phone_verifications_verification_method_check" CHECK (("verification_method" = ANY (ARRAY['sms'::"text", 'voice'::"text"]))),
    CONSTRAINT "valid_phone_number" CHECK (("phone_number" ~ '^\+[1-9]\d{1,14}$'::"text")),
    CONSTRAINT "valid_user_id" CHECK (("user_id" IS NOT NULL))
);


ALTER TABLE "public"."phone_verifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "likes" integer DEFAULT 0 NOT NULL,
    "comments_count" integer DEFAULT 0 NOT NULL,
    "liked_by" "uuid"[] DEFAULT ARRAY[]::"uuid"[] NOT NULL
);


ALTER TABLE "public"."posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pre_registered_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pre_registered_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."pre_registered_users" IS 'Stores email addresses of users who are allowed to register during the pre-release period.';



CREATE OR REPLACE VIEW "public"."public_active_battles" WITH ("security_invoker"='true') AS
 SELECT "ab"."id",
    "ab"."battle_format",
    "ab"."status",
    "ab"."votes_a",
    "ab"."votes_b",
    "ab"."end_voting_at",
    "ab"."created_at",
    "ab"."updated_at",
        CASE
            WHEN ("p1"."is_deleted" = true) THEN NULL::"uuid"
            ELSE "ab"."player1_user_id"
        END AS "player1_user_id",
        CASE
            WHEN ("p1"."is_deleted" = true) THEN 'deleted-user'::"text"
            ELSE "p1"."username"
        END AS "player1_username",
        CASE
            WHEN ("p2"."is_deleted" = true) THEN NULL::"uuid"
            ELSE "ab"."player2_user_id"
        END AS "player2_user_id",
        CASE
            WHEN ("p2"."is_deleted" = true) THEN 'deleted-user'::"text"
            ELSE "p2"."username"
        END AS "player2_username",
    "ab"."player1_submission_id",
    "ab"."player2_submission_id"
   FROM (("public"."active_battles" "ab"
     LEFT JOIN "public"."profiles" "p1" ON (("ab"."player1_user_id" = "p1"."id")))
     LEFT JOIN "public"."profiles" "p2" ON (("ab"."player2_user_id" = "p2"."id")));


ALTER TABLE "public"."public_active_battles" OWNER TO "postgres";


COMMENT ON VIEW "public"."public_active_battles" IS 'SECURITY INVOKER: アクティブバトルの公開ビュー。削除されたユーザーは匿名化。';



CREATE OR REPLACE VIEW "public"."public_archived_battles" WITH ("security_invoker"='true') AS
 SELECT "ab"."id",
    "ab"."original_battle_id",
        CASE
            WHEN "p1"."is_deleted" THEN 'deleted-user'::"text"
            ELSE "p1"."username"
        END AS "player1_username",
        CASE
            WHEN "p2"."is_deleted" THEN 'deleted-user'::"text"
            ELSE "p2"."username"
        END AS "player2_username",
    "ab"."player1_video_url",
    "ab"."player2_video_url",
    "ab"."final_votes_a",
    "ab"."final_votes_b",
        CASE
            WHEN "w"."is_deleted" THEN 'deleted-user'::"text"
            ELSE "w"."username"
        END AS "winner_username",
    "ab"."archived_at",
    "ab"."battle_format",
    "ab"."player1_rating_change",
    "ab"."player2_rating_change",
    "ab"."player1_final_rating",
    "ab"."player2_final_rating"
   FROM ((("public"."archived_battles" "ab"
     LEFT JOIN "public"."profiles" "p1" ON (("p1"."id" = "ab"."player1_user_id")))
     LEFT JOIN "public"."profiles" "p2" ON (("p2"."id" = "ab"."player2_user_id")))
     LEFT JOIN "public"."profiles" "w" ON (("w"."id" = "ab"."winner_id")));


ALTER TABLE "public"."public_archived_battles" OWNER TO "postgres";


COMMENT ON VIEW "public"."public_archived_battles" IS 'SECURITY INVOKER: アーカイブバトルの公開ビュー。削除されたユーザーは匿名化。';



CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "subscription" "jsonb" NOT NULL,
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."push_subscriptions" IS 'Web Push subscriptions with fixed RLS policies';



COMMENT ON COLUMN "public"."push_subscriptions"."subscription" IS 'ブラウザからの PushSubscription オブジェクト（JSON形式）';



COMMENT ON COLUMN "public"."push_subscriptions"."user_agent" IS 'デバッグ・統計用のユーザーエージェント情報';



CREATE OR REPLACE VIEW "public"."rankings_view" WITH ("security_invoker"='on') AS
 SELECT "p"."id" AS "user_id",
    "p"."username",
    "p"."avatar_url",
    "p"."rating",
    "p"."season_points",
    ( SELECT "count"(*) AS "count"
           FROM "public"."archived_battles" "ab"
          WHERE ("ab"."winner_id" = "p"."id")) AS "battles_won",
    ( SELECT "count"(*) AS "count"
           FROM "public"."archived_battles" "ab"
          WHERE ((("ab"."player1_user_id" = "p"."id") OR ("ab"."player2_user_id" = "p"."id")) AND ("ab"."winner_id" IS NOT NULL) AND ("ab"."winner_id" <> "p"."id"))) AS "battles_lost",
    "rank"() OVER (ORDER BY "p"."rating" DESC, "p"."updated_at") AS "rank"
   FROM "public"."profiles" "p"
  WHERE (("p"."is_deleted" = false) AND ((( SELECT "count"(*) AS "count"
           FROM "public"."archived_battles" "ab"
          WHERE ("ab"."winner_id" = "p"."id")) + ( SELECT "count"(*) AS "count"
           FROM "public"."archived_battles" "ab"
          WHERE ((("ab"."player1_user_id" = "p"."id") OR ("ab"."player2_user_id" = "p"."id")) AND ("ab"."winner_id" IS NOT NULL) AND ("ab"."winner_id" <> "p"."id")))) >= 1));


ALTER TABLE "public"."rankings_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."rankings_view" IS 'バトル経験者（勝敗数合計1以上）のみを表示するレーティングランキング';



CREATE TABLE IF NOT EXISTS "public"."rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "type" "text" NOT NULL,
    "image_url" "text" NOT NULL,
    "season_id" "uuid",
    "rank_requirement" integer,
    "min_battles" integer DEFAULT 0,
    "is_limited" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    CONSTRAINT "check_reward_type_badge_only" CHECK (("type" = 'badge'::"text")),
    CONSTRAINT "rewards_type_check" CHECK (("type" = ANY (ARRAY['badge'::"text", 'frame'::"text"])))
);


ALTER TABLE "public"."rewards" OWNER TO "postgres";


COMMENT ON TABLE "public"."rewards" IS 'Rewards table without rarity system - all rewards are equally valuable based on achievement';



COMMENT ON COLUMN "public"."rewards"."is_active" IS 'Whether the reward is currently active and available for display';



CREATE TABLE IF NOT EXISTS "public"."season_points_snapshots" (
    "id" bigint NOT NULL,
    "season_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "season_points" integer NOT NULL,
    "captured_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "note" "text"
);


ALTER TABLE "public"."season_points_snapshots" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."season_points_snapshots_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."season_points_snapshots_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."season_points_snapshots_id_seq" OWNED BY "public"."season_points_snapshots"."id";



CREATE TABLE IF NOT EXISTS "public"."season_rankings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rank" integer NOT NULL,
    "points" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."season_rankings" OWNER TO "postgres";


COMMENT ON TABLE "public"."season_rankings" IS 'シーズン終了時のバトルランキング履歴';



COMMENT ON COLUMN "public"."season_rankings"."rank" IS '最終順位（1位、2位...）';



COMMENT ON COLUMN "public"."season_rankings"."points" IS '最終ポイント数';



CREATE TABLE IF NOT EXISTS "public"."season_user_metrics" (
    "season_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "battles_played" integer DEFAULT 0 NOT NULL,
    "total_votes_for" integer DEFAULT 0 NOT NULL,
    "total_votes_against" integer DEFAULT 0 NOT NULL,
    "total_votes" integer DEFAULT 0 NOT NULL,
    "wins" integer DEFAULT 0 NOT NULL,
    "losses" integer DEFAULT 0 NOT NULL,
    "draws" integer DEFAULT 0 NOT NULL,
    "weighted_vote_share" numeric(6,4) DEFAULT 0.0 NOT NULL,
    "sum_margin_ratio" numeric(7,4) DEFAULT 0.0 NOT NULL,
    "last_battle_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."season_user_metrics" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."season_rankings_view" WITH ("security_invoker"='true') AS
 WITH "current_season" AS (
         SELECT "seasons"."id"
           FROM "public"."seasons"
          WHERE ("seasons"."status" = 'active'::"text")
          ORDER BY "seasons"."created_at" DESC
         LIMIT 1
        )
 SELECT "p"."id" AS "user_id",
    "p"."username",
    "p"."avatar_url",
    "p"."season_points",
    "p"."rating",
    "public"."get_rank_from_rating"("p"."rating") AS "rank_name",
    "public"."get_rank_color_from_rating"("p"."rating") AS "rank_color",
    0 AS "battles_won",
    0 AS "battles_lost",
    (0)::numeric AS "win_rate",
    "p"."created_at",
    "p"."updated_at",
    "dense_rank"() OVER (ORDER BY "p"."season_points" DESC, "m"."weighted_vote_share" DESC, "m"."sum_margin_ratio" DESC, "m"."battles_played" DESC, "m"."last_battle_at" DESC, "p"."id") AS "position",
    "m"."weighted_vote_share",
    "m"."sum_margin_ratio",
    "m"."battles_played",
    "m"."last_battle_at"
   FROM (("public"."profiles" "p"
     JOIN "current_season" "cs" ON (true))
     JOIN "public"."season_user_metrics" "m" ON ((("m"."user_id" = "p"."id") AND ("m"."season_id" = "cs"."id"))))
  WHERE (COALESCE("p"."is_deleted", false) = false)
  ORDER BY "p"."season_points" DESC, "m"."weighted_vote_share" DESC, "m"."sum_margin_ratio" DESC, "m"."battles_played" DESC, "m"."last_battle_at" DESC, "p"."id";


ALTER TABLE "public"."season_rankings_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."season_rankings_view" IS 'シーズンランキングビュー：参加者のみ表示。season_points同点はweighted_vote_share等でタイブレーク。列互換（avatar_url, rating, rank_name/color, position を提供）';



CREATE TABLE IF NOT EXISTS "public"."season_voter_rankings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rank" integer NOT NULL,
    "votes" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."season_voter_rankings" OWNER TO "postgres";


COMMENT ON TABLE "public"."season_voter_rankings" IS 'シーズン終了時の投票者ランキング履歴';



COMMENT ON COLUMN "public"."season_voter_rankings"."votes" IS '最終投票数';



CREATE OR REPLACE VIEW "public"."season_voter_rankings_view" AS
 SELECT "p"."id",
    "p"."username",
    "p"."avatar_url",
    "p"."season_vote_points",
    "dense_rank"() OVER (ORDER BY "p"."season_vote_points" DESC) AS "rank"
   FROM "public"."profiles" "p"
  WHERE (("p"."is_deleted" = false) AND ("p"."season_vote_points" >= 1));


ALTER TABLE "public"."season_voter_rankings_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."season_voter_rankings_view" IS 'シーズン投票者ランキングビュー：DENSE_RANK()による純粋な同率順位計算（created_at除去）';



CREATE TABLE IF NOT EXISTS "public"."security_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "user_id" "uuid",
    "phone_number_hash" "text",
    "event_data" "jsonb" NOT NULL,
    "severity_level" integer DEFAULT 1,
    "ip_address" "inet",
    "user_agent" "text",
    "request_id" "text",
    "is_blocked" boolean DEFAULT false,
    "admin_reviewed" boolean DEFAULT false,
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reviewed_at" timestamp with time zone,
    CONSTRAINT "security_audit_log_event_type_check" CHECK (("event_type" = ANY (ARRAY['PHONE_DUPLICATE_ATTEMPT'::"text", 'RATE_LIMIT_EXCEEDED'::"text", 'INVALID_OTP_ATTEMPT'::"text", 'SUSPICIOUS_PATTERN'::"text", 'BRUTE_FORCE_ATTEMPT'::"text", 'PHONE_NUMBER_ENUMERATION'::"text", 'API_ABUSE'::"text", 'UNAUTHORIZED_ACCESS'::"text"]))),
    CONSTRAINT "security_audit_log_severity_level_check" CHECK ((("severity_level" >= 1) AND ("severity_level" <= 10)))
);


ALTER TABLE "public"."security_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."simple_ads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "advertiser_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "click_url" "text" NOT NULL,
    "contract_start_date" "date" NOT NULL,
    "contract_end_date" "date" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."simple_ads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_news" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "image_url" "text",
    "link_url" "text",
    "published_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content_type" "text" DEFAULT 'article'::"text",
    "article_content" "text",
    "meta_description" "text",
    "tags" "text"[],
    "is_featured" boolean DEFAULT false,
    "is_published" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "language" character varying DEFAULT 'en'::character varying NOT NULL,
    CONSTRAINT "site_news_content_type_check" CHECK (("content_type" = 'article'::"text")),
    CONSTRAINT "site_news_language_check" CHECK ((("language")::"text" = ANY ((ARRAY['en'::character varying, 'ja'::character varying, 'ko'::character varying, 'zh-CN'::character varying, 'es'::character varying, 'pt-BR'::character varying, 'fr'::character varying, 'de'::character varying])::"text"[])))
);


ALTER TABLE "public"."site_news" OWNER TO "postgres";


COMMENT ON TABLE "public"."site_news" IS 'サイトニュース・お知らせ管理テーブル（カルーセル表示対応）';



COMMENT ON COLUMN "public"."site_news"."title" IS 'カルーセルに表示する見出し';



COMMENT ON COLUMN "public"."site_news"."body" IS 'お知らせの詳細内容（markdown可）';



COMMENT ON COLUMN "public"."site_news"."image_url" IS 'カルーセルの背景画像URL（任意）';



COMMENT ON COLUMN "public"."site_news"."link_url" IS 'クリック時に遷移させたい外部リンク（任意）';



COMMENT ON COLUMN "public"."site_news"."content_type" IS 'コンテンツタイプ（link: 外部リンク、article: 記事詳細）';



COMMENT ON COLUMN "public"."site_news"."article_content" IS '記事本文（content_type=''article''の場合）';



COMMENT ON COLUMN "public"."site_news"."meta_description" IS 'SEO用メタディスクリプション';



COMMENT ON COLUMN "public"."site_news"."tags" IS 'タグ配列';



COMMENT ON COLUMN "public"."site_news"."is_featured" IS '注目記事フラグ';



COMMENT ON COLUMN "public"."site_news"."is_published" IS '公開状態';



COMMENT ON COLUMN "public"."site_news"."display_order" IS '表示順序（数値が小さいほど優先）';



CREATE TABLE IF NOT EXISTS "public"."submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "video_url" "text" NOT NULL,
    "status" "public"."submission_status" DEFAULT 'WAITING_OPPONENT'::"public"."submission_status" NOT NULL,
    "rank_at_submission" integer,
    "active_battle_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "battle_format" "public"."battle_format"
);


ALTER TABLE "public"."submissions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_communities_view" WITH ("security_invoker"='true') AS
 SELECT "cm"."user_id",
    "c"."id" AS "community_id",
    "c"."name",
    "c"."description",
    "c"."owner_user_id",
    "c"."member_count",
    "c"."average_rating",
    "cm"."role",
    "cm"."joined_at"
   FROM ("public"."community_members" "cm"
     JOIN "public"."communities" "c" ON (("cm"."community_id" = "c"."id")))
  ORDER BY "cm"."joined_at" DESC;


ALTER TABLE "public"."user_communities_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_communities_view" IS 'SECURITY INVOKER: ユーザーが参加しているコミュニティ一覧。';



CREATE TABLE IF NOT EXISTS "public"."user_rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reward_id" "uuid" NOT NULL,
    "earned_at" timestamp with time zone DEFAULT "now"(),
    "earned_season_id" "uuid"
);


ALTER TABLE "public"."user_rewards" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_rewards" IS 'ユーザーの報酬所有権管理';



CREATE OR REPLACE VIEW "public"."voter_rankings_view" AS
 SELECT "p"."id",
    "p"."username",
    "p"."avatar_url",
    "p"."vote_count",
    "dense_rank"() OVER (ORDER BY "p"."vote_count" DESC) AS "rank"
   FROM "public"."profiles" "p"
  WHERE (("p"."is_deleted" = false) AND ("p"."vote_count" >= 1));


ALTER TABLE "public"."voter_rankings_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."voter_rankings_view" IS '通算投票者ランキングビュー：DENSE_RANK()による純粋な同率順位計算（created_at除去）';



CREATE OR REPLACE VIEW "public"."votes" WITH ("security_invoker"='true') AS
 SELECT "battle_votes"."id",
    "battle_votes"."battle_id",
    "battle_votes"."user_id",
    "battle_votes"."vote",
    "battle_votes"."created_at",
    "battle_votes"."comment"
   FROM "public"."battle_votes";


ALTER TABLE "public"."votes" OWNER TO "postgres";


COMMENT ON VIEW "public"."votes" IS 'Alias view for battle_votes table to maintain backward compatibility with legacy code that references public.votes';



ALTER TABLE ONLY "public"."email_template_specs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."email_template_specs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."season_points_snapshots" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."season_points_snapshots_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."active_battles"
    ADD CONSTRAINT "active_battles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ad_placement_assignments"
    ADD CONSTRAINT "ad_placement_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ad_placement_assignments"
    ADD CONSTRAINT "ad_placement_assignments_placement_id_simple_ad_id_key" UNIQUE ("placement_id", "simple_ad_id");



ALTER TABLE ONLY "public"."ad_placements"
    ADD CONSTRAINT "ad_placements_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."ad_placements"
    ADD CONSTRAINT "ad_placements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advertisers"
    ADD CONSTRAINT "advertisers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."archived_battle_votes"
    ADD CONSTRAINT "archived_battle_votes_archived_battle_id_user_id_key" UNIQUE ("archived_battle_id", "user_id");



ALTER TABLE ONLY "public"."archived_battle_votes"
    ADD CONSTRAINT "archived_battle_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."archived_battles"
    ADD CONSTRAINT "archived_battles_original_battle_id_key" UNIQUE ("original_battle_id");



ALTER TABLE ONLY "public"."archived_battles"
    ADD CONSTRAINT "archived_battles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."battle_votes"
    ADD CONSTRAINT "battle_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_chat_messages"
    ADD CONSTRAINT "community_chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_members"
    ADD CONSTRAINT "community_members_pkey" PRIMARY KEY ("community_id", "user_id");



ALTER TABLE ONLY "public"."email_template_specs"
    ADD CONSTRAINT "email_template_specs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phone_verifications"
    ADD CONSTRAINT "phone_verifications_phone_number_key" UNIQUE ("phone_number");



ALTER TABLE ONLY "public"."phone_verifications"
    ADD CONSTRAINT "phone_verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phone_verifications"
    ADD CONSTRAINT "phone_verifications_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pre_registered_users"
    ADD CONSTRAINT "pre_registered_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."pre_registered_users"
    ADD CONSTRAINT "pre_registered_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_phone_number_key" UNIQUE ("phone_number");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_points_snapshots"
    ADD CONSTRAINT "season_points_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_rankings"
    ADD CONSTRAINT "season_rankings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_user_metrics"
    ADD CONSTRAINT "season_user_metrics_pkey" PRIMARY KEY ("season_id", "user_id");



ALTER TABLE ONLY "public"."season_voter_rankings"
    ADD CONSTRAINT "season_voter_rankings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_audit_log"
    ADD CONSTRAINT "security_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."simple_ads"
    ADD CONSTRAINT "simple_ads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_news"
    ADD CONSTRAINT "site_news_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."battle_votes"
    ADD CONSTRAINT "unique_user_battle_vote" UNIQUE ("battle_id", "user_id");



ALTER TABLE ONLY "public"."community_members"
    ADD CONSTRAINT "unique_user_community" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_rewards"
    ADD CONSTRAINT "user_rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_rewards"
    ADD CONSTRAINT "user_rewards_user_id_reward_id_key" UNIQUE ("user_id", "reward_id");



CREATE INDEX "ad_placement_assignments_placement_idx" ON "public"."ad_placement_assignments" USING "btree" ("placement_id", "is_pinned", "priority");



CREATE INDEX "ad_placements_is_active_idx" ON "public"."ad_placements" USING "btree" ("is_active");



CREATE UNIQUE INDEX "battle_votes_battle_id_user_id_key" ON "public"."battle_votes" USING "btree" ("battle_id", "user_id");



CREATE INDEX "idx_active_battles_end_voting_at" ON "public"."active_battles" USING "btree" ("end_voting_at");



CREATE INDEX "idx_active_battles_player1_user_id" ON "public"."active_battles" USING "btree" ("player1_user_id");



CREATE INDEX "idx_active_battles_player2_user_id" ON "public"."active_battles" USING "btree" ("player2_user_id");



CREATE INDEX "idx_active_battles_season_id" ON "public"."active_battles" USING "btree" ("season_id");



CREATE INDEX "idx_active_battles_status" ON "public"."active_battles" USING "btree" ("status");



CREATE INDEX "idx_active_battles_user_created" ON "public"."active_battles" USING "btree" ("player1_user_id", "player2_user_id", "created_at");



CREATE INDEX "idx_archived_battle_votes_archived_battle_id" ON "public"."archived_battle_votes" USING "btree" ("archived_battle_id");



CREATE INDEX "idx_archived_battle_votes_created_at" ON "public"."archived_battle_votes" USING "btree" ("created_at");



CREATE INDEX "idx_archived_battle_votes_user_id" ON "public"."archived_battle_votes" USING "btree" ("user_id");



CREATE INDEX "idx_archived_battles_season_player1" ON "public"."archived_battles" USING "btree" ("season_id", "player1_user_id", "archived_at" DESC);



CREATE INDEX "idx_archived_battles_season_player2" ON "public"."archived_battles" USING "btree" ("season_id", "player2_user_id", "archived_at" DESC);



CREATE INDEX "idx_archived_battles_user_created" ON "public"."archived_battles" USING "btree" ("player1_user_id", "player2_user_id", "created_at");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_battle_votes_battle_id" ON "public"."battle_votes" USING "btree" ("battle_id");



CREATE INDEX "idx_battle_votes_comment" ON "public"."battle_votes" USING "btree" ("battle_id") WHERE ("comment" IS NOT NULL);



CREATE INDEX "idx_battle_votes_season_id" ON "public"."battle_votes" USING "btree" ("season_id");



CREATE INDEX "idx_battle_votes_user_id" ON "public"."battle_votes" USING "btree" ("user_id");



CREATE INDEX "idx_community_chat_messages_community_id_created_at" ON "public"."community_chat_messages" USING "btree" ("community_id", "created_at" DESC);



CREATE INDEX "idx_community_members_user_id" ON "public"."community_members" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "idx_notifications_related_site_news" ON "public"."notifications" USING "btree" ("related_site_news_id");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_phone_verifications_phone_number" ON "public"."phone_verifications" USING "btree" ("phone_number") WHERE ("is_active" = true);



CREATE UNIQUE INDEX "idx_phone_verifications_user_id" ON "public"."phone_verifications" USING "btree" ("user_id") WHERE ("is_active" = true);



CREATE INDEX "idx_phone_verifications_verified_at" ON "public"."phone_verifications" USING "btree" ("verified_at");



CREATE INDEX "idx_profiles_has_seen_onboarding" ON "public"."profiles" USING "btree" ("has_seen_onboarding");



CREATE INDEX "idx_profiles_not_deleted" ON "public"."profiles" USING "btree" ("id") WHERE ("is_deleted" = false);



CREATE INDEX "idx_profiles_phone_number" ON "public"."profiles" USING "btree" ("phone_number");



CREATE INDEX "idx_profiles_phone_verified" ON "public"."profiles" USING "btree" ("phone_verified");



CREATE INDEX "idx_profiles_rating" ON "public"."profiles" USING "btree" ("rating");



CREATE INDEX "idx_push_subscriptions_user_id" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_rewards_is_active" ON "public"."rewards" USING "btree" ("is_active");



CREATE INDEX "idx_rewards_season_id" ON "public"."rewards" USING "btree" ("season_id");



CREATE INDEX "idx_rewards_type" ON "public"."rewards" USING "btree" ("type");



CREATE INDEX "idx_season_rankings_rank" ON "public"."season_rankings" USING "btree" ("rank");



CREATE INDEX "idx_season_rankings_season_id" ON "public"."season_rankings" USING "btree" ("season_id");



CREATE UNIQUE INDEX "idx_season_rankings_unique" ON "public"."season_rankings" USING "btree" ("season_id", "user_id");



CREATE INDEX "idx_season_rankings_user_id" ON "public"."season_rankings" USING "btree" ("user_id");



CREATE INDEX "idx_season_voter_rankings_rank" ON "public"."season_voter_rankings" USING "btree" ("rank");



CREATE INDEX "idx_season_voter_rankings_season_id" ON "public"."season_voter_rankings" USING "btree" ("season_id");



CREATE UNIQUE INDEX "idx_season_voter_rankings_unique" ON "public"."season_voter_rankings" USING "btree" ("season_id", "user_id");



CREATE INDEX "idx_season_voter_rankings_user_id" ON "public"."season_voter_rankings" USING "btree" ("user_id");



CREATE INDEX "idx_seasons_end_at" ON "public"."seasons" USING "btree" ("end_at");



CREATE INDEX "idx_seasons_start_at" ON "public"."seasons" USING "btree" ("start_at");



CREATE INDEX "idx_seasons_status" ON "public"."seasons" USING "btree" ("status");



CREATE INDEX "idx_security_audit_log_event_type" ON "public"."security_audit_log" USING "btree" ("event_type", "created_at" DESC);



CREATE INDEX "idx_site_news_content_type" ON "public"."site_news" USING "btree" ("content_type", "published_at" DESC);



CREATE INDEX "idx_site_news_display_order" ON "public"."site_news" USING "btree" ("display_order", "published_at" DESC);



CREATE INDEX "idx_site_news_featured" ON "public"."site_news" USING "btree" ("is_featured", "published_at" DESC);



CREATE INDEX "idx_site_news_lang_published_order" ON "public"."site_news" USING "btree" ("language", "is_published", "display_order", "published_at" DESC);



CREATE INDEX "idx_site_news_published" ON "public"."site_news" USING "btree" ("is_published", "published_at" DESC);



CREATE INDEX "idx_sps_season_user" ON "public"."season_points_snapshots" USING "btree" ("season_id", "user_id");



CREATE INDEX "idx_submissions_active_battle_id" ON "public"."submissions" USING "btree" ("active_battle_id");



CREATE INDEX "idx_submissions_status" ON "public"."submissions" USING "btree" ("status");



CREATE INDEX "idx_submissions_user_id" ON "public"."submissions" USING "btree" ("user_id");



CREATE INDEX "idx_sum_season_margin" ON "public"."season_user_metrics" USING "btree" ("season_id", "sum_margin_ratio" DESC);



CREATE INDEX "idx_sum_season_share" ON "public"."season_user_metrics" USING "btree" ("season_id", "weighted_vote_share" DESC);



CREATE INDEX "idx_user_rewards_earned_season" ON "public"."user_rewards" USING "btree" ("earned_season_id");



CREATE INDEX "idx_user_rewards_reward_id" ON "public"."user_rewards" USING "btree" ("reward_id");



CREATE INDEX "idx_user_rewards_user_id" ON "public"."user_rewards" USING "btree" ("user_id");



CREATE INDEX "simple_ads_active_contract_idx" ON "public"."simple_ads" USING "btree" ("is_active", "contract_start_date", "contract_end_date");



CREATE INDEX "simple_ads_advertiser_id_idx" ON "public"."simple_ads" USING "btree" ("advertiser_id");



CREATE UNIQUE INDEX "unique_user_endpoint" ON "public"."push_subscriptions" USING "btree" ("user_id", (("subscription" ->> 'endpoint'::"text")));



CREATE OR REPLACE TRIGGER "after_comment_insert_delete" AFTER INSERT OR DELETE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_post_comments_count"();



CREATE OR REPLACE TRIGGER "on_comments_updated" BEFORE UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_posts_updated" BEFORE UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "sync_user_community_trigger" AFTER INSERT OR DELETE ON "public"."community_members" FOR EACH ROW EXECUTE FUNCTION "public"."sync_user_community"();



CREATE OR REPLACE TRIGGER "trg_update_season_vote_metrics_after_battle" AFTER INSERT ON "public"."archived_battles" FOR EACH ROW EXECUTE FUNCTION "public"."tg_update_season_vote_metrics_after_battle"();



CREATE OR REPLACE TRIGGER "trigger_auto_set_user_language" BEFORE INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_user_language"();



CREATE OR REPLACE TRIGGER "update_ad_placement_assignments_updated_at" BEFORE UPDATE ON "public"."ad_placement_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_communities_updated_at" BEFORE UPDATE ON "public"."communities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_community_chat_messages_updated_at" BEFORE UPDATE ON "public"."community_chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_community_stats_trigger" AFTER INSERT OR DELETE ON "public"."community_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_community_stats_trigger"();



CREATE OR REPLACE TRIGGER "update_notifications_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_push_subscriptions_updated_at" BEFORE UPDATE ON "public"."push_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rewards_updated_at" BEFORE UPDATE ON "public"."rewards" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_simple_ads_updated_at" BEFORE UPDATE ON "public"."simple_ads" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "validate_vote_trigger" BEFORE INSERT ON "public"."battle_votes" FOR EACH ROW EXECUTE FUNCTION "public"."validate_battle_vote"();



ALTER TABLE ONLY "public"."active_battles"
    ADD CONSTRAINT "active_battles_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ad_placement_assignments"
    ADD CONSTRAINT "ad_placement_assignments_placement_id_fkey" FOREIGN KEY ("placement_id") REFERENCES "public"."ad_placements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ad_placement_assignments"
    ADD CONSTRAINT "ad_placement_assignments_simple_ad_id_fkey" FOREIGN KEY ("simple_ad_id") REFERENCES "public"."simple_ads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."archived_battle_votes"
    ADD CONSTRAINT "archived_battle_votes_archived_battle_id_fkey" FOREIGN KEY ("archived_battle_id") REFERENCES "public"."archived_battles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."archived_battle_votes"
    ADD CONSTRAINT "archived_battle_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."battle_votes"
    ADD CONSTRAINT "battle_votes_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."community_chat_messages"
    ADD CONSTRAINT "community_chat_messages_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_chat_messages"
    ADD CONSTRAINT "community_chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."community_members"
    ADD CONSTRAINT "community_members_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_members"
    ADD CONSTRAINT "community_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."archived_battles"
    ADD CONSTRAINT "fk_archived_battles_player1_user_id" FOREIGN KEY ("player1_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."archived_battles"
    ADD CONSTRAINT "fk_archived_battles_player2_user_id" FOREIGN KEY ("player2_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."archived_battles"
    ADD CONSTRAINT "fk_archived_battles_winner_id" FOREIGN KEY ("winner_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_related_season_id_fkey" FOREIGN KEY ("related_season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_related_site_news_id_fkey" FOREIGN KEY ("related_site_news_id") REFERENCES "public"."site_news"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."phone_verifications"
    ADD CONSTRAINT "phone_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_profiles_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_rankings"
    ADD CONSTRAINT "season_rankings_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_rankings"
    ADD CONSTRAINT "season_rankings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_voter_rankings"
    ADD CONSTRAINT "season_voter_rankings_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_voter_rankings"
    ADD CONSTRAINT "season_voter_rankings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."security_audit_log"
    ADD CONSTRAINT "security_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."simple_ads"
    ADD CONSTRAINT "simple_ads_advertiser_id_fkey" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertisers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_rewards"
    ADD CONSTRAINT "user_rewards_earned_season_id_fkey" FOREIGN KEY ("earned_season_id") REFERENCES "public"."seasons"("id");



ALTER TABLE ONLY "public"."user_rewards"
    ADD CONSTRAINT "user_rewards_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_rewards"
    ADD CONSTRAINT "user_rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Allow full access for service_role" ON "public"."pre_registered_users" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow users to delete their own comments" ON "public"."comments" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to delete their own posts" ON "public"."posts" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to insert their own comments" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to insert their own posts" ON "public"."posts" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to update their own comments" ON "public"."comments" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to update their own posts" ON "public"."posts" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Anonymous users can view basic profile info" ON "public"."profiles" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anyone can read active rewards" ON "public"."rewards" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Authenticated users can create communities" ON "public"."communities" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_user_id"));



CREATE POLICY "Authenticated users can delete" ON "public"."site_news" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert" ON "public"."site_news" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update" ON "public"."site_news" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can vote" ON "public"."battle_votes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Communities are viewable by everyone" ON "public"."communities" FOR SELECT USING (true);



CREATE POLICY "Enable phone read for owner" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Enable phone update for owner" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Only active profiles are viewable" ON "public"."profiles" FOR SELECT USING ((("is_deleted" = false) OR ("is_deleted" IS NULL)));



CREATE POLICY "Only owner can delete community" ON "public"."communities" FOR DELETE USING (("auth"."uid"() = "owner_user_id"));



CREATE POLICY "Owner and admins can update community" ON "public"."communities" FOR UPDATE USING ((("auth"."uid"() = "owner_user_id") OR (EXISTS ( SELECT 1
   FROM "public"."community_members" "cm"
  WHERE (("cm"."community_id" = "communities"."id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = ANY (ARRAY['owner'::"public"."community_role", 'admin'::"public"."community_role"])))))));



CREATE POLICY "Public can view active battles" ON "public"."active_battles" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public can view archived battle votes" ON "public"."archived_battle_votes" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public can view archived battles" ON "public"."archived_battles" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public can view submissions in battles" ON "public"."submissions" FOR SELECT TO "authenticated", "anon" USING (("status" = ANY (ARRAY['MATCHED_IN_BATTLE'::"public"."submission_status", 'BATTLE_ENDED'::"public"."submission_status"])));



CREATE POLICY "Public profiles are viewable by authenticated users only" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public read access" ON "public"."site_news" FOR SELECT USING (true);



CREATE POLICY "Public view votes (non-deleted users)" ON "public"."battle_votes" FOR SELECT TO "authenticated", "anon" USING ((("user_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "battle_votes"."user_id") AND (("p"."is_deleted" = false) OR ("p"."is_deleted" IS NULL)))))));



CREATE POLICY "Season rankings are viewable by everyone" ON "public"."season_rankings" FOR SELECT USING (true);



COMMENT ON POLICY "Season rankings are viewable by everyone" ON "public"."season_rankings" IS '過去のシーズンランキングは、誰でも閲覧できるように公開情報とします。';



CREATE POLICY "Season voter rankings are viewable by everyone" ON "public"."season_voter_rankings" FOR SELECT USING (true);



COMMENT ON POLICY "Season voter rankings are viewable by everyone" ON "public"."season_voter_rankings" IS '過去のシーズン投票者ランキングは、誰でも閲覧できるように公開情報とします。';



CREATE POLICY "Service role full access" ON "public"."phone_verifications" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role only access" ON "public"."audit_logs" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role only access" ON "public"."security_audit_log" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "System can delete archived battle votes" ON "public"."archived_battle_votes" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "System can insert archived battle votes" ON "public"."archived_battle_votes" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "System can insert archived battles" ON "public"."archived_battles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "System can insert battles" ON "public"."active_battles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "System can update archived battle votes" ON "public"."archived_battle_votes" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "System can update archived battles" ON "public"."archived_battles" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "System can update battles" ON "public"."active_battles" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Users can delete their own notifications" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own votes" ON "public"."battle_votes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own submissions" ON "public"."submissions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own rewards" ON "public"."user_rewards" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own submissions" ON "public"."submissions" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND ("status" = 'WAITING_OPPONENT'::"public"."submission_status"))) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own votes" ON "public"."battle_votes" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own phone verification" ON "public"."phone_verifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own submissions" ON "public"."submissions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "View posts from active users only" ON "public"."posts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "posts"."user_id") AND (("profiles"."is_deleted" = false) OR ("profiles"."is_deleted" IS NULL))))));



ALTER TABLE "public"."active_battles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ad_placement_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ad_placement_assignments_modify" ON "public"."ad_placement_assignments" USING (("public"."app_role"() = ANY (ARRAY['internal_admin'::"text", 'ad_ops'::"text"]))) WITH CHECK (("public"."app_role"() = ANY (ARRAY['internal_admin'::"text", 'ad_ops'::"text"])));



CREATE POLICY "ad_placement_assignments_select" ON "public"."ad_placement_assignments" FOR SELECT USING (("public"."app_role"() = ANY (ARRAY['internal_admin'::"text", 'ad_ops'::"text", 'viewer'::"text"])));



ALTER TABLE "public"."ad_placements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ad_placements_modify" ON "public"."ad_placements" USING (("public"."app_role"() = ANY (ARRAY['internal_admin'::"text", 'ad_ops'::"text"]))) WITH CHECK (("public"."app_role"() = ANY (ARRAY['internal_admin'::"text", 'ad_ops'::"text"])));



CREATE POLICY "ad_placements_select" ON "public"."ad_placements" FOR SELECT USING (("public"."app_role"() = ANY (ARRAY['internal_admin'::"text", 'ad_ops'::"text", 'viewer'::"text"])));



ALTER TABLE "public"."advertisers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "advertisers_modify" ON "public"."advertisers" USING (("public"."app_role"() = ANY (ARRAY['internal_admin'::"text", 'ad_ops'::"text"]))) WITH CHECK (("public"."app_role"() = ANY (ARRAY['internal_admin'::"text", 'ad_ops'::"text"])));



CREATE POLICY "advertisers_select" ON "public"."advertisers" FOR SELECT USING (("public"."app_role"() = ANY (ARRAY['internal_admin'::"text", 'ad_ops'::"text", 'viewer'::"text"])));



CREATE POLICY "api_public_profiles_select" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "api_users_insert_own_profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "api_users_update_own_profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."archived_battle_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."archived_battles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated_users_own_subscriptions" ON "public"."push_subscriptions" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."battle_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."communities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_template_specs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete_own" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "notifications_insert_own" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."phone_verifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pre_registered_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rewards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."season_rankings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "season_rankings_insert_policy" ON "public"."season_rankings" FOR INSERT TO "authenticated" WITH CHECK (false);



ALTER TABLE "public"."season_user_metrics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "season_user_metrics_public_select" ON "public"."season_user_metrics" FOR SELECT TO "authenticated", "anon" USING (true);



COMMENT ON POLICY "season_user_metrics_public_select" ON "public"."season_user_metrics" IS 'Allow anyone (anon/authenticated) to read season_user_metrics for rankings view.';



ALTER TABLE "public"."season_voter_rankings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "season_voter_rankings_insert_policy" ON "public"."season_voter_rankings" FOR INSERT TO "authenticated" WITH CHECK (false);



ALTER TABLE "public"."seasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seasons_insert_policy" ON "public"."seasons" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."jwt"() ->> 'email'::"text") = 'admin@beatnexus.com'::"text"));



CREATE POLICY "seasons_select_policy" ON "public"."seasons" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "seasons_select_policy_anon" ON "public"."seasons" FOR SELECT TO "anon" USING (true);



CREATE POLICY "seasons_update_policy" ON "public"."seasons" FOR UPDATE TO "authenticated" USING ((("auth"."jwt"() ->> 'email'::"text") = 'admin@beatnexus.com'::"text"));



ALTER TABLE "public"."security_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."simple_ads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "simple_ads_modify" ON "public"."simple_ads" USING (("public"."app_role"() = ANY (ARRAY['internal_admin'::"text", 'ad_ops'::"text"]))) WITH CHECK (("public"."app_role"() = ANY (ARRAY['internal_admin'::"text", 'ad_ops'::"text"])));



CREATE POLICY "simple_ads_select" ON "public"."simple_ads" FOR SELECT USING (("public"."app_role"() = ANY (ARRAY['internal_admin'::"text", 'ad_ops'::"text", 'viewer'::"text"])));



ALTER TABLE "public"."site_news" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_rewards" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."ad_serve_candidates"("p_placement_key" "text", "p_user_id" "uuid", "p_anon_id" "text", "p_country" "text", "p_language" "text", "p_device" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ad_serve_candidates"("p_placement_key" "text", "p_user_id" "uuid", "p_anon_id" "text", "p_country" "text", "p_language" "text", "p_device" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ad_serve_candidates"("p_placement_key" "text", "p_user_id" "uuid", "p_anon_id" "text", "p_country" "text", "p_language" "text", "p_device" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_force_release_email"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_force_release_email"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_force_release_email"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_force_release_email_v2"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_force_release_email_v2"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_force_release_email_v2"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."app_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."app_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."app_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_release_deleted_emails"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_release_deleted_emails"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_release_deleted_emails"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_set_user_language"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_set_user_language"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_set_user_language"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_elo_rating"("winner_rating" integer, "loser_rating" integer, "k_factor" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_elo_rating"("winner_rating" integer, "loser_rating" integer, "k_factor" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_elo_rating"("winner_rating" integer, "loser_rating" integer, "k_factor" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_elo_rating_change"("player_rating" integer, "opponent_rating" integer, "result" numeric, "k_factor" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_elo_rating_change"("player_rating" integer, "opponent_rating" integer, "result" numeric, "k_factor" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_elo_rating_change"("player_rating" integer, "opponent_rating" integer, "result" numeric, "k_factor" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_elo_rating_with_format"("winner_rating" integer, "loser_rating" integer, "battle_format" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_elo_rating_with_format"("winner_rating" integer, "loser_rating" integer, "battle_format" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_elo_rating_with_format"("winner_rating" integer, "loser_rating" integer, "battle_format" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_tie_rating_with_format"("player1_rating" integer, "player2_rating" integer, "battle_format" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_tie_rating_with_format"("player1_rating" integer, "player2_rating" integer, "battle_format" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_tie_rating_with_format"("player1_rating" integer, "player2_rating" integer, "battle_format" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."call_edge_function"("function_name" "text", "payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."call_edge_function"("function_name" "text", "payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."call_edge_function"("function_name" "text", "payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_submit_video"() TO "anon";
GRANT ALL ON FUNCTION "public"."can_submit_video"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_submit_video"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_vote"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_vote"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_vote"("p_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_phone_availability"("phone_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_phone_availability"("phone_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_phone_availability"("phone_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_rate_limit"("phone_number" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("phone_number" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("phone_number" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_submission_cooldown"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_submission_cooldown"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_submission_cooldown"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_all_deleted_user_videos"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_all_deleted_user_videos"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_all_deleted_user_videos"() TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_battle_with_season_update"("p_battle_id" "uuid", "p_winner_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_battle_with_season_update"("p_battle_id" "uuid", "p_winner_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_battle_with_season_update"("p_battle_id" "uuid", "p_winner_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_battle_with_video_archiving"("p_battle_id" "uuid", "p_winner_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_battle_with_video_archiving"("p_battle_id" "uuid", "p_winner_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_battle_with_video_archiving"("p_battle_id" "uuid", "p_winner_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_community"("p_name" "text", "p_description" "text", "p_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_community"("p_name" "text", "p_description" "text", "p_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_community"("p_name" "text", "p_description" "text", "p_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_submission_with_cooldown_check"("p_user_id" "uuid", "p_video_url" "text", "p_battle_format" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_submission_with_cooldown_check"("p_user_id" "uuid", "p_video_url" "text", "p_battle_format" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_submission_with_cooldown_check"("p_user_id" "uuid", "p_video_url" "text", "p_battle_format" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_community"("p_community_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_community"("p_community_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_community"("p_community_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_videos_from_storage"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_videos_from_storage"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_videos_from_storage"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."end_current_season"() TO "anon";
GRANT ALL ON FUNCTION "public"."end_current_season"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."end_current_season"() TO "service_role";



GRANT ALL ON FUNCTION "public"."find_match_and_create_battle"("p_submission_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."find_match_and_create_battle"("p_submission_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_match_and_create_battle"("p_submission_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_archived_battles_for_active_season"("p_pairs" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_archived_battles_for_active_season"("p_pairs" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_archived_battles_for_active_season"("p_pairs" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."seasons" TO "anon";
GRANT ALL ON TABLE "public"."seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."seasons" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_season"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_season"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_season"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_ad_stats"("period" "text", "p_placement_key" "text", "p_campaign_id" "uuid", "p_flight_id" "uuid", "p_creative_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_ad_stats"("period" "text", "p_placement_key" "text", "p_campaign_id" "uuid", "p_flight_id" "uuid", "p_creative_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ad_stats"("period" "text", "p_placement_key" "text", "p_campaign_id" "uuid", "p_flight_id" "uuid", "p_creative_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_seasons"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_seasons"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_seasons"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_battle_comments"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_battle_comments"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_battle_comments"("p_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_battle_result_notification_text"("p_outcome" "text", "p_opponent_username" "text", "p_language" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_battle_result_notification_text"("p_outcome" "text", "p_opponent_username" "text", "p_language" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_battle_result_notification_text"("p_outcome" "text", "p_opponent_username" "text", "p_language" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_k_factor_by_format"("battle_format" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_k_factor_by_format"("battle_format" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_k_factor_by_format"("battle_format" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_k_factor_by_format"("battle_format" "public"."battle_format") TO "anon";
GRANT ALL ON FUNCTION "public"."get_k_factor_by_format"("battle_format" "public"."battle_format") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_k_factor_by_format"("battle_format" "public"."battle_format") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_loss_streak_before_battle"("p_user_id" "uuid", "p_season_id" "uuid", "p_battle_original_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_loss_streak_before_battle"("p_user_id" "uuid", "p_season_id" "uuid", "p_battle_original_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_loss_streak_before_battle"("p_user_id" "uuid", "p_season_id" "uuid", "p_battle_original_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_original_email_hint"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_original_email_hint"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_original_email_hint"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_profile"("profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_profile"("profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_profile"("profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_rank_color_from_rating"("rating" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_rank_color_from_rating"("rating" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_rank_color_from_rating"("rating" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_rank_from_rating"("rating" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_rank_from_rating"("rating" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_rank_from_rating"("rating" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_season_rankings_by_id"("p_season_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_season_rankings_by_id"("p_season_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_season_rankings_by_id"("p_season_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_season_voter_rankings_by_id"("p_season_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_season_voter_rankings_by_id"("p_season_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_season_voter_rankings_by_id"("p_season_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_submission_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_submission_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_submission_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_rankings"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_rankings"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_rankings"("p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_voter_rankings"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_voter_rankings"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_voter_rankings"("p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_current_community"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_current_community"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_current_community"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_email_language"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_email_language"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_email_language"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_profile"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_profile"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_profile"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_rank"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_rank"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_rank"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_season_rank"("user_id_input" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_season_rank"("user_id_input" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_season_rank"("user_id_input" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_season_voter_rank"("user_id_input" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_season_voter_rank"("user_id_input" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_season_voter_rank"("user_id_input" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_vote"("p_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_vote"("p_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_vote"("p_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_voter_rank"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_voter_rank"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_voter_rank"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_waiting_submissions"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_waiting_submissions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_waiting_submissions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."grant_season_rewards"("season_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."grant_season_rewards"("season_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."grant_season_rewards"("season_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."join_community"("p_community_id" "uuid", "p_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."join_community"("p_community_id" "uuid", "p_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_community"("p_community_id" "uuid", "p_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."kick_member_from_community"("p_community_id" "uuid", "p_target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."kick_member_from_community"("p_community_id" "uuid", "p_target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."kick_member_from_community"("p_community_id" "uuid", "p_target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."leave_community"("p_community_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."leave_community"("p_community_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."leave_community"("p_community_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_api_access"("table_name" "text", "operation" "text", "user_id" "uuid", "query_params" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_api_access"("table_name" "text", "operation" "text", "user_id" "uuid", "query_params" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_api_access"("table_name" "text", "operation" "text", "user_id" "uuid", "query_params" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_audit_event"("p_table_name" "text", "p_action" "text", "p_user_id" "uuid", "p_details" "jsonb", "p_success" boolean, "p_error_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_audit_event"("p_table_name" "text", "p_action" "text", "p_user_id" "uuid", "p_details" "jsonb", "p_success" boolean, "p_error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_audit_event"("p_table_name" "text", "p_action" "text", "p_user_id" "uuid", "p_details" "jsonb", "p_success" boolean, "p_error_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_password_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_password_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_password_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_security_event"("p_event_type" "text", "p_user_id" "uuid", "p_phone_number" "text", "p_event_data" "jsonb", "p_severity_level" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."log_security_event"("p_event_type" "text", "p_user_id" "uuid", "p_phone_number" "text", "p_event_data" "jsonb", "p_severity_level" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_security_event"("p_event_type" "text", "p_user_id" "uuid", "p_phone_number" "text", "p_event_data" "jsonb", "p_severity_level" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_phone_number"("phone_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_phone_number"("phone_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_phone_number"("phone_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_battle_completed_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_battle_completed_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_battle_completed_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_battle_created_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_battle_created_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_battle_created_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_vote_cast_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_vote_cast_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_vote_cast_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_expired_battles"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_expired_battles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_expired_battles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."progressive_matchmaking"() TO "anon";
GRANT ALL ON FUNCTION "public"."progressive_matchmaking"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."progressive_matchmaking"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_season_points_fixed"("p_season_id" "uuid", "p_base_points" integer, "p_dry_run" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."recompute_season_points_fixed"("p_season_id" "uuid", "p_base_points" integer, "p_dry_run" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_season_points_fixed"("p_season_id" "uuid", "p_base_points" integer, "p_dry_run" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_season_vote_metrics"("p_season_id" "uuid", "p_truncate" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."recompute_season_vote_metrics"("p_season_id" "uuid", "p_truncate" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_season_vote_metrics"("p_season_id" "uuid", "p_truncate" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."record_phone_verification"("p_user_id" "uuid", "p_phone_number" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_phone_verification"("p_user_id" "uuid", "p_phone_number" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_phone_verification"("p_user_id" "uuid", "p_phone_number" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_mv_ad_stats_daily"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_mv_ad_stats_daily"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_mv_ad_stats_daily"() TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_season_points_from_snapshot"("p_season_id" "uuid", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_season_points_from_snapshot"("p_season_id" "uuid", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_season_points_from_snapshot"("p_season_id" "uuid", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."safe_delete_user_account"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_delete_user_account"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_delete_user_account"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."safe_delete_user_account_v4"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_delete_user_account_v4"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_delete_user_account_v4"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_user_language_from_browser"("p_user_id" "uuid", "p_browser_language" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_user_language_from_browser"("p_user_id" "uuid", "p_browser_language" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_user_language_from_browser"("p_user_id" "uuid", "p_browser_language" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."setup_custom_email_templates"() TO "anon";
GRANT ALL ON FUNCTION "public"."setup_custom_email_templates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."setup_custom_email_templates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."snapshot_season_points"("p_season_id" "uuid", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."snapshot_season_points"("p_season_id" "uuid", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."snapshot_season_points"("p_season_id" "uuid", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."start_new_season"() TO "anon";
GRANT ALL ON FUNCTION "public"."start_new_season"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_new_season"() TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_video"("p_video_url" "text", "p_battle_format" "public"."battle_format") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_video"("p_video_url" "text", "p_battle_format" "public"."battle_format") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_video"("p_video_url" "text", "p_battle_format" "public"."battle_format") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_community"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_community"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_community"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_update_season_vote_metrics_after_battle"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_update_season_vote_metrics_after_battle"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_update_season_vote_metrics_after_battle"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_battle_ratings_safe"("p_battle_id" "uuid", "p_winner_id" "uuid", "p_player1_deleted" boolean, "p_player2_deleted" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_battle_ratings_safe"("p_battle_id" "uuid", "p_winner_id" "uuid", "p_player1_deleted" boolean, "p_player2_deleted" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_battle_ratings_safe"("p_battle_id" "uuid", "p_winner_id" "uuid", "p_player1_deleted" boolean, "p_player2_deleted" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_community_stats"("p_community_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_community_stats"("p_community_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_community_stats"("p_community_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_community_stats_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_community_stats_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_community_stats_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_member_role"("p_community_id" "uuid", "p_target_user_id" "uuid", "p_new_role" "public"."community_role") TO "anon";
GRANT ALL ON FUNCTION "public"."update_member_role"("p_community_id" "uuid", "p_target_user_id" "uuid", "p_new_role" "public"."community_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_member_role"("p_community_id" "uuid", "p_target_user_id" "uuid", "p_new_role" "public"."community_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_onboarding_status"("p_user_id" "uuid", "p_has_seen_onboarding" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_onboarding_status"("p_user_id" "uuid", "p_has_seen_onboarding" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_onboarding_status"("p_user_id" "uuid", "p_has_seen_onboarding" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_post_comments_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_post_comments_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_post_comments_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_season_points_after_battle"("p_battle_id" "uuid", "p_winner_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_season_points_after_battle"("p_battle_id" "uuid", "p_winner_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_season_points_after_battle"("p_battle_id" "uuid", "p_winner_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_season_vote_metrics_after_battle"("p_archived_battle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_season_vote_metrics_after_battle"("p_archived_battle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_season_vote_metrics_after_battle"("p_archived_battle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_avatar"("p_user_id" "uuid", "p_avatar_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_avatar"("p_user_id" "uuid", "p_avatar_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_avatar"("p_user_id" "uuid", "p_avatar_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_language"("p_user_id" "uuid", "p_language" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_language"("p_user_id" "uuid", "p_language" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_language"("p_user_id" "uuid", "p_language" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_profile_details"("p_user_id" "uuid", "p_username" "text", "p_bio" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_profile_details"("p_user_id" "uuid", "p_username" "text", "p_bio" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_profile_details"("p_user_id" "uuid", "p_username" "text", "p_bio" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_battle_vote"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_battle_vote"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_battle_vote"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vote_battle"("p_battle_id" "uuid", "p_vote" character) TO "anon";
GRANT ALL ON FUNCTION "public"."vote_battle"("p_battle_id" "uuid", "p_vote" character) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vote_battle"("p_battle_id" "uuid", "p_vote" character) TO "service_role";



GRANT ALL ON FUNCTION "public"."vote_battle_fixed"("p_battle_id" "uuid", "p_vote" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."vote_battle_fixed"("p_battle_id" "uuid", "p_vote" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vote_battle_fixed"("p_battle_id" "uuid", "p_vote" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."vote_battle_with_comment"("p_battle_id" "uuid", "p_vote" character, "p_comment" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."vote_battle_with_comment"("p_battle_id" "uuid", "p_vote" character, "p_comment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vote_battle_with_comment"("p_battle_id" "uuid", "p_vote" character, "p_comment" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."withdraw_submission"("p_submission_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."withdraw_submission"("p_submission_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."withdraw_submission"("p_submission_id" "uuid") TO "service_role";
























GRANT ALL ON TABLE "public"."active_battles" TO "anon";
GRANT ALL ON TABLE "public"."active_battles" TO "authenticated";
GRANT ALL ON TABLE "public"."active_battles" TO "service_role";



GRANT ALL ON TABLE "public"."ad_placement_assignments" TO "anon";
GRANT ALL ON TABLE "public"."ad_placement_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."ad_placement_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."ad_placements" TO "anon";
GRANT ALL ON TABLE "public"."ad_placements" TO "authenticated";
GRANT ALL ON TABLE "public"."ad_placements" TO "service_role";



GRANT ALL ON TABLE "public"."advertisers" TO "anon";
GRANT ALL ON TABLE "public"."advertisers" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisers" TO "service_role";



GRANT ALL ON TABLE "public"."archived_battle_votes" TO "anon";
GRANT ALL ON TABLE "public"."archived_battle_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."archived_battle_votes" TO "service_role";



GRANT ALL ON TABLE "public"."archived_battles" TO "anon";
GRANT ALL ON TABLE "public"."archived_battles" TO "authenticated";
GRANT ALL ON TABLE "public"."archived_battles" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."battle_votes" TO "anon";
GRANT ALL ON TABLE "public"."battle_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."battle_votes" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."communities" TO "anon";
GRANT ALL ON TABLE "public"."communities" TO "authenticated";
GRANT ALL ON TABLE "public"."communities" TO "service_role";



GRANT ALL ON TABLE "public"."community_chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."community_chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."community_chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."community_members" TO "anon";
GRANT ALL ON TABLE "public"."community_members" TO "authenticated";
GRANT ALL ON TABLE "public"."community_members" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."community_rankings_view" TO "anon";
GRANT ALL ON TABLE "public"."community_rankings_view" TO "authenticated";
GRANT ALL ON TABLE "public"."community_rankings_view" TO "service_role";



GRANT ALL ON TABLE "public"."email_template_specs" TO "anon";
GRANT ALL ON TABLE "public"."email_template_specs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_template_specs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."email_template_specs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."email_template_specs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."email_template_specs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."global_community_rankings_view" TO "anon";
GRANT ALL ON TABLE "public"."global_community_rankings_view" TO "authenticated";
GRANT ALL ON TABLE "public"."global_community_rankings_view" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."phone_verifications" TO "anon";
GRANT ALL ON TABLE "public"."phone_verifications" TO "authenticated";
GRANT ALL ON TABLE "public"."phone_verifications" TO "service_role";



GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";



GRANT ALL ON TABLE "public"."pre_registered_users" TO "anon";
GRANT ALL ON TABLE "public"."pre_registered_users" TO "authenticated";
GRANT ALL ON TABLE "public"."pre_registered_users" TO "service_role";



GRANT ALL ON TABLE "public"."public_active_battles" TO "anon";
GRANT ALL ON TABLE "public"."public_active_battles" TO "authenticated";
GRANT ALL ON TABLE "public"."public_active_battles" TO "service_role";



GRANT ALL ON TABLE "public"."public_archived_battles" TO "anon";
GRANT ALL ON TABLE "public"."public_archived_battles" TO "authenticated";
GRANT ALL ON TABLE "public"."public_archived_battles" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."rankings_view" TO "anon";
GRANT ALL ON TABLE "public"."rankings_view" TO "authenticated";
GRANT ALL ON TABLE "public"."rankings_view" TO "service_role";



GRANT ALL ON TABLE "public"."rewards" TO "anon";
GRANT ALL ON TABLE "public"."rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."rewards" TO "service_role";



GRANT ALL ON TABLE "public"."season_points_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."season_points_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."season_points_snapshots" TO "service_role";



GRANT ALL ON SEQUENCE "public"."season_points_snapshots_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."season_points_snapshots_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."season_points_snapshots_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."season_rankings" TO "anon";
GRANT ALL ON TABLE "public"."season_rankings" TO "authenticated";
GRANT ALL ON TABLE "public"."season_rankings" TO "service_role";



GRANT ALL ON TABLE "public"."season_user_metrics" TO "anon";
GRANT ALL ON TABLE "public"."season_user_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."season_user_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."season_rankings_view" TO "anon";
GRANT ALL ON TABLE "public"."season_rankings_view" TO "authenticated";
GRANT ALL ON TABLE "public"."season_rankings_view" TO "service_role";



GRANT ALL ON TABLE "public"."season_voter_rankings" TO "anon";
GRANT ALL ON TABLE "public"."season_voter_rankings" TO "authenticated";
GRANT ALL ON TABLE "public"."season_voter_rankings" TO "service_role";



GRANT ALL ON TABLE "public"."season_voter_rankings_view" TO "anon";
GRANT ALL ON TABLE "public"."season_voter_rankings_view" TO "authenticated";
GRANT ALL ON TABLE "public"."season_voter_rankings_view" TO "service_role";



GRANT ALL ON TABLE "public"."security_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."security_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."security_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."simple_ads" TO "anon";
GRANT ALL ON TABLE "public"."simple_ads" TO "authenticated";
GRANT ALL ON TABLE "public"."simple_ads" TO "service_role";



GRANT ALL ON TABLE "public"."site_news" TO "anon";
GRANT ALL ON TABLE "public"."site_news" TO "authenticated";
GRANT ALL ON TABLE "public"."site_news" TO "service_role";



GRANT ALL ON TABLE "public"."submissions" TO "anon";
GRANT ALL ON TABLE "public"."submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."submissions" TO "service_role";



GRANT ALL ON TABLE "public"."user_communities_view" TO "anon";
GRANT ALL ON TABLE "public"."user_communities_view" TO "authenticated";
GRANT ALL ON TABLE "public"."user_communities_view" TO "service_role";



GRANT ALL ON TABLE "public"."user_rewards" TO "anon";
GRANT ALL ON TABLE "public"."user_rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."user_rewards" TO "service_role";



GRANT ALL ON TABLE "public"."voter_rankings_view" TO "anon";
GRANT ALL ON TABLE "public"."voter_rankings_view" TO "authenticated";
GRANT ALL ON TABLE "public"."voter_rankings_view" TO "service_role";



GRANT ALL ON TABLE "public"."votes" TO "anon";
GRANT ALL ON TABLE "public"."votes" TO "authenticated";
GRANT ALL ON TABLE "public"."votes" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
