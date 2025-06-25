import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// WebSocket機能を完全に無効化（接続不安定のため手動更新ベースに移行）

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'beatnexus_auth_token',
  },
  // リアルタイム機能を完全に無効化（WebSocket接続不安定のため）
  global: {
    headers: {
      'X-Client-Info': 'beatnexus-web',
      'X-Client-Version': '1.0.0',
    },
  },
});