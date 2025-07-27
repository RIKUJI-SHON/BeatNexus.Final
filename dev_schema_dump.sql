--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: pg_cron; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION pg_cron; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_cron IS 'Used for scheduling periodic jobs like season processing and matchmaking.';


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: pg_net; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_net; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_net IS 'Async HTTP';


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: supabase_functions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA supabase_functions;


--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA supabase_migrations;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: battle_format; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.battle_format AS ENUM (
    'MAIN_BATTLE',
    'MINI_BATTLE',
    'THEME_CHALLENGE'
);


--
-- Name: battle_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.battle_status AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'PROCESSING_RESULTS'
);


--
-- Name: community_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.community_role AS ENUM (
    'owner',
    'admin',
    'member'
);


--
-- Name: submission_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.submission_status AS ENUM (
    'WAITING_OPPONENT',
    'MATCHED_IN_BATTLE',
    'BATTLE_ENDED',
    'WITHDRAWN'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
begin
    raise debug 'PgBouncer auth request: %', p_usename;

    return query
    select 
        rolname::text, 
        case when rolvaliduntil < now() 
            then null 
            else rolpassword::text 
        end 
    from pg_authid 
    where rolname=$1 and rolcanlogin;
end;
$_$;


--
-- Name: admin_force_release_email(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_force_release_email(p_email text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION admin_force_release_email(p_email text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.admin_force_release_email(p_email text) IS '管理者用: 特定のメールアドレスを強制的に解放する関数';


--
-- Name: admin_force_release_email_v2(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_force_release_email_v2(p_email text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION admin_force_release_email_v2(p_email text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.admin_force_release_email_v2(p_email text) IS '管理者用v2: auth.identitiesも含む特定メールアドレスの強制解放';


--
-- Name: auto_release_deleted_emails(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_release_deleted_emails() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: auto_set_user_language(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_set_user_language() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- 新規作成時にlanguageがNULLの場合、デフォルトで英語を設定
  IF NEW.language IS NULL THEN
    NEW.language := 'en';
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: calculate_elo_rating(integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_elo_rating(winner_rating integer, loser_rating integer, k_factor integer DEFAULT 32) RETURNS json
    LANGUAGE plpgsql
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


--
-- Name: calculate_elo_rating_change(integer, integer, numeric, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_elo_rating_change(player_rating integer, opponent_rating integer, result numeric, k_factor integer DEFAULT 32) RETURNS integer
    LANGUAGE plpgsql
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


--
-- Name: calculate_elo_rating_with_format(integer, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_elo_rating_with_format(winner_rating integer, loser_rating integer, battle_format text DEFAULT 'MAIN_BATTLE'::text) RETURNS json
    LANGUAGE plpgsql
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


--
-- Name: FUNCTION calculate_elo_rating_with_format(winner_rating integer, loser_rating integer, battle_format text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_elo_rating_with_format(winner_rating integer, loser_rating integer, battle_format text) IS 'v2: Matches production. Calculates ELO rating with K-factor based on text battle_format.';


--
-- Name: calculate_tie_rating_with_format(integer, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_tie_rating_with_format(player1_rating integer, player2_rating integer, battle_format text) RETURNS json
    LANGUAGE plpgsql
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


--
-- Name: FUNCTION calculate_tie_rating_with_format(player1_rating integer, player2_rating integer, battle_format text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_tie_rating_with_format(player1_rating integer, player2_rating integer, battle_format text) IS 'v2: Matches production. Calculates tie rating with K-factor based on text battle_format.';


--
-- Name: call_edge_function(text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.call_edge_function(function_name text, payload jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: can_submit_video(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_submit_video() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
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
  
  -- シーズン終了日から5日以内かどうかをチェック
  v_season_end_date := v_active_season.end_at;
  
  -- 現在時刻がシーズン終了5日前以降の場合は投稿不可
  IF NOW() >= (v_season_end_date - INTERVAL '5 days') THEN
    RETURN FALSE;
  END IF;
  
  -- 上記条件を満たさない場合は投稿可能
  RETURN TRUE;
END;
$$;


--
-- Name: FUNCTION can_submit_video(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.can_submit_video() IS 'シーズンオフ機能: 動画投稿の可否を判定する関数。アクティブなシーズンがない場合や、シーズン終了5日前の場合はFALSEを返す';


--
-- Name: cancel_vote(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancel_vote(p_battle_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION cancel_vote(p_battle_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cancel_vote(p_battle_id uuid) IS 'v3 (Fixed Vote Count): Cancel vote with appropriate point deduction - both vote_count and season_vote_points follow comment bonus rules (-3 for comment votes, -1 for simple votes)';


--
-- Name: check_submission_cooldown(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_submission_cooldown(p_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION check_submission_cooldown(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_submission_cooldown(p_user_id uuid) IS '1時間投稿制限チェック関数：ユーザーの最後の投稿から1時間経過したかを確認し、投稿可能性と残り時間を返す';


--
-- Name: cleanup_all_deleted_user_videos(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_all_deleted_user_videos() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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
    -- 各ユーザーの動画を削除
    SELECT cleanup_all_deleted_user_videos() INTO v_cleanup_result;
    
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


--
-- Name: complete_battle_with_season_update(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_battle_with_season_update(p_battle_id uuid, p_winner_id uuid DEFAULT NULL::uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION complete_battle_with_season_update(p_battle_id uuid, p_winner_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.complete_battle_with_season_update(p_battle_id uuid, p_winner_id uuid) IS 'バトル完了時の統合処理：global_ratingとseason_pointsの両方を更新';


--
-- Name: complete_battle_with_video_archiving(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_battle_with_video_archiving(p_battle_id uuid, p_winner_id uuid DEFAULT NULL::uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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
BEGIN
  -- 1. バトル詳細を取得
  SELECT * INTO v_battle_rec
  FROM public.active_battles
  WHERE id = p_battle_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Battle not found'
    );
  END IF;

  -- 2. プレイヤーの削除状態を確認
  SELECT COALESCE(is_deleted, FALSE) INTO v_player1_deleted
  FROM public.profiles 
  WHERE id = v_battle_rec.player1_user_id;

  SELECT COALESCE(is_deleted, FALSE) INTO v_player2_deleted
  FROM public.profiles 
  WHERE id = v_battle_rec.player2_user_id;

  -- 3. プレイヤーのユーザー名を取得（通知用）
  SELECT username INTO v_player1_username
  FROM public.profiles 
  WHERE id = v_battle_rec.player1_user_id;

  SELECT username INTO v_player2_username
  FROM public.profiles 
  WHERE id = v_battle_rec.player2_user_id;

  -- 4. 動画URLを取得（永続保存用）
  SELECT video_url INTO v_player1_video_url
  FROM public.submissions
  WHERE id = v_battle_rec.player1_submission_id;

  SELECT video_url INTO v_player2_video_url
  FROM public.submissions
  WHERE id = v_battle_rec.player2_submission_id;

  -- 5. archived_battlesテーブルに挿入
  INSERT INTO public.archived_battles (
    original_battle_id,
    winner_id,
    final_votes_a,
    final_votes_b,
    battle_format,
    player1_user_id,
    player2_user_id,
    player1_submission_id,
    player2_submission_id,
    player1_video_url,
    player2_video_url,
    archived_at,
    created_at,
    updated_at
  ) VALUES (
    p_battle_id,
    p_winner_id,
    v_battle_rec.votes_a,
    v_battle_rec.votes_b,
    v_battle_rec.battle_format,
    v_battle_rec.player1_user_id,
    v_battle_rec.player2_user_id,
    v_battle_rec.player1_submission_id,
    v_battle_rec.player2_submission_id,
    v_player1_video_url,
    v_player2_video_url,
    NOW(),
    NOW(),
    NOW()
  ) RETURNING id INTO v_archived_battle_id;

  -- 6. archived_battle_votes に投票データをコピー
  INSERT INTO public.archived_battle_votes (
    archived_battle_id,
    user_id,
    vote,
    comment,
    created_at
  )
  SELECT 
    v_archived_battle_id,
    bv.user_id,
    bv.vote,
    bv.comment,
    bv.created_at
  FROM public.battle_votes bv
  WHERE bv.battle_id = p_battle_id 
    AND bv.comment IS NOT NULL 
    AND bv.comment != '';

  -- 7. submissionsテーブルのステータスを更新
  UPDATE public.submissions
  SET 
    status = 'BATTLE_ENDED',
    updated_at = NOW()
  WHERE id IN (v_battle_rec.player1_submission_id, v_battle_rec.player2_submission_id);

  -- 8. レーティング更新（正しい関数名と引数を使用）
  SELECT update_battle_ratings_safe(
    p_battle_id,
    p_winner_id,
    v_player1_deleted,
    v_player2_deleted
  ) INTO v_rating_result;

  -- 9. シーズンポイント更新（存在する場合のみ）
  BEGIN
    SELECT update_season_points_after_battle(
      p_battle_id,
      p_winner_id
    ) INTO v_season_result;
  EXCEPTION
    WHEN undefined_function THEN
      v_season_result := json_build_object('skipped', true, 'reason', 'function not found');
  END;

  -- 10. バトル結果通知を送信
  -- プレイヤー1への通知
  IF NOT v_player1_deleted THEN
    IF p_winner_id = v_battle_rec.player1_user_id THEN
      -- 勝利通知
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
        v_battle_rec.player1_user_id,
        'バトル勝利！',
        FORMAT('対戦相手 %s さんとのバトルに勝利しました！', COALESCE(v_player2_username, 'Unknown')),
        'battle_win',
        p_battle_id,
        false,
        NOW(),
        NOW()
      );
    ELSIF p_winner_id = v_battle_rec.player2_user_id THEN
      -- 敗北通知
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
        v_battle_rec.player1_user_id,
        'バトル結果',
        FORMAT('対戦相手 %s さんとのバトルは惜敗でした。次回頑張りましょう！', COALESCE(v_player2_username, 'Unknown')),
        'battle_lose',
        p_battle_id,
        false,
        NOW(),
        NOW()
      );
    ELSE
      -- 引き分け通知
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
        v_battle_rec.player1_user_id,
        'バトル結果',
        FORMAT('対戦相手 %s さんとのバトルは引き分けでした。', COALESCE(v_player2_username, 'Unknown')),
        'battle_draw',
        p_battle_id,
        false,
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  -- プレイヤー2への通知
  IF NOT v_player2_deleted THEN
    IF p_winner_id = v_battle_rec.player2_user_id THEN
      -- 勝利通知
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
        v_battle_rec.player2_user_id,
        'バトル勝利！',
        FORMAT('対戦相手 %s さんとのバトルに勝利しました！', COALESCE(v_player1_username, 'Unknown')),
        'battle_win',
        p_battle_id,
        false,
        NOW(),
        NOW()
      );
    ELSIF p_winner_id = v_battle_rec.player1_user_id THEN
      -- 敗北通知
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
        v_battle_rec.player2_user_id,
        'バトル結果',
        FORMAT('対戦相手 %s さんとのバトルは惜敗でした。次回頑張りましょう！', COALESCE(v_player1_username, 'Unknown')),
        'battle_lose',
        p_battle_id,
        false,
        NOW(),
        NOW()
      );
    ELSE
      -- 引き分け通知
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
        v_battle_rec.player2_user_id,
        'バトル結果',
        FORMAT('対戦相手 %s さんとのバトルは引き分けでした。', COALESCE(v_player1_username, 'Unknown')),
        'battle_draw',
        p_battle_id,
        false,
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  -- 11. active_battlesとbattle_votesから削除（CASCADE）
  DELETE FROM public.active_battles WHERE id = p_battle_id;

  -- 12. 成功レスポンスを返す
  RETURN json_build_object(
    'success', true,
    'archived_battle_id', v_archived_battle_id,
    'winner_id', p_winner_id,
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
    END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Transaction failed',
      'error_details', SQLERRM
    );
END;
$$;


--
-- Name: FUNCTION complete_battle_with_video_archiving(p_battle_id uuid, p_winner_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.complete_battle_with_video_archiving(p_battle_id uuid, p_winner_id uuid) IS 'バトル完了処理：アーカイブ、レーティング更新、シーズンポイント更新、バトル結果通知送信を包括的に実行';


--
-- Name: create_community(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_community(p_name text, p_description text, p_password text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: create_submission_with_cooldown_check(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_submission_with_cooldown_check(p_user_id uuid, p_video_url text, p_battle_format text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION create_submission_with_cooldown_check(p_user_id uuid, p_video_url text, p_battle_format text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_submission_with_cooldown_check(p_user_id uuid, p_video_url text, p_battle_format text) IS '1時間制限チェック付き投稿作成関数（enum値修正版）：正しいenum値を使用して投稿を作成';


--
-- Name: delete_community(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_community(p_community_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: delete_user_videos_from_storage(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_user_videos_from_storage(p_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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
        '.*\/storage\/v1\/object\/public\/([^?]+)(\?.*)?$', 
        '\1'
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


--
-- Name: end_current_season(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.end_current_season() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_current_season RECORD;
  v_player_ranking_count INTEGER := 0;
  v_voter_ranking_count INTEGER := 0;
BEGIN
  -- 現在のアクティブシーズンを取得
  SELECT * INTO v_current_season
  FROM seasons 
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_active_season',
      'message', 'アクティブなシーズンが見つかりません'
    );
  END IF;

  -- 1. バトルランキングをseason_rankingsに記録
  -- ⚠️ 修正: バトル経験者（勝敗数合計1以上）のみをアーカイブ
  INSERT INTO season_rankings (
    season_id,
    user_id,
    points,
    rank
  )
  SELECT 
    v_current_season.id,
    p.id,
    p.season_points,
    ROW_NUMBER() OVER (ORDER BY p.season_points DESC, p.username ASC)
  FROM profiles p
  WHERE p.is_deleted = FALSE
  AND (
    -- バトル経験者のみ: 勝利数 + 敗北数 >= 1
    (SELECT count(*) FROM archived_battles ab WHERE ab.winner_id = p.id) +
    (SELECT count(*) FROM archived_battles ab 
     WHERE ((ab.player1_user_id = p.id) OR (ab.player2_user_id = p.id)) 
     AND (ab.winner_id IS NOT NULL) 
     AND (ab.winner_id <> p.id)) >= 1
  );
  
  GET DIAGNOSTICS v_player_ranking_count = ROW_COUNT;

  -- 2. 投票者ランキングをseason_voter_rankingsに記録
  INSERT INTO season_voter_rankings (
    season_id,
    user_id,
    votes,  -- 修正: points → votes
    rank
  )
  SELECT 
    v_current_season.id,
    id,
    season_vote_points,
    ROW_NUMBER() OVER (ORDER BY season_vote_points DESC, username ASC)
  FROM profiles
  WHERE is_deleted = FALSE
  AND season_vote_points >= 1;
  
  GET DIAGNOSTICS v_voter_ranking_count = ROW_COUNT;

  -- 3. 現在のシーズンを終了状態に変更
  UPDATE seasons 
  SET 
    status = 'ended',
    end_at = NOW(),
    updated_at = NOW()
  WHERE id = v_current_season.id;

  -- 4. 全ユーザーのシーズンポイントをリセット
  UPDATE profiles 
  SET 
    season_points = 1200,  -- デフォルト値にリセット
    season_vote_points = 0,
    updated_at = NOW()
  WHERE is_deleted = FALSE;

  RETURN json_build_object(
    'success', true,
    'ended_season', json_build_object(
      'id', v_current_season.id,
      'name', v_current_season.name,
      'player_rankings_saved', v_player_ranking_count,
      'voter_rankings_saved', v_voter_ranking_count,
      'ended_at', NOW()
    ),
    'message', 'シーズンが正常に終了しました。新しいシーズンを開始するには start_new_season() 関数を実行してください。'
  );
END;
$$;


--
-- Name: FUNCTION end_current_season(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.end_current_season() IS 'シーズン終了処理：バトル経験者のみランキング記録・ポイントリセット・次シーズン開始';


--
-- Name: find_match_and_create_battle(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_match_and_create_battle(p_submission_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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

  -- 投票期間を5日間に変更
  v_voting_end_time := NOW() + INTERVAL '5 days';

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
    FORMAT('対戦相手 %s さんとのバトルが開始されました。投票期間は5日間です。', v_opponent_username),
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
    FORMAT('対戦相手 %s さんとのバトルが開始されました。投票期間は5日間です。', v_submitter_username),
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
    'message', 'Battle created successfully with 5-day voting period',
    'notifications_sent', 2,
    'match_details', json_build_object(
      'submitter_rating', v_submitter_rating,
      'opponent_rating', v_opponent_rating,
      'rating_difference', v_rating_diff,
      'match_type', 'immediate_edge_function',
      'voting_period_days', 5
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


--
-- Name: FUNCTION find_match_and_create_battle(p_submission_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.find_match_and_create_battle(p_submission_id uuid) IS 'マッチング時に両プレイヤーにbattle_matched通知を送信する即座マッチング関数';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: seasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seasons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    status text DEFAULT 'upcoming'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT seasons_status_check CHECK ((status = ANY (ARRAY['upcoming'::text, 'active'::text, 'ended'::text])))
);


--
-- Name: TABLE seasons; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.seasons IS 'シーズン管理テーブル（3ヶ月毎の競技期間）';


--
-- Name: COLUMN seasons.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.seasons.name IS 'シーズン名（例: 2025-Q3）';


--
-- Name: COLUMN seasons.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.seasons.status IS 'シーズン状態（upcoming/active/ended）';


--
-- Name: get_active_season(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_active_season() RETURNS public.seasons
    LANGUAGE plpgsql
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


--
-- Name: get_all_seasons(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_seasons() RETURNS TABLE(id uuid, name text, start_at timestamp with time zone, end_at timestamp with time zone, status text)
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION get_all_seasons(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_all_seasons() IS 'シーズン一覧を取得（必要最小限の5列: id, name, start_at, end_at, status）';


--
-- Name: get_battle_comments(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_battle_comments(p_battle_id uuid) RETURNS TABLE(id uuid, user_id uuid, username text, avatar_url text, vote character, comment text, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: get_k_factor_by_format(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_k_factor_by_format(battle_format text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
BEGIN
  CASE battle_format
    WHEN 'MAIN_BATTLE' THEN RETURN 32;
    WHEN 'MINI_BATTLE' THEN RETURN 24;
    WHEN 'THEME_CHALLENGE' THEN RETURN 20;
    ELSE RETURN 32; -- Default to MAIN_BATTLE K-factor for unknown formats
  END CASE;
END;
$$;


--
-- Name: FUNCTION get_k_factor_by_format(battle_format text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_k_factor_by_format(battle_format text) IS 'Returns K-factor based on battle format: MAIN_BATTLE(32), MINI_BATTLE(24), THEME_CHALLENGE(20)';


--
-- Name: get_k_factor_by_format(public.battle_format); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_k_factor_by_format(battle_format public.battle_format) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: get_original_email_hint(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_original_email_hint(p_user_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION get_original_email_hint(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_original_email_hint(p_user_id uuid) IS 'サポート用：削除されたユーザーの元メールアドレスのハッシュを取得（復旧時の確認用）。';


--
-- Name: get_public_profile(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_profile(profile_id uuid) RETURNS TABLE(id uuid, username text, avatar_url text, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: get_rank_color_from_rating(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_rank_color_from_rating(rating integer) RETURNS text
    LANGUAGE plpgsql
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


--
-- Name: FUNCTION get_rank_color_from_rating(rating integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_rank_color_from_rating(rating integer) IS 'Returns rank color for UI styling based on rating';


--
-- Name: get_rank_from_rating(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_rank_from_rating(rating integer) RETURNS text
    LANGUAGE plpgsql
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


--
-- Name: FUNCTION get_rank_from_rating(rating integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_rank_from_rating(rating integer) IS 'Returns rank name based on rating: Grandmaster(1800+), Master(1600+), Expert(1400+), Advanced(1300+), Intermediate(1200+), Beginner(1100+)';


--
-- Name: get_season_rankings_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_season_rankings_by_id(p_season_id uuid) RETURNS TABLE(rank integer, points integer, user_id uuid, username text, avatar_url text)
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: get_season_voter_rankings_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_season_voter_rankings_by_id(p_season_id uuid) RETURNS TABLE(rank bigint, user_id uuid, username text, avatar_url text, votes integer, season_id uuid)
    LANGUAGE plpgsql
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


--
-- Name: get_submission_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_submission_status() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION get_submission_status(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_submission_status() IS 'シーズンオフ機能: 投稿状態の詳細情報（理由、次のシーズン開始日など）を取得する関数';


--
-- Name: get_top_rankings(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_top_rankings(p_limit integer DEFAULT 10) RETURNS TABLE(user_id uuid, username text, avatar_url text, rating integer, season_points integer, rank_name text, rank_color text, battles_won numeric, battles_lost numeric, win_rate numeric, user_position bigint)
    LANGUAGE plpgsql
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


--
-- Name: get_top_voter_rankings(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_top_voter_rankings(p_limit integer DEFAULT 10) RETURNS TABLE(user_id uuid, username text, avatar_url text, vote_count integer, rating integer, rank_name text, rank_color text, created_at timestamp with time zone, updated_at timestamp with time zone, user_position bigint)
    LANGUAGE plpgsql
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


--
-- Name: get_user_current_community(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_current_community(p_user_id uuid DEFAULT NULL::uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: get_user_email_language(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_email_language(p_user_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION get_user_email_language(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_email_language(p_user_id uuid) IS 'ユーザーのメール送信言語を取得';


--
-- Name: get_user_profile(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_profile(p_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: get_user_rank(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_rank(p_user_id uuid) RETURNS TABLE(user_id uuid, username text, avatar_url text, rating integer, season_points integer, rank_name text, rank_color text, battles_won numeric, battles_lost numeric, win_rate numeric, user_position bigint)
    LANGUAGE plpgsql
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


--
-- Name: get_user_vote(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_vote(p_battle_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: get_user_voter_rank(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_voter_rank(p_user_id uuid) RETURNS TABLE(user_id uuid, username text, avatar_url text, vote_count integer, rating integer, rank_name text, rank_color text, created_at timestamp with time zone, updated_at timestamp with time zone, user_position bigint)
    LANGUAGE plpgsql
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


--
-- Name: get_waiting_submissions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_waiting_submissions() RETURNS TABLE(id uuid, user_id uuid, battle_format public.battle_format, video_url text, created_at timestamp with time zone, waiting_since timestamp with time zone, max_allowed_rating_diff integer, attempts_count integer, updated_at timestamp with time zone, username text, avatar_url text, user_rating integer)
    LANGUAGE sql SECURITY DEFINER
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


--
-- Name: grant_season_rewards(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.grant_season_rewards(season_id_param uuid) RETURNS TABLE(user_id uuid, reward_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  generated_username TEXT;
  username_exists BOOLEAN;
  attempt_count INTEGER := 0;
  max_attempts INTEGER := 10;
BEGIN
  -- 入力検証: IDが有効なUUIDかチェック
  IF NEW.id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  -- 入力検証: emailが有効かチェック
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RAISE EXCEPTION 'User email cannot be null or empty';
  END IF;
  
  -- メールアドレスの形式チェック（基本的な検証）
  IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- ユーザー名の生成（改善版）
  generated_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NULL
  );
  
  -- メタデータからユーザー名が取得できない場合の安全な生成
  IF generated_username IS NULL OR generated_username = '' THEN
    LOOP
      -- より安全なユーザー名生成（12文字のランダム文字列）
      generated_username := 'user_' || LOWER(
        SUBSTRING(
          encode(gen_random_bytes(8), 'hex'), 
          1, 12
        )
      );
      
      -- ユーザー名の重複チェック
      SELECT EXISTS(
        SELECT 1 FROM public.profiles 
        WHERE username = generated_username
      ) INTO username_exists;
      
      -- 重複がなければループを抜ける
      EXIT WHEN NOT username_exists;
      
      -- 無限ループ防止
      attempt_count := attempt_count + 1;
      IF attempt_count >= max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique username after % attempts', max_attempts;
      END IF;
    END LOOP;
  ELSE
    -- メタデータから取得したユーザー名の検証
    IF LENGTH(generated_username) < 3 OR LENGTH(generated_username) > 30 THEN
      RAISE EXCEPTION 'Username must be between 3 and 30 characters';
    END IF;
    
    -- 不適切な文字のチェック
    IF generated_username !~ '^[a-zA-Z0-9_-]+$' THEN
      RAISE EXCEPTION 'Username contains invalid characters';
    END IF;
    
    -- 重複チェック
    SELECT EXISTS(
      SELECT 1 FROM public.profiles 
      WHERE username = generated_username
    ) INTO username_exists;
    
    IF username_exists THEN
      RAISE EXCEPTION 'Username already exists: %', generated_username;
    END IF;
  END IF;
  
  -- プロフィールの挿入（トランザクション内で安全に実行）
  BEGIN
    INSERT INTO public.profiles (id, username, email, created_at, updated_at)
    VALUES (
      NEW.id,
      generated_username,
      NEW.email,
      NOW(),
      NOW()
    );
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Profile creation failed due to duplicate data';
    WHEN foreign_key_violation THEN
      RAISE EXCEPTION 'Profile creation failed due to invalid user reference';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Profile creation failed: %', SQLERRM;
  END;
  
  -- 成功ログ
  RAISE LOG 'New user profile created successfully: % (%)', generated_username, NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- エラーログの記録
    RAISE LOG 'User profile creation failed for %: %', NEW.id, SQLERRM;
    -- エラーを再発生させて処理を中断
    RAISE;
END;
$_$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: join_community(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.join_community(p_community_id uuid, p_password text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: kick_member_from_community(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.kick_member_from_community(p_community_id uuid, p_target_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: leave_community(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.leave_community(p_community_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: log_password_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_password_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: log_security_event(text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_security_event(event_type text, event_data jsonb DEFAULT '{}'::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    event_type,
    user_id,
    event_data,
    created_at
  ) VALUES (
    event_type,
    auth.uid(),
    event_data,
    NOW()
  );
END;
$$;


--
-- Name: notify_battle_completed_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_battle_completed_trigger() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: notify_battle_created_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_battle_created_trigger() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: notify_vote_cast_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_vote_cast_trigger() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: process_expired_battles(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_expired_battles() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: progressive_matchmaking(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.progressive_matchmaking() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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
    
    -- 🎯 理想的な時間ベース許容レート差システム
    IF v_waiting_hours < 6 THEN
      v_rating_tolerance := 50;   -- 0-6時間: ±50（新鮮な対戦はほぼ同格同士）
    ELSIF v_waiting_hours < 24 THEN
      v_rating_tolerance := 100;  -- 6-24時間: ±100（少し幅を持たせてマッチ確率UP）
    ELSIF v_waiting_hours < 72 THEN
      v_rating_tolerance := 200;  -- 24-72時間: ±200（24時間以内にマッチできなかったら緩和）
    ELSIF v_waiting_hours < 168 THEN
      v_rating_tolerance := 300;  -- 72-168時間: ±300（3日-7日経過でさらに緩和）
    ELSE
      v_rating_tolerance := 999999; -- 168時間（7日）以降: 無制限（どうしても当たらない場合は全体からマッチ）
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
      v_voting_end_time := NOW() + INTERVAL '5 days';
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

      -- ✅ 新機能: 段階的マッチング成功時の通知送信
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
        FORMAT('対戦相手 %s さんとのバトルが開始されました。投票期間は5日間です。', v_opponent_username),
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
        FORMAT('対戦相手 %s さんとのバトルが開始されました。投票期間は5日間です。', v_submitter_username),
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
        'match_type', 'progressive_with_duplicate_prevention',
        'voting_period_days', 5,
        'duplicate_prevention_active', true,
        'notifications_sent', 2
      );
      
      v_results := v_results || v_match_result;
      
      RAISE NOTICE 'Progressive match with duplicate prevention: % vs % (rating diff: %, waited: % hours, tolerance: ±%) - Notifications sent', 
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
    'function_version', 'v7_with_duplicate_prevention_and_notifications',
    'execution_interval', '30_minutes',
    'initial_wait_period', '10_minutes',
    'duplicate_prevention_window', '48_hours',
    'rating_tolerance_schedule', json_build_object(
      '0_to_6_hours', 50,
      '6_to_24_hours', 100,
      '24_to_72_hours', 200,
      '72_to_168_hours', 300,
      '168_hours_plus', 'unlimited'
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in progressive_matchmaking: %', SQLERRM;
  RETURN json_build_object(
    'error', SQLERRM,
    'processed_submissions', v_processed_count,
    'matches_created', v_matched_count,
    'timestamp', NOW(),
    'function_version', 'v7_with_duplicate_prevention_and_notifications'
  );
END;
$$;


--
-- Name: FUNCTION progressive_matchmaking(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.progressive_matchmaking() IS '
理想的な時間ベース段階的マッチングシステム + 重複バトル防止機能:

■ 許容レート差システム:
- 0-6時間: ±50レート差（新鮮な対戦はほぼ同格同士）
- 6-24時間: ±100レート差（少し幅を持たせてマッチ確率UP）
- 24-72時間: ±200レート差（24時間以内にマッチできなかったら緩和）
- 72-168時間: ±300レート差（3日-7日経過でさらに緩和）
- 168時間以降: 無制限（どうしても当たらない場合は全体からマッチ）

■ 重複バトル防止機能:
- 48時間以内に同じ相手と対戦したユーザー同士は再マッチしない
- active_battlesとarchived_battlesの両方から対戦履歴をチェック
- 連続対戦による不公平を防止し、多様な対戦相手との遭遇機会を増加
';


--
-- Name: safe_delete_user_account(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.safe_delete_user_account(p_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- 新しいv4関数を呼び出し
  RETURN safe_delete_user_account_v4(p_user_id);
END;
$$;


--
-- Name: FUNCTION safe_delete_user_account(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.safe_delete_user_account(p_user_id uuid) IS '改良版：auth.usersのメールアドレスも匿名化し、メールアドレスの再利用を可能にする安全な削除関数。';


--
-- Name: safe_delete_user_account_v4(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.safe_delete_user_account_v4(p_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION safe_delete_user_account_v4(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.safe_delete_user_account_v4(p_user_id uuid) IS 'アカウント削除v4: auth.identitiesも含む完全なメールアドレス解放システム';


--
-- Name: set_user_language_from_browser(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_user_language_from_browser(p_user_id uuid, p_browser_language text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION set_user_language_from_browser(p_user_id uuid, p_browser_language text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.set_user_language_from_browser(p_user_id uuid, p_browser_language text) IS 'ブラウザ言語設定からユーザー言語を自動検出・設定';


--
-- Name: setup_custom_email_templates(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.setup_custom_email_templates() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- この関数は設定の記録用
  -- 実際のメールテンプレートはSupabaseダッシュボードで設定
  
  RETURN 'Custom email templates configuration documented. Please configure in Supabase Dashboard > Authentication > Email Templates';
END;
$$;


--
-- Name: start_new_season(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.start_new_season() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: sync_user_community(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_user_community() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: update_battle_ratings_safe(uuid, uuid, boolean, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_battle_ratings_safe(p_battle_id uuid, p_winner_id uuid, p_player1_deleted boolean DEFAULT false, p_player2_deleted boolean DEFAULT false) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: update_community_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_community_stats(p_community_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: update_community_stats_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_community_stats_trigger() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: update_member_role(uuid, uuid, public.community_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_member_role(p_community_id uuid, p_target_user_id uuid, p_new_role public.community_role) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: update_onboarding_status(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_onboarding_status(p_user_id uuid, p_has_seen_onboarding boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: update_post_comments_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_post_comments_count() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: update_season_points_after_battle(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_season_points_after_battle(p_battle_id uuid, p_winner_id uuid DEFAULT NULL::uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_battle RECORD;
  v_player1_season_points INTEGER;
  v_player2_season_points INTEGER;
  v_player1_new_points INTEGER;
  v_player2_new_points INTEGER;
  v_player1_change INTEGER;
  v_player2_change INTEGER;
  v_k_factor INTEGER;
  v_current_season_id UUID;
  v_player1_deleted BOOLEAN := FALSE;
  v_player2_deleted BOOLEAN := FALSE;
BEGIN
  -- アクティブシーズンを取得
  SELECT id INTO v_current_season_id 
  FROM seasons 
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_current_season_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_active_season',
      'message', 'アクティブなシーズンが見つかりません'
    );
  END IF;

  -- バトル情報を取得（archived_battlesから）
  SELECT 
    ab.player1_user_id,
    ab.player2_user_id,
    ab.battle_format
  INTO v_battle
  FROM archived_battles ab
  WHERE ab.original_battle_id = p_battle_id
  OR ab.id = p_battle_id;
  
  IF NOT FOUND THEN
    -- active_battlesからも探す
    SELECT 
      player1_user_id,
      player2_user_id,
      battle_format
    INTO v_battle
    FROM active_battles
    WHERE id = p_battle_id;
  END IF;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'battle_not_found',
      'message', 'バトルが見つかりません'
    );
  END IF;

  -- ✅ 削除ユーザーチェック（レーティング更新と同じロジック）
  SELECT COALESCE(is_deleted, false) INTO v_player1_deleted
  FROM profiles
  WHERE id = v_battle.player1_user_id;
  
  SELECT COALESCE(is_deleted, false) INTO v_player2_deleted
  FROM profiles
  WHERE id = v_battle.player2_user_id;

  -- バトル形式別Kファクターを取得（レーティング更新と同じ）
  SELECT get_k_factor_by_format(v_battle.battle_format) INTO v_k_factor;

  -- ✅ シーズンポイントを取得（削除されていないユーザーのみ）
  IF NOT v_player1_deleted THEN
    SELECT season_points INTO v_player1_season_points 
    FROM profiles WHERE id = v_battle.player1_user_id;
  END IF;
  
  IF NOT v_player2_deleted THEN
    SELECT season_points INTO v_player2_season_points 
    FROM profiles WHERE id = v_battle.player2_user_id;
  END IF;

  -- ✅ シーズンポイント計算（レーティング更新と完全同じロジック）
  IF NOT v_player1_deleted AND NOT v_player2_deleted THEN
    -- 両ユーザーアクティブ: 通常のElo計算
    IF p_winner_id = v_battle.player1_user_id THEN
      -- Player 1 勝利
      SELECT calculate_elo_rating_change(v_player1_season_points, v_player2_season_points, 1.0, v_k_factor) INTO v_player1_change;
      SELECT calculate_elo_rating_change(v_player2_season_points, v_player1_season_points, 0.0, v_k_factor) INTO v_player2_change;
    ELSIF p_winner_id = v_battle.player2_user_id THEN
      -- Player 2 勝利
      SELECT calculate_elo_rating_change(v_player1_season_points, v_player2_season_points, 0.0, v_k_factor) INTO v_player1_change;
      SELECT calculate_elo_rating_change(v_player2_season_points, v_player1_season_points, 1.0, v_k_factor) INTO v_player2_change;
    ELSE
      -- 引き分け
      SELECT calculate_elo_rating_change(v_player1_season_points, v_player2_season_points, 0.5, v_k_factor) INTO v_player1_change;
      SELECT calculate_elo_rating_change(v_player2_season_points, v_player1_season_points, 0.5, v_k_factor) INTO v_player2_change;
    END IF;

    -- シーズンポイント変更を適用（最低1100で制限）
    v_player1_new_points := GREATEST(v_player1_season_points + v_player1_change, 1100);
    v_player2_new_points := GREATEST(v_player2_season_points + v_player2_change, 1100);

    -- プロフィール更新
    UPDATE profiles SET season_points = v_player1_new_points WHERE id = v_battle.player1_user_id;
    UPDATE profiles SET season_points = v_player2_new_points WHERE id = v_battle.player2_user_id;

  ELSIF NOT v_player1_deleted THEN
    -- ✅ Player1のみアクティブ: 勝利時に半分Kファクターボーナス（レーティングと同じ）
    IF p_winner_id = v_battle.player1_user_id THEN
      v_player1_change := v_k_factor / 2; -- 半分Kファクターボーナス
    ELSE
      v_player1_change := 0; -- 削除ユーザーに負けてもペナルティなし
    END IF;
    
    v_player1_new_points := GREATEST(v_player1_season_points + v_player1_change, 1100);
    UPDATE profiles SET season_points = v_player1_new_points WHERE id = v_battle.player1_user_id;
    
  ELSIF NOT v_player2_deleted THEN
    -- ✅ Player2のみアクティブ: 勝利時に半分Kファクターボーナス（レーティングと同じ）
    IF p_winner_id = v_battle.player2_user_id THEN
      v_player2_change := v_k_factor / 2; -- 半分Kファクターボーナス
    ELSE
      v_player2_change := 0; -- 削除ユーザーに負けてもペナルティなし
    END IF;
    
    v_player2_new_points := GREATEST(v_player2_season_points + v_player2_change, 1100);
    UPDATE profiles SET season_points = v_player2_new_points WHERE id = v_battle.player2_user_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'season_id', v_current_season_id,
    'battle_format', v_battle.battle_format,
    'k_factor_used', v_k_factor,
    'is_tie', (p_winner_id IS NULL),
    'player1_deleted', v_player1_deleted,
    'player2_deleted', v_player2_deleted,
    'player1_points', json_build_object(
      'old_points', COALESCE(v_player1_season_points, 0),
      'change', COALESCE(v_player1_change, 0),
      'new_points', COALESCE(v_player1_new_points, v_player1_season_points, 0)
    ),
    'player2_points', json_build_object(
      'old_points', COALESCE(v_player2_season_points, 0),
      'change', COALESCE(v_player2_change, 0),
      'new_points', COALESCE(v_player2_new_points, v_player2_season_points, 0)
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to update season points',
      'error_details', SQLERRM
    );
END;
$$;


--
-- Name: FUNCTION update_season_points_after_battle(p_battle_id uuid, p_winner_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_season_points_after_battle(p_battle_id uuid, p_winner_id uuid) IS '【開発環境】シーズンポイント更新（レーティング計算完全同期版）: レーティング更新関数と全く同じロジックでシーズンポイントを計算・更新';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_user_avatar(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_avatar(p_user_id uuid, p_avatar_url text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: update_user_language(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_language(p_user_id uuid, p_language text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION update_user_language(p_user_id uuid, p_language text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_user_language(p_user_id uuid, p_language text) IS 'ユーザー言語設定を更新';


--
-- Name: update_user_profile_details(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_profile_details(p_user_id uuid, p_username text, p_bio text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: validate_battle_vote(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_battle_vote() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: vote_battle(uuid, character); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.vote_battle(p_battle_id uuid, p_vote character) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION vote_battle(p_battle_id uuid, p_vote character); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.vote_battle(p_battle_id uuid, p_vote character) IS 'v6 (Fixed Vote Count): Always increments vote_count regardless of season status. Season points only increment when season is active.';


--
-- Name: vote_battle_fixed(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.vote_battle_fixed(p_battle_id uuid, p_vote text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: vote_battle_with_comment(uuid, character, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.vote_battle_with_comment(p_battle_id uuid, p_vote character, p_comment text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION vote_battle_with_comment(p_battle_id uuid, p_vote character, p_comment text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.vote_battle_with_comment(p_battle_id uuid, p_vote character, p_comment text) IS 'v6 (Fixed Vote Count): Always increments vote_count (+3) regardless of season status. Season points (+3) only increment when season is active.';


--
-- Name: withdraw_submission(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.withdraw_submission(p_submission_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_;

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  BEGIN
    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (payload, event, topic, private, extension)
    VALUES (payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
_filename text;
BEGIN
	select string_to_array(name, '/') into _parts;
	select _parts[array_length(_parts,1)] into _filename;
	-- @todo return the last part instead of 2
	return reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[1:array_length(_parts,1)-1];
END
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::int) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
  v_order_by text;
  v_sort_order text;
begin
  case
    when sortcolumn = 'name' then
      v_order_by = 'name';
    when sortcolumn = 'updated_at' then
      v_order_by = 'updated_at';
    when sortcolumn = 'created_at' then
      v_order_by = 'created_at';
    when sortcolumn = 'last_accessed_at' then
      v_order_by = 'last_accessed_at';
    else
      v_order_by = 'name';
  end case;

  case
    when sortorder = 'asc' then
      v_sort_order = 'asc';
    when sortorder = 'desc' then
      v_sort_order = 'desc';
    else
      v_sort_order = 'asc';
  end case;

  v_order_by = v_order_by || ' ' || v_sort_order;

  return query execute
    'with folders as (
       select path_tokens[$1] as folder
       from storage.objects
         where objects.name ilike $2 || $3 || ''%''
           and bucket_id = $4
           and array_length(objects.path_tokens, 1) <> $1
       group by folder
       order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


--
-- Name: http_request(); Type: FUNCTION; Schema: supabase_functions; Owner: -
--

CREATE FUNCTION supabase_functions.http_request() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'supabase_functions'
    AS $$
    DECLARE
      request_id bigint;
      payload jsonb;
      url text := TG_ARGV[0]::text;
      method text := TG_ARGV[1]::text;
      headers jsonb DEFAULT '{}'::jsonb;
      params jsonb DEFAULT '{}'::jsonb;
      timeout_ms integer DEFAULT 1000;
    BEGIN
      IF url IS NULL OR url = 'null' THEN
        RAISE EXCEPTION 'url argument is missing';
      END IF;

      IF method IS NULL OR method = 'null' THEN
        RAISE EXCEPTION 'method argument is missing';
      END IF;

      IF TG_ARGV[2] IS NULL OR TG_ARGV[2] = 'null' THEN
        headers = '{"Content-Type": "application/json"}'::jsonb;
      ELSE
        headers = TG_ARGV[2]::jsonb;
      END IF;

      IF TG_ARGV[3] IS NULL OR TG_ARGV[3] = 'null' THEN
        params = '{}'::jsonb;
      ELSE
        params = TG_ARGV[3]::jsonb;
      END IF;

      IF TG_ARGV[4] IS NULL OR TG_ARGV[4] = 'null' THEN
        timeout_ms = 1000;
      ELSE
        timeout_ms = TG_ARGV[4]::integer;
      END IF;

      CASE
        WHEN method = 'GET' THEN
          SELECT http_get INTO request_id FROM net.http_get(
            url,
            params,
            headers,
            timeout_ms
          );
        WHEN method = 'POST' THEN
          payload = jsonb_build_object(
            'old_record', OLD,
            'record', NEW,
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA
          );

          SELECT http_post INTO request_id FROM net.http_post(
            url,
            payload,
            params,
            headers,
            timeout_ms
          );
        ELSE
          RAISE EXCEPTION 'method argument % is invalid', method;
      END CASE;

      INSERT INTO supabase_functions.hooks
        (hook_table_id, hook_name, request_id)
      VALUES
        (TG_RELID, TG_NAME, request_id);

      RETURN NEW;
    END
  $$;


--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method auth.code_challenge_method NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: active_battles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.active_battles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player1_submission_id uuid NOT NULL,
    player2_submission_id uuid NOT NULL,
    status public.battle_status DEFAULT 'ACTIVE'::public.battle_status NOT NULL,
    votes_a integer DEFAULT 0 NOT NULL,
    votes_b integer DEFAULT 0 NOT NULL,
    end_voting_at timestamp with time zone DEFAULT (now() + '5 days'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    player1_user_id uuid NOT NULL,
    player2_user_id uuid NOT NULL,
    battle_format public.battle_format NOT NULL,
    season_id uuid
);


--
-- Name: COLUMN active_battles.season_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.active_battles.season_id IS 'バトルが実施されたシーズン（分析用）';


--
-- Name: archived_battle_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archived_battle_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    archived_battle_id uuid NOT NULL,
    user_id uuid,
    vote character(1) NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT archived_battle_votes_vote_check CHECK ((vote = ANY (ARRAY['A'::bpchar, 'B'::bpchar])))
);


--
-- Name: TABLE archived_battle_votes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.archived_battle_votes IS 'Stores votes and comments from archived battles to preserve them after active battles are deleted';


--
-- Name: COLUMN archived_battle_votes.archived_battle_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archived_battle_votes.archived_battle_id IS 'Reference to the archived battle this vote belongs to';


--
-- Name: COLUMN archived_battle_votes.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archived_battle_votes.user_id IS 'User who made this vote, NULL for anonymous votes';


--
-- Name: COLUMN archived_battle_votes.vote; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archived_battle_votes.vote IS 'Vote choice: A for player1, B for player2';


--
-- Name: COLUMN archived_battle_votes.comment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archived_battle_votes.comment IS 'Optional comment left with the vote';


--
-- Name: archived_battles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archived_battles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_battle_id uuid NOT NULL,
    winner_id uuid,
    final_votes_a integer DEFAULT 0 NOT NULL,
    final_votes_b integer DEFAULT 0 NOT NULL,
    archived_at timestamp with time zone DEFAULT now() NOT NULL,
    player1_user_id uuid NOT NULL,
    player2_user_id uuid NOT NULL,
    player1_submission_id uuid NOT NULL,
    player2_submission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    battle_format public.battle_format NOT NULL,
    player1_rating_change integer DEFAULT 0,
    player2_rating_change integer DEFAULT 0,
    player1_final_rating integer,
    player2_final_rating integer,
    player1_video_url text,
    player2_video_url text,
    season_id uuid
);


--
-- Name: TABLE archived_battles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.archived_battles IS 'v4 FINAL: Schema fully aligned with production, handles dependencies, and fixes SQL syntax.';


--
-- Name: battle_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.battle_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    battle_id uuid NOT NULL,
    user_id uuid,
    vote character(1) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    comment text,
    season_id uuid,
    CONSTRAINT user_id_required CHECK ((user_id IS NOT NULL))
);


--
-- Name: COLUMN battle_votes.season_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.battle_votes.season_id IS '投票が行われたシーズン（分析用）';


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: communities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    owner_user_id uuid NOT NULL,
    password_hash text,
    member_count integer DEFAULT 1,
    average_rating integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.communities FORCE ROW LEVEL SECURITY;


--
-- Name: community_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    community_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: community_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_members (
    community_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.community_role DEFAULT 'member'::public.community_role NOT NULL,
    joined_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    username text NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    email text NOT NULL,
    bio text,
    rating integer DEFAULT 1200 NOT NULL,
    language character varying DEFAULT 'ja'::character varying,
    vote_count integer DEFAULT 0 NOT NULL,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    has_seen_onboarding boolean DEFAULT false NOT NULL,
    current_community_id uuid,
    season_points integer DEFAULT 1200 NOT NULL,
    season_vote_points integer DEFAULT 0 NOT NULL,
    phone_number character varying,
    phone_verified boolean DEFAULT false,
    CONSTRAINT profiles_language_check CHECK (((language)::text = ANY (ARRAY[('en'::character varying)::text, ('ja'::character varying)::text])))
);

ALTER TABLE ONLY public.profiles FORCE ROW LEVEL SECURITY;


--
-- Name: COLUMN profiles.season_points; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.season_points IS 'シーズンごとのバトルポイント（3ヶ月毎にリセット）';


--
-- Name: COLUMN profiles.season_vote_points; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.season_vote_points IS 'シーズンごとの投票ポイント（3ヶ月毎にリセット）';


--
-- Name: COLUMN profiles.phone_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.phone_number IS '電話番号（国際フォーマット例: +81-90-1234-5678）';


--
-- Name: COLUMN profiles.phone_verified; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.phone_verified IS '電話番号認証完了フラグ（新規ユーザーはtrue、既存ユーザーはfalse）';


--
-- Name: community_rankings_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.community_rankings_view WITH (security_invoker='true') AS
 SELECT c.id AS community_id,
    p.id AS user_id,
    p.username,
    p.avatar_url,
    p.rating,
    dense_rank() OVER (PARTITION BY c.id ORDER BY p.rating DESC, p.created_at) AS community_rank
   FROM ((public.community_members cm
     JOIN public.communities c ON ((cm.community_id = c.id)))
     JOIN public.profiles p ON ((cm.user_id = p.id)))
  WHERE (p.is_deleted = false);


--
-- Name: VIEW community_rankings_view; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.community_rankings_view IS 'SECURITY INVOKER: コミュニティ内のメンバーランキング。';


--
-- Name: email_template_specs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_template_specs (
    id integer NOT NULL,
    template_type character varying(50) NOT NULL,
    subject text NOT NULL,
    html_content text NOT NULL,
    text_content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: email_template_specs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_template_specs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_template_specs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_template_specs_id_seq OWNED BY public.email_template_specs.id;


--
-- Name: global_community_rankings_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.global_community_rankings_view WITH (security_invoker='true') AS
 SELECT communities.id,
    communities.name,
    communities.description,
    communities.owner_user_id,
    communities.member_count,
    communities.average_rating,
    communities.created_at,
    dense_rank() OVER (ORDER BY communities.average_rating DESC, communities.member_count DESC, communities.created_at) AS rank
   FROM public.communities
  ORDER BY (dense_rank() OVER (ORDER BY communities.average_rating DESC, communities.member_count DESC, communities.created_at));


--
-- Name: VIEW global_community_rankings_view; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.global_community_rankings_view IS 'SECURITY INVOKER: 全コミュニティのランキング。';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type character varying(50) NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    related_battle_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    related_season_id uuid,
    CONSTRAINT notifications_type_check CHECK (((type)::text = ANY (ARRAY[('info'::character varying)::text, ('success'::character varying)::text, ('warning'::character varying)::text, ('battle_matched'::character varying)::text, ('battle_win'::character varying)::text, ('battle_lose'::character varying)::text, ('battle_draw'::character varying)::text, ('season_start'::character varying)::text])))
);


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    likes integer DEFAULT 0 NOT NULL,
    comments_count integer DEFAULT 0 NOT NULL,
    liked_by uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL
);


--
-- Name: pre_registered_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pre_registered_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE pre_registered_users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pre_registered_users IS 'Stores email addresses of users who are allowed to register during the pre-release period.';


--
-- Name: public_active_battles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.public_active_battles WITH (security_invoker='true') AS
 SELECT ab.id,
    ab.battle_format,
    ab.status,
    ab.votes_a,
    ab.votes_b,
    ab.end_voting_at,
    ab.created_at,
    ab.updated_at,
        CASE
            WHEN (p1.is_deleted = true) THEN NULL::uuid
            ELSE ab.player1_user_id
        END AS player1_user_id,
        CASE
            WHEN (p1.is_deleted = true) THEN 'deleted-user'::text
            ELSE p1.username
        END AS player1_username,
        CASE
            WHEN (p2.is_deleted = true) THEN NULL::uuid
            ELSE ab.player2_user_id
        END AS player2_user_id,
        CASE
            WHEN (p2.is_deleted = true) THEN 'deleted-user'::text
            ELSE p2.username
        END AS player2_username,
    ab.player1_submission_id,
    ab.player2_submission_id
   FROM ((public.active_battles ab
     LEFT JOIN public.profiles p1 ON ((ab.player1_user_id = p1.id)))
     LEFT JOIN public.profiles p2 ON ((ab.player2_user_id = p2.id)));


--
-- Name: VIEW public_active_battles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.public_active_battles IS 'SECURITY INVOKER: アクティブバトルの公開ビュー。削除されたユーザーは匿名化。';


--
-- Name: public_archived_battles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.public_archived_battles WITH (security_invoker='true') AS
 SELECT ab.id,
    ab.original_battle_id,
        CASE
            WHEN p1.is_deleted THEN 'deleted-user'::text
            ELSE p1.username
        END AS player1_username,
        CASE
            WHEN p2.is_deleted THEN 'deleted-user'::text
            ELSE p2.username
        END AS player2_username,
    ab.player1_video_url,
    ab.player2_video_url,
    ab.final_votes_a,
    ab.final_votes_b,
        CASE
            WHEN w.is_deleted THEN 'deleted-user'::text
            ELSE w.username
        END AS winner_username,
    ab.archived_at,
    ab.battle_format,
    ab.player1_rating_change,
    ab.player2_rating_change,
    ab.player1_final_rating,
    ab.player2_final_rating
   FROM (((public.archived_battles ab
     LEFT JOIN public.profiles p1 ON ((p1.id = ab.player1_user_id)))
     LEFT JOIN public.profiles p2 ON ((p2.id = ab.player2_user_id)))
     LEFT JOIN public.profiles w ON ((w.id = ab.winner_id)));


--
-- Name: VIEW public_archived_battles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.public_archived_battles IS 'SECURITY INVOKER: アーカイブバトルの公開ビュー。削除されたユーザーは匿名化。';


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    subscription jsonb NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE push_subscriptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.push_subscriptions IS 'Web Push subscriptions with fixed RLS policies';


--
-- Name: COLUMN push_subscriptions.subscription; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.push_subscriptions.subscription IS 'ブラウザからの PushSubscription オブジェクト（JSON形式）';


--
-- Name: COLUMN push_subscriptions.user_agent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.push_subscriptions.user_agent IS 'デバッグ・統計用のユーザーエージェント情報';


--
-- Name: rankings_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.rankings_view AS
 SELECT p.id AS user_id,
    p.username,
    p.avatar_url,
    p.rating,
    p.season_points,
    ( SELECT count(*) AS count
           FROM public.archived_battles ab
          WHERE (ab.winner_id = p.id)) AS battles_won,
    ( SELECT count(*) AS count
           FROM public.archived_battles ab
          WHERE (((ab.player1_user_id = p.id) OR (ab.player2_user_id = p.id)) AND (ab.winner_id IS NOT NULL) AND (ab.winner_id <> p.id))) AS battles_lost,
    rank() OVER (ORDER BY p.rating DESC, p.updated_at) AS rank
   FROM public.profiles p
  WHERE ((p.is_deleted = false) AND ((( SELECT count(*) AS count
           FROM public.archived_battles ab
          WHERE (ab.winner_id = p.id)) + ( SELECT count(*) AS count
           FROM public.archived_battles ab
          WHERE (((ab.player1_user_id = p.id) OR (ab.player2_user_id = p.id)) AND (ab.winner_id IS NOT NULL) AND (ab.winner_id <> p.id)))) >= 1));


--
-- Name: VIEW rankings_view; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.rankings_view IS 'バトル経験者（勝敗数合計1以上）のみを表示するレーティングランキング';


--
-- Name: rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rewards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    type text NOT NULL,
    image_url text NOT NULL,
    season_id uuid,
    rank_requirement integer,
    min_battles integer DEFAULT 0,
    is_limited boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    CONSTRAINT check_reward_type_badge_only CHECK ((type = 'badge'::text)),
    CONSTRAINT rewards_type_check CHECK ((type = ANY (ARRAY['badge'::text, 'frame'::text])))
);


--
-- Name: TABLE rewards; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rewards IS 'Rewards table without rarity system - all rewards are equally valuable based on achievement';


--
-- Name: COLUMN rewards.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rewards.is_active IS 'Whether the reward is currently active and available for display';


--
-- Name: season_rankings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.season_rankings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rank integer NOT NULL,
    points integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE season_rankings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.season_rankings IS 'シーズン終了時のバトルランキング履歴';


--
-- Name: COLUMN season_rankings.rank; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.season_rankings.rank IS '最終順位（1位、2位...）';


--
-- Name: COLUMN season_rankings.points; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.season_rankings.points IS '最終ポイント数';


--
-- Name: season_rankings_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.season_rankings_view AS
 WITH battle_stats AS (
         SELECT p_1.id AS user_id,
            ( SELECT count(*) AS count
                   FROM public.archived_battles ab
                  WHERE (ab.winner_id = p_1.id)) AS battles_won,
            ( SELECT count(*) AS count
                   FROM public.archived_battles ab
                  WHERE (((ab.player1_user_id = p_1.id) OR (ab.player2_user_id = p_1.id)) AND (ab.winner_id IS NOT NULL) AND (ab.winner_id <> p_1.id))) AS battles_lost,
            ( SELECT count(*) AS count
                   FROM public.archived_battles ab
                  WHERE (((ab.player1_user_id = p_1.id) OR (ab.player2_user_id = p_1.id)) AND (ab.winner_id IS NOT NULL))) AS total_battles
           FROM public.profiles p_1
          WHERE ((p_1.is_deleted IS NOT TRUE) AND (p_1.season_points > 0))
        )
 SELECT p.id AS user_id,
    p.username,
    p.avatar_url,
    p.season_points,
    p.rating,
    public.get_rank_from_rating(p.rating) AS rank_name,
    public.get_rank_color_from_rating(p.rating) AS rank_color,
    bs.battles_won,
    bs.battles_lost,
        CASE
            WHEN (bs.total_battles = 0) THEN (0.0)::double precision
            ELSE ((bs.battles_won)::double precision / (bs.total_battles)::double precision)
        END AS win_rate,
    p.created_at,
    p.updated_at,
    row_number() OVER (ORDER BY p.season_points DESC, p.created_at) AS "position"
   FROM (public.profiles p
     JOIN battle_stats bs ON ((p.id = bs.user_id)))
  WHERE ((p.is_deleted IS NOT TRUE) AND (p.season_points > 0) AND ((bs.battles_won + bs.battles_lost) >= 1))
  ORDER BY p.season_points DESC, p.created_at;


--
-- Name: VIEW season_rankings_view; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.season_rankings_view IS 'バトル経験者（勝敗数合計1以上）のみを表示するシーズンランキング（正確なバトル数・勝率計算付き）';


--
-- Name: season_voter_rankings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.season_voter_rankings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rank integer NOT NULL,
    votes integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE season_voter_rankings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.season_voter_rankings IS 'シーズン終了時の投票者ランキング履歴';


--
-- Name: COLUMN season_voter_rankings.votes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.season_voter_rankings.votes IS '最終投票数';


--
-- Name: season_voter_rankings_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.season_voter_rankings_view WITH (security_invoker='true') AS
 SELECT p.id AS user_id,
    p.username,
    p.avatar_url,
    p.season_vote_points AS vote_count,
    p.rating,
    p.created_at,
    p.updated_at,
    row_number() OVER (ORDER BY p.season_vote_points DESC, p.created_at) AS "position"
   FROM public.profiles p
  WHERE (p.is_deleted IS NOT TRUE)
  ORDER BY p.season_vote_points DESC, p.created_at;


--
-- Name: VIEW season_voter_rankings_view; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.season_voter_rankings_view IS 'SECURITY INVOKER: 現在のシーズンの投票者ランキング（season_vote_points=0 ユーザーも含む）';


--
-- Name: security_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    user_id uuid,
    ip_address inet,
    user_agent text,
    event_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: site_news; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_news (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    image_url text,
    link_url text,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    content_type text DEFAULT 'article'::text,
    article_content text,
    meta_description text,
    tags text[],
    is_featured boolean DEFAULT false,
    is_published boolean DEFAULT true,
    display_order integer DEFAULT 0,
    CONSTRAINT site_news_content_type_check CHECK ((content_type = 'article'::text))
);


--
-- Name: TABLE site_news; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.site_news IS 'サイトニュース・お知らせ管理テーブル（カルーセル表示対応）';


--
-- Name: COLUMN site_news.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_news.title IS 'カルーセルに表示する見出し';


--
-- Name: COLUMN site_news.body; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_news.body IS 'お知らせの詳細内容（markdown可）';


--
-- Name: COLUMN site_news.image_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_news.image_url IS 'カルーセルの背景画像URL（任意）';


--
-- Name: COLUMN site_news.link_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_news.link_url IS 'クリック時に遷移させたい外部リンク（任意）';


--
-- Name: COLUMN site_news.content_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_news.content_type IS 'コンテンツタイプ（link: 外部リンク、article: 記事詳細）';


--
-- Name: COLUMN site_news.article_content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_news.article_content IS '記事本文（content_type=''article''の場合）';


--
-- Name: COLUMN site_news.meta_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_news.meta_description IS 'SEO用メタディスクリプション';


--
-- Name: COLUMN site_news.tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_news.tags IS 'タグ配列';


--
-- Name: COLUMN site_news.is_featured; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_news.is_featured IS '注目記事フラグ';


--
-- Name: COLUMN site_news.is_published; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_news.is_published IS '公開状態';


--
-- Name: COLUMN site_news.display_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_news.display_order IS '表示順序（数値が小さいほど優先）';


--
-- Name: submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    video_url text NOT NULL,
    status public.submission_status DEFAULT 'WAITING_OPPONENT'::public.submission_status NOT NULL,
    rank_at_submission integer,
    active_battle_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    battle_format public.battle_format
);


--
-- Name: user_communities_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_communities_view WITH (security_invoker='true') AS
 SELECT cm.user_id,
    c.id AS community_id,
    c.name,
    c.description,
    c.owner_user_id,
    c.member_count,
    c.average_rating,
    cm.role,
    cm.joined_at
   FROM (public.community_members cm
     JOIN public.communities c ON ((cm.community_id = c.id)))
  ORDER BY cm.joined_at DESC;


--
-- Name: VIEW user_communities_view; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.user_communities_view IS 'SECURITY INVOKER: ユーザーが参加しているコミュニティ一覧。';


--
-- Name: user_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_rewards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    reward_id uuid NOT NULL,
    earned_at timestamp with time zone DEFAULT now(),
    earned_season_id uuid
);


--
-- Name: TABLE user_rewards; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_rewards IS 'ユーザーの報酬所有権管理';


--
-- Name: voter_rankings_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.voter_rankings_view WITH (security_invoker='true') AS
 SELECT p.id,
    p.username,
    p.avatar_url,
    p.vote_count,
    dense_rank() OVER (ORDER BY p.vote_count DESC, p.created_at) AS rank
   FROM public.profiles p
  WHERE (p.is_deleted = false);


--
-- Name: VIEW voter_rankings_view; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.voter_rankings_view IS 'SECURITY DEFINER: 全ユーザーの投票数からランキングを計算するため、定義者権限で実行します。';


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


--
-- Name: messages_2025_05_23; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_05_23 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_05_24; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_05_24 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_05_25; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_05_25 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_05_26; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_05_26 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_05_27; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_05_27 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_06_23; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_06_23 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_06_24; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_06_24 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_06_25; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_06_25 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_06_26; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_06_26 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_06_27; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_06_27 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_06_28; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_06_28 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_06_29; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_06_29 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hooks; Type: TABLE; Schema: supabase_functions; Owner: -
--

CREATE TABLE supabase_functions.hooks (
    id bigint NOT NULL,
    hook_table_id integer NOT NULL,
    hook_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id bigint
);


--
-- Name: TABLE hooks; Type: COMMENT; Schema: supabase_functions; Owner: -
--

COMMENT ON TABLE supabase_functions.hooks IS 'Supabase Functions Hooks: Audit trail for triggered hooks.';


--
-- Name: hooks_id_seq; Type: SEQUENCE; Schema: supabase_functions; Owner: -
--

CREATE SEQUENCE supabase_functions.hooks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hooks_id_seq; Type: SEQUENCE OWNED BY; Schema: supabase_functions; Owner: -
--

ALTER SEQUENCE supabase_functions.hooks_id_seq OWNED BY supabase_functions.hooks.id;


--
-- Name: migrations; Type: TABLE; Schema: supabase_functions; Owner: -
--

CREATE TABLE supabase_functions.migrations (
    version text NOT NULL,
    inserted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text,
    created_by text,
    idempotency_key text
);


--
-- Name: seed_files; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.seed_files (
    path text NOT NULL,
    hash text NOT NULL
);


--
-- Name: messages_2025_05_23; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_05_23 FOR VALUES FROM ('2025-05-23 00:00:00') TO ('2025-05-24 00:00:00');


--
-- Name: messages_2025_05_24; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_05_24 FOR VALUES FROM ('2025-05-24 00:00:00') TO ('2025-05-25 00:00:00');


--
-- Name: messages_2025_05_25; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_05_25 FOR VALUES FROM ('2025-05-25 00:00:00') TO ('2025-05-26 00:00:00');


--
-- Name: messages_2025_05_26; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_05_26 FOR VALUES FROM ('2025-05-26 00:00:00') TO ('2025-05-27 00:00:00');


--
-- Name: messages_2025_05_27; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_05_27 FOR VALUES FROM ('2025-05-27 00:00:00') TO ('2025-05-28 00:00:00');


--
-- Name: messages_2025_06_23; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_06_23 FOR VALUES FROM ('2025-06-23 00:00:00') TO ('2025-06-24 00:00:00');


--
-- Name: messages_2025_06_24; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_06_24 FOR VALUES FROM ('2025-06-24 00:00:00') TO ('2025-06-25 00:00:00');


--
-- Name: messages_2025_06_25; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_06_25 FOR VALUES FROM ('2025-06-25 00:00:00') TO ('2025-06-26 00:00:00');


--
-- Name: messages_2025_06_26; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_06_26 FOR VALUES FROM ('2025-06-26 00:00:00') TO ('2025-06-27 00:00:00');


--
-- Name: messages_2025_06_27; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_06_27 FOR VALUES FROM ('2025-06-27 00:00:00') TO ('2025-06-28 00:00:00');


--
-- Name: messages_2025_06_28; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_06_28 FOR VALUES FROM ('2025-06-28 00:00:00') TO ('2025-06-29 00:00:00');


--
-- Name: messages_2025_06_29; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_06_29 FOR VALUES FROM ('2025-06-29 00:00:00') TO ('2025-06-30 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: email_template_specs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_template_specs ALTER COLUMN id SET DEFAULT nextval('public.email_template_specs_id_seq'::regclass);


--
-- Name: hooks id; Type: DEFAULT; Schema: supabase_functions; Owner: -
--

ALTER TABLE ONLY supabase_functions.hooks ALTER COLUMN id SET DEFAULT nextval('supabase_functions.hooks_id_seq'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: active_battles active_battles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_battles
    ADD CONSTRAINT active_battles_pkey PRIMARY KEY (id);


--
-- Name: archived_battle_votes archived_battle_votes_archived_battle_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_battle_votes
    ADD CONSTRAINT archived_battle_votes_archived_battle_id_user_id_key UNIQUE (archived_battle_id, user_id);


--
-- Name: archived_battle_votes archived_battle_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_battle_votes
    ADD CONSTRAINT archived_battle_votes_pkey PRIMARY KEY (id);


--
-- Name: archived_battles archived_battles_original_battle_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_battles
    ADD CONSTRAINT archived_battles_original_battle_id_key UNIQUE (original_battle_id);


--
-- Name: archived_battles archived_battles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_battles
    ADD CONSTRAINT archived_battles_pkey PRIMARY KEY (id);


--
-- Name: battle_votes battle_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battle_votes
    ADD CONSTRAINT battle_votes_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: communities communities_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT communities_name_key UNIQUE (name);


--
-- Name: communities communities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT communities_pkey PRIMARY KEY (id);


--
-- Name: community_chat_messages community_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_chat_messages
    ADD CONSTRAINT community_chat_messages_pkey PRIMARY KEY (id);


--
-- Name: community_members community_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_members
    ADD CONSTRAINT community_members_pkey PRIMARY KEY (community_id, user_id);


--
-- Name: email_template_specs email_template_specs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_template_specs
    ADD CONSTRAINT email_template_specs_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: pre_registered_users pre_registered_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_registered_users
    ADD CONSTRAINT pre_registered_users_email_key UNIQUE (email);


--
-- Name: pre_registered_users pre_registered_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_registered_users
    ADD CONSTRAINT pre_registered_users_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_phone_number_key UNIQUE (phone_number);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: rewards rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rewards
    ADD CONSTRAINT rewards_pkey PRIMARY KEY (id);


--
-- Name: season_rankings season_rankings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_rankings
    ADD CONSTRAINT season_rankings_pkey PRIMARY KEY (id);


--
-- Name: season_voter_rankings season_voter_rankings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_voter_rankings
    ADD CONSTRAINT season_voter_rankings_pkey PRIMARY KEY (id);


--
-- Name: seasons seasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seasons
    ADD CONSTRAINT seasons_pkey PRIMARY KEY (id);


--
-- Name: security_audit_log security_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_audit_log
    ADD CONSTRAINT security_audit_log_pkey PRIMARY KEY (id);


--
-- Name: site_news site_news_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_news
    ADD CONSTRAINT site_news_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- Name: battle_votes unique_user_battle_vote; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battle_votes
    ADD CONSTRAINT unique_user_battle_vote UNIQUE (battle_id, user_id);


--
-- Name: community_members unique_user_community; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_members
    ADD CONSTRAINT unique_user_community UNIQUE (user_id);


--
-- Name: user_rewards user_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rewards
    ADD CONSTRAINT user_rewards_pkey PRIMARY KEY (id);


--
-- Name: user_rewards user_rewards_user_id_reward_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rewards
    ADD CONSTRAINT user_rewards_user_id_reward_id_key UNIQUE (user_id, reward_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_05_23 messages_2025_05_23_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_05_23
    ADD CONSTRAINT messages_2025_05_23_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_05_24 messages_2025_05_24_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_05_24
    ADD CONSTRAINT messages_2025_05_24_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_05_25 messages_2025_05_25_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_05_25
    ADD CONSTRAINT messages_2025_05_25_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_05_26 messages_2025_05_26_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_05_26
    ADD CONSTRAINT messages_2025_05_26_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_05_27 messages_2025_05_27_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_05_27
    ADD CONSTRAINT messages_2025_05_27_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_06_23 messages_2025_06_23_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_06_23
    ADD CONSTRAINT messages_2025_06_23_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_06_24 messages_2025_06_24_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_06_24
    ADD CONSTRAINT messages_2025_06_24_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_06_25 messages_2025_06_25_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_06_25
    ADD CONSTRAINT messages_2025_06_25_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_06_26 messages_2025_06_26_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_06_26
    ADD CONSTRAINT messages_2025_06_26_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_06_27 messages_2025_06_27_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_06_27
    ADD CONSTRAINT messages_2025_06_27_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_06_28 messages_2025_06_28_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_06_28
    ADD CONSTRAINT messages_2025_06_28_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_06_29 messages_2025_06_29_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_06_29
    ADD CONSTRAINT messages_2025_06_29_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: hooks hooks_pkey; Type: CONSTRAINT; Schema: supabase_functions; Owner: -
--

ALTER TABLE ONLY supabase_functions.hooks
    ADD CONSTRAINT hooks_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: supabase_functions; Owner: -
--

ALTER TABLE ONLY supabase_functions.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (version);


--
-- Name: schema_migrations schema_migrations_idempotency_key_key; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: seed_files seed_files_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.seed_files
    ADD CONSTRAINT seed_files_pkey PRIMARY KEY (path);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: battle_votes_battle_id_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX battle_votes_battle_id_user_id_key ON public.battle_votes USING btree (battle_id, user_id);


--
-- Name: idx_active_battles_end_voting_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_active_battles_end_voting_at ON public.active_battles USING btree (end_voting_at);


--
-- Name: idx_active_battles_player1_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_active_battles_player1_user_id ON public.active_battles USING btree (player1_user_id);


--
-- Name: idx_active_battles_player2_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_active_battles_player2_user_id ON public.active_battles USING btree (player2_user_id);


--
-- Name: idx_active_battles_season_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_active_battles_season_id ON public.active_battles USING btree (season_id);


--
-- Name: idx_active_battles_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_active_battles_status ON public.active_battles USING btree (status);


--
-- Name: idx_active_battles_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_active_battles_user_created ON public.active_battles USING btree (player1_user_id, player2_user_id, created_at);


--
-- Name: idx_archived_battle_votes_archived_battle_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_archived_battle_votes_archived_battle_id ON public.archived_battle_votes USING btree (archived_battle_id);


--
-- Name: idx_archived_battle_votes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_archived_battle_votes_created_at ON public.archived_battle_votes USING btree (created_at);


--
-- Name: idx_archived_battle_votes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_archived_battle_votes_user_id ON public.archived_battle_votes USING btree (user_id);


--
-- Name: idx_archived_battles_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_archived_battles_user_created ON public.archived_battles USING btree (player1_user_id, player2_user_id, created_at);


--
-- Name: idx_battle_votes_battle_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_battle_votes_battle_id ON public.battle_votes USING btree (battle_id);


--
-- Name: idx_battle_votes_comment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_battle_votes_comment ON public.battle_votes USING btree (battle_id) WHERE (comment IS NOT NULL);


--
-- Name: idx_battle_votes_season_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_battle_votes_season_id ON public.battle_votes USING btree (season_id);


--
-- Name: idx_battle_votes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_battle_votes_user_id ON public.battle_votes USING btree (user_id);


--
-- Name: idx_community_chat_messages_community_id_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_community_chat_messages_community_id_created_at ON public.community_chat_messages USING btree (community_id, created_at DESC);


--
-- Name: idx_community_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_community_members_user_id ON public.community_members USING btree (user_id);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_profiles_has_seen_onboarding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_has_seen_onboarding ON public.profiles USING btree (has_seen_onboarding);


--
-- Name: idx_profiles_not_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_not_deleted ON public.profiles USING btree (id) WHERE (is_deleted = false);


--
-- Name: idx_profiles_phone_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_phone_number ON public.profiles USING btree (phone_number);


--
-- Name: idx_profiles_phone_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_phone_verified ON public.profiles USING btree (phone_verified);


--
-- Name: idx_profiles_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_rating ON public.profiles USING btree (rating);


--
-- Name: idx_push_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions USING btree (user_id);


--
-- Name: idx_rewards_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rewards_is_active ON public.rewards USING btree (is_active);


--
-- Name: idx_rewards_season_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rewards_season_id ON public.rewards USING btree (season_id);


--
-- Name: idx_rewards_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rewards_type ON public.rewards USING btree (type);


--
-- Name: idx_season_rankings_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_season_rankings_rank ON public.season_rankings USING btree (rank);


--
-- Name: idx_season_rankings_season_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_season_rankings_season_id ON public.season_rankings USING btree (season_id);


--
-- Name: idx_season_rankings_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_season_rankings_unique ON public.season_rankings USING btree (season_id, user_id);


--
-- Name: idx_season_rankings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_season_rankings_user_id ON public.season_rankings USING btree (user_id);


--
-- Name: idx_season_voter_rankings_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_season_voter_rankings_rank ON public.season_voter_rankings USING btree (rank);


--
-- Name: idx_season_voter_rankings_season_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_season_voter_rankings_season_id ON public.season_voter_rankings USING btree (season_id);


--
-- Name: idx_season_voter_rankings_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_season_voter_rankings_unique ON public.season_voter_rankings USING btree (season_id, user_id);


--
-- Name: idx_season_voter_rankings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_season_voter_rankings_user_id ON public.season_voter_rankings USING btree (user_id);


--
-- Name: idx_seasons_end_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seasons_end_at ON public.seasons USING btree (end_at);


--
-- Name: idx_seasons_start_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seasons_start_at ON public.seasons USING btree (start_at);


--
-- Name: idx_seasons_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seasons_status ON public.seasons USING btree (status);


--
-- Name: idx_site_news_content_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_site_news_content_type ON public.site_news USING btree (content_type, published_at DESC);


--
-- Name: idx_site_news_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_site_news_display_order ON public.site_news USING btree (display_order, published_at DESC);


--
-- Name: idx_site_news_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_site_news_featured ON public.site_news USING btree (is_featured, published_at DESC);


--
-- Name: idx_site_news_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_site_news_published ON public.site_news USING btree (is_published, published_at DESC);


--
-- Name: idx_submissions_active_battle_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_active_battle_id ON public.submissions USING btree (active_battle_id);


--
-- Name: idx_submissions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_status ON public.submissions USING btree (status);


--
-- Name: idx_submissions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_user_id ON public.submissions USING btree (user_id);


--
-- Name: idx_user_rewards_earned_season; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_rewards_earned_season ON public.user_rewards USING btree (earned_season_id);


--
-- Name: idx_user_rewards_reward_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_rewards_reward_id ON public.user_rewards USING btree (reward_id);


--
-- Name: idx_user_rewards_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_rewards_user_id ON public.user_rewards USING btree (user_id);


--
-- Name: unique_user_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_user_endpoint ON public.push_subscriptions USING btree (user_id, ((subscription ->> 'endpoint'::text)));


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: subscription_subscription_id_entity_filters_key; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: supabase_functions_hooks_h_table_id_h_name_idx; Type: INDEX; Schema: supabase_functions; Owner: -
--

CREATE INDEX supabase_functions_hooks_h_table_id_h_name_idx ON supabase_functions.hooks USING btree (hook_table_id, hook_name);


--
-- Name: supabase_functions_hooks_request_id_idx; Type: INDEX; Schema: supabase_functions; Owner: -
--

CREATE INDEX supabase_functions_hooks_request_id_idx ON supabase_functions.hooks USING btree (request_id);


--
-- Name: messages_2025_05_23_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_05_23_pkey;


--
-- Name: messages_2025_05_24_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_05_24_pkey;


--
-- Name: messages_2025_05_25_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_05_25_pkey;


--
-- Name: messages_2025_05_26_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_05_26_pkey;


--
-- Name: messages_2025_05_27_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_05_27_pkey;


--
-- Name: messages_2025_06_23_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_06_23_pkey;


--
-- Name: messages_2025_06_24_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_06_24_pkey;


--
-- Name: messages_2025_06_25_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_06_25_pkey;


--
-- Name: messages_2025_06_26_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_06_26_pkey;


--
-- Name: messages_2025_06_27_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_06_27_pkey;


--
-- Name: messages_2025_06_28_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_06_28_pkey;


--
-- Name: messages_2025_06_29_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_06_29_pkey;


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- Name: comments after_comment_insert_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER after_comment_insert_delete AFTER INSERT OR DELETE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();


--
-- Name: comments on_comments_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_comments_updated BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: posts on_posts_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_posts_updated BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: profiles profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: community_members sync_user_community_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_user_community_trigger AFTER INSERT OR DELETE ON public.community_members FOR EACH ROW EXECUTE FUNCTION public.sync_user_community();


--
-- Name: profiles trigger_auto_set_user_language; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_set_user_language BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_language();


--
-- Name: communities update_communities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_communities_updated_at BEFORE UPDATE ON public.communities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: community_chat_messages update_community_chat_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_community_chat_messages_updated_at BEFORE UPDATE ON public.community_chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: community_members update_community_stats_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_community_stats_trigger AFTER INSERT OR DELETE ON public.community_members FOR EACH ROW EXECUTE FUNCTION public.update_community_stats_trigger();


--
-- Name: notifications update_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: push_subscriptions update_push_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rewards update_rewards_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON public.rewards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: battle_votes validate_vote_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_vote_trigger BEFORE INSERT ON public.battle_votes FOR EACH ROW EXECUTE FUNCTION public.validate_battle_vote();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: active_battles active_battles_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_battles
    ADD CONSTRAINT active_battles_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE SET NULL;


--
-- Name: archived_battle_votes archived_battle_votes_archived_battle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_battle_votes
    ADD CONSTRAINT archived_battle_votes_archived_battle_id_fkey FOREIGN KEY (archived_battle_id) REFERENCES public.archived_battles(id) ON DELETE CASCADE;


--
-- Name: archived_battle_votes archived_battle_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_battle_votes
    ADD CONSTRAINT archived_battle_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: battle_votes battle_votes_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battle_votes
    ADD CONSTRAINT battle_votes_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE SET NULL;


--
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: communities communities_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT communities_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id);


--
-- Name: community_chat_messages community_chat_messages_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_chat_messages
    ADD CONSTRAINT community_chat_messages_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;


--
-- Name: community_chat_messages community_chat_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_chat_messages
    ADD CONSTRAINT community_chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: community_members community_members_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_members
    ADD CONSTRAINT community_members_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;


--
-- Name: community_members community_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_members
    ADD CONSTRAINT community_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: archived_battles fk_archived_battles_player1_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_battles
    ADD CONSTRAINT fk_archived_battles_player1_user_id FOREIGN KEY (player1_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: archived_battles fk_archived_battles_player2_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_battles
    ADD CONSTRAINT fk_archived_battles_player2_user_id FOREIGN KEY (player2_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: archived_battles fk_archived_battles_winner_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_battles
    ADD CONSTRAINT fk_archived_battles_winner_id FOREIGN KEY (winner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_related_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_related_season_id_fkey FOREIGN KEY (related_season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: posts posts_profiles_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: posts posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: rewards rewards_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rewards
    ADD CONSTRAINT rewards_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;


--
-- Name: season_rankings season_rankings_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_rankings
    ADD CONSTRAINT season_rankings_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;


--
-- Name: season_rankings season_rankings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_rankings
    ADD CONSTRAINT season_rankings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: season_voter_rankings season_voter_rankings_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_voter_rankings
    ADD CONSTRAINT season_voter_rankings_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;


--
-- Name: season_voter_rankings season_voter_rankings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_voter_rankings
    ADD CONSTRAINT season_voter_rankings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: security_audit_log security_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_audit_log
    ADD CONSTRAINT security_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: user_rewards user_rewards_earned_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rewards
    ADD CONSTRAINT user_rewards_earned_season_id_fkey FOREIGN KEY (earned_season_id) REFERENCES public.seasons(id);


--
-- Name: user_rewards user_rewards_reward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rewards
    ADD CONSTRAINT user_rewards_reward_id_fkey FOREIGN KEY (reward_id) REFERENCES public.rewards(id) ON DELETE CASCADE;


--
-- Name: user_rewards user_rewards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rewards
    ADD CONSTRAINT user_rewards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: pre_registered_users Allow full access for service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow full access for service_role" ON public.pre_registered_users TO service_role USING (true) WITH CHECK (true);


--
-- Name: comments Allow users to delete their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to delete their own comments" ON public.comments FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: posts Allow users to delete their own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to delete their own posts" ON public.posts FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: comments Allow users to insert their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to insert their own comments" ON public.comments FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: posts Allow users to insert their own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to insert their own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: comments Allow users to update their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to update their own comments" ON public.comments FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: posts Allow users to update their own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to update their own posts" ON public.posts FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Anonymous users can view basic profile info; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anonymous users can view basic profile info" ON public.profiles FOR SELECT TO anon USING (true);


--
-- Name: rewards Anyone can read active rewards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read active rewards" ON public.rewards FOR SELECT USING ((is_active = true));


--
-- Name: posts Anyone can read posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read posts" ON public.posts FOR SELECT USING (true);


--
-- Name: posts Anyone can view posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT USING (true);


--
-- Name: communities Authenticated users can create communities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create communities" ON public.communities FOR INSERT WITH CHECK ((auth.uid() = owner_user_id));


--
-- Name: posts Authenticated users can create posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create posts" ON public.posts FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: site_news Authenticated users can delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete" ON public.site_news FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: site_news Authenticated users can insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert" ON public.site_news FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: site_news Authenticated users can update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update" ON public.site_news FOR UPDATE USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: battle_votes Authenticated users can vote; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can vote" ON public.battle_votes FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: communities Communities are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Communities are viewable by everyone" ON public.communities FOR SELECT USING (true);


--
-- Name: profiles Only active profiles are viewable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only active profiles are viewable" ON public.profiles FOR SELECT USING (((is_deleted = false) OR (is_deleted IS NULL)));


--
-- Name: communities Only owner can delete community; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only owner can delete community" ON public.communities FOR DELETE USING ((auth.uid() = owner_user_id));


--
-- Name: communities Owner and admins can update community; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner and admins can update community" ON public.communities FOR UPDATE USING (((auth.uid() = owner_user_id) OR (EXISTS ( SELECT 1
   FROM public.community_members cm
  WHERE ((cm.community_id = communities.id) AND (cm.user_id = auth.uid()) AND (cm.role = ANY (ARRAY['owner'::public.community_role, 'admin'::public.community_role])))))));


--
-- Name: active_battles Public can view active battles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active battles" ON public.active_battles FOR SELECT TO authenticated, anon USING (true);


--
-- Name: archived_battle_votes Public can view archived battle votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view archived battle votes" ON public.archived_battle_votes FOR SELECT TO authenticated, anon USING (true);


--
-- Name: archived_battles Public can view archived battles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view archived battles" ON public.archived_battles FOR SELECT TO authenticated, anon USING (true);


--
-- Name: submissions Public can view submissions in battles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view submissions in battles" ON public.submissions FOR SELECT TO authenticated, anon USING ((status = ANY (ARRAY['MATCHED_IN_BATTLE'::public.submission_status, 'BATTLE_ENDED'::public.submission_status])));


--
-- Name: profiles Public profiles are viewable by authenticated users only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public profiles are viewable by authenticated users only" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: site_news Public read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access" ON public.site_news FOR SELECT USING (true);


--
-- Name: battle_votes Public view votes (non-deleted users); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public view votes (non-deleted users)" ON public.battle_votes FOR SELECT TO authenticated, anon USING (((user_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = battle_votes.user_id) AND ((p.is_deleted = false) OR (p.is_deleted IS NULL)))))));


--
-- Name: season_rankings Season rankings are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Season rankings are viewable by everyone" ON public.season_rankings FOR SELECT USING (true);


--
-- Name: POLICY "Season rankings are viewable by everyone" ON season_rankings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Season rankings are viewable by everyone" ON public.season_rankings IS '過去のシーズンランキングは、誰でも閲覧できるように公開情報とします。';


--
-- Name: season_voter_rankings Season voter rankings are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Season voter rankings are viewable by everyone" ON public.season_voter_rankings FOR SELECT USING (true);


--
-- Name: POLICY "Season voter rankings are viewable by everyone" ON season_voter_rankings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Season voter rankings are viewable by everyone" ON public.season_voter_rankings IS '過去のシーズン投票者ランキングは、誰でも閲覧できるように公開情報とします。';


--
-- Name: security_audit_log Security audit log admin access only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Security audit log admin access only" ON public.security_audit_log TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.email = ANY (ARRAY['admin@beatnexus.com'::text, 'security@beatnexus.com'::text]))))));


--
-- Name: archived_battle_votes System can delete archived battle votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can delete archived battle votes" ON public.archived_battle_votes FOR DELETE TO authenticated USING (true);


--
-- Name: archived_battle_votes System can insert archived battle votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert archived battle votes" ON public.archived_battle_votes FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: archived_battles System can insert archived battles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert archived battles" ON public.archived_battles FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: active_battles System can insert battles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert battles" ON public.active_battles FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: archived_battle_votes System can update archived battle votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update archived battle votes" ON public.archived_battle_votes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: archived_battles System can update archived battles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update archived battles" ON public.archived_battles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: active_battles System can update battles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update battles" ON public.active_battles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: notifications Users can delete their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: posts Users can delete their own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: battle_votes Users can delete their own votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own votes" ON public.battle_votes FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: notifications Users can insert their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own notifications" ON public.notifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: submissions Users can insert their own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own submissions" ON public.submissions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: posts Users can like or unlike posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can like or unlike posts" ON public.posts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: profiles Users can read own phone number; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own phone number" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_rewards Users can read own rewards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own rewards" ON public.user_rewards FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own equipped frame; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own equipped frame" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: profiles Users can update own phone number; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own phone number" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (((auth.uid() = id) AND ((is_deleted = false) OR (is_deleted IS NULL))));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: posts Users can update their own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: submissions Users can update their own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own submissions" ON public.submissions FOR UPDATE TO authenticated USING (((auth.uid() = user_id) AND (status = 'WAITING_OPPONENT'::public.submission_status))) WITH CHECK ((auth.uid() = user_id));


--
-- Name: battle_votes Users can update their own votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own votes" ON public.battle_votes FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: submissions Users can view their own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own submissions" ON public.submissions FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: active_battles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.active_battles ENABLE ROW LEVEL SECURITY;

--
-- Name: archived_battle_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.archived_battle_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: archived_battles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.archived_battles ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions authenticated_users_own_subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_own_subscriptions ON public.push_subscriptions TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: battle_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.battle_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

--
-- Name: communities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

--
-- Name: community_chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.community_chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: community_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

--
-- Name: email_template_specs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_template_specs ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_delete_own ON public.notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notifications notifications_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_insert_own ON public.notifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: notifications notifications_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_select_own ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications notifications_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

--
-- Name: pre_registered_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pre_registered_users ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: rewards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

--
-- Name: season_rankings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.season_rankings ENABLE ROW LEVEL SECURITY;

--
-- Name: season_rankings season_rankings_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY season_rankings_insert_policy ON public.season_rankings FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: season_voter_rankings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.season_voter_rankings ENABLE ROW LEVEL SECURITY;

--
-- Name: season_voter_rankings season_voter_rankings_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY season_voter_rankings_insert_policy ON public.season_voter_rankings FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: seasons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

--
-- Name: seasons seasons_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY seasons_insert_policy ON public.seasons FOR INSERT TO authenticated WITH CHECK (((auth.jwt() ->> 'email'::text) = 'admin@beatnexus.com'::text));


--
-- Name: seasons seasons_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY seasons_select_policy ON public.seasons FOR SELECT TO authenticated USING (true);


--
-- Name: seasons seasons_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY seasons_update_policy ON public.seasons FOR UPDATE TO authenticated USING (((auth.jwt() ->> 'email'::text) = 'admin@beatnexus.com'::text));


--
-- Name: security_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: site_news; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_news ENABLE ROW LEVEL SECURITY;

--
-- Name: submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_rewards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: objects Authenticated users can upload videos; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Authenticated users can upload videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'videos'::text) AND ((lower("right"(name, 4)) = ANY (ARRAY['.mp4'::text, '.mov'::text])) OR (lower("right"(name, 5)) = '.webm'::text)) AND (length(COALESCE(NULLIF((metadata ->> 'size'::text), ''::text), '0'::text)) < 104857600)));


--
-- Name: objects Public can view avatars; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Public can view avatars" ON storage.objects FOR SELECT USING ((bucket_id = 'avatars'::text));


--
-- Name: objects Users can delete their own avatars; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Users can delete their own avatars" ON storage.objects FOR DELETE USING (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));


--
-- Name: objects Users can update their own avatars; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Users can update their own avatars" ON storage.objects FOR UPDATE USING (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));


--
-- Name: objects Users can upload their own avatars; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Users can upload their own avatars" ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));


--
-- Name: objects Videos are publicly accessible; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Videos are publicly accessible" ON storage.objects FOR SELECT USING ((bucket_id = 'videos'::text));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime_messages_publication WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime notifications; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.notifications;


--
-- Name: supabase_realtime_messages_publication messages; Type: PUBLICATION TABLE; Schema: realtime; Owner: -
--

ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE ONLY realtime.messages;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

