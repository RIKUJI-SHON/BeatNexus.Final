/**
 * 🔐 環境変数セキュリティ管理
 * クライアントサイドで安全に環境変数を扱うためのユーティリティ
 */

// 公開しても安全な環境変数のみを定義
interface PublicConfig {
  supabaseUrl: string;
  supabaseAnonKey: string; // 注意: これは匿名キーのため公開OK
  isDevelopment: boolean;
  appVersion: string;
}

// 秘密情報を含む環境変数（サーバーサイドのみ）
// この情報はクライアントサイドには絶対に露出してはいけない
// interface PrivateConfig {
//   supabaseServiceRoleKey: string;
//   twilioAuthToken: string;
//   openaiApiKey: string;
// }

/**
 * 公開環境変数の取得（クライアントサイド用）
 * VITE_接頭辞の変数のみ使用する
 */
export const getPublicConfig = (): PublicConfig => {
  // 必須の環境変数をチェック
  const requiredVars = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  // 環境変数の存在チェック
  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value) {
      throw new Error(`❌ 必須環境変数が設定されていません: VITE_${key.toUpperCase()}`);
    }
  }

  return {
    supabaseUrl: requiredVars.supabaseUrl,
    supabaseAnonKey: requiredVars.supabaseAnonKey,
    isDevelopment: import.meta.env.DEV,
    appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  };
};

/**
 * 環境変数の検証
 * 開発時にのみ実行される
 */
export const validateEnvironmentVariables = (): void => {
  if (import.meta.env.DEV) {
    try {
      const config = getPublicConfig();
      
      // SupabaseURLの形式チェック
      if (!config.supabaseUrl.startsWith('https://') || !config.supabaseUrl.includes('.supabase.co')) {
        console.warn('⚠️ Supabase URLの形式が正しくない可能性があります');
      }

      // 匿名キーの形式チェック（JWT形式かどうか）
      if (!config.supabaseAnonKey.includes('.')) {
        console.warn('⚠️ Supabase匿名キーの形式が正しくない可能性があります');
      }

      console.log('✅ 環境変数の検証完了');
    } catch (error) {
      console.error('❌ 環境変数の検証エラー:', error);
    }
  }
};

/**
 * 環境変数漏洩検出
 * 本番環境で秘密情報が露出していないかチェック
 */
export const detectEnvironmentLeaks = (): void => {
  if (import.meta.env.PROD) {
    // 本番環境で危険な環境変数が露出していないかチェック
    const dangerousVars = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'TWILIO_AUTH_TOKEN',
      'OPENAI_API_KEY',
      'DATABASE_PASSWORD',
      'JWT_SECRET'
    ];

    dangerousVars.forEach(varName => {
      // 動的プロパティアクセスで環境変数をチェック
      const envValue = (import.meta.env as Record<string, unknown>)[varName];
      if (envValue) {
        console.error(`🚨 SECURITY ALERT: 秘密環境変数がクライアントに露出: ${varName}`);
        // 本番環境では実際にアラートを発行
        if (typeof window !== 'undefined') {
          // エラー追跡サービスに送信（例: Sentry）
          console.error('SECURITY_LEAK', { variable: varName });
        }
      }
    });
  }
};

/**
 * セキュアな設定取得
 * 他のコンポーネントで使用する標準的な方法
 */
export const config = getPublicConfig();
