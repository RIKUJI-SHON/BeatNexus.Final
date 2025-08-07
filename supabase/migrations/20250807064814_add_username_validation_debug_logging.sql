-- ユーザー名バリデーションのデバッグ機能を追加
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  generated_username TEXT;
  username_exists BOOLEAN;
  attempt_count INTEGER := 0;
  max_attempts INTEGER := 10;
  detected_language TEXT := 'en'; -- デフォルトは英語
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
  
  -- 言語設定の処理（メタデータから取得）
  IF NEW.raw_user_meta_data ? 'language' THEN
    detected_language := COALESCE(NEW.raw_user_meta_data->>'language', 'en');
    -- 有効な言語コードかチェック
    IF detected_language NOT IN ('ja', 'en') THEN
      detected_language := 'en';
    END IF;
  END IF;
  
  -- ユーザー名の生成（改善版）
  generated_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NULL
  );
  
  -- デバッグログ: 受信したユーザー名の詳細情報
  RAISE LOG 'Debug - Received username: "%", Length: %, ASCII values: %', 
    generated_username, 
    LENGTH(generated_username),
    array_to_string(
      ARRAY(
        SELECT ascii(substring(generated_username, i, 1))
        FROM generate_series(1, LENGTH(generated_username)) AS i
      ),
      ','
    );
  
  -- メタデータからユーザー名が取得できない場合の安全な生成
  IF generated_username IS NULL OR generated_username = '' THEN
    RAISE LOG 'Debug - No username provided in metadata, generating random username';
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
    RAISE LOG 'Debug - Validating provided username: "%"', generated_username;
    
    IF LENGTH(generated_username) < 3 OR LENGTH(generated_username) > 30 THEN
      RAISE LOG 'Debug - Username length validation failed: %', LENGTH(generated_username);
      RAISE EXCEPTION 'Username must be between 3 and 30 characters';
    END IF;
    
    -- 不適切な文字のチェック（デバッグ情報付き）
    IF generated_username !~ '^[a-zA-Z0-9_-]+$' THEN
      RAISE LOG 'Debug - Username regex validation failed for: "%" (ASCII: %)', 
        generated_username,
        array_to_string(
          ARRAY(
            SELECT ascii(substring(generated_username, i, 1))
            FROM generate_series(1, LENGTH(generated_username)) AS i
          ),
          ','
        );
      RAISE EXCEPTION 'Username contains invalid characters';
    END IF;
    
    RAISE LOG 'Debug - Username validation passed for: "%"', generated_username;
    
    -- 重複チェック
    SELECT EXISTS(
      SELECT 1 FROM public.profiles 
      WHERE username = generated_username
    ) INTO username_exists;
    
    IF username_exists THEN
      RAISE LOG 'Debug - Username already exists: "%"', generated_username;
      RAISE EXCEPTION 'Username already exists: %', generated_username;
    END IF;
  END IF;
  
  -- プロフィールの挿入（トランザクション内で安全に実行）
  -- 言語設定も含めて挿入
  BEGIN
    INSERT INTO public.profiles (id, username, email, language, created_at, updated_at)
    VALUES (
      NEW.id,
      generated_username,
      NEW.email,
      detected_language, -- 検出された言語を設定
      NOW(),
      NOW()
    );
    
    RAISE LOG 'Debug - Profile inserted successfully for username: "%"', generated_username;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE LOG 'Debug - Unique constraint violation during profile insertion';
      RAISE EXCEPTION 'Profile creation failed due to duplicate data';
    WHEN foreign_key_violation THEN
      RAISE LOG 'Debug - Foreign key constraint violation during profile insertion';
      RAISE EXCEPTION 'Profile creation failed due to invalid user reference';
    WHEN OTHERS THEN
      RAISE LOG 'Debug - Other error during profile insertion: %', SQLERRM;
      RAISE EXCEPTION 'Profile creation failed: %', SQLERRM;
  END;
  
  -- 成功ログ（言語情報も含める）
  RAISE LOG 'New user profile created successfully: % (%) with language: %', generated_username, NEW.id, detected_language;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- エラーログの記録
    RAISE LOG 'User profile creation failed for %: %', NEW.id, SQLERRM;
    -- エラーを再発生させて処理を中断
    RAISE;
END;
$function$;
