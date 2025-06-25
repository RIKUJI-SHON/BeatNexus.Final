import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// WebSocket接続のデバッグ用
const logWebSocketEvents = () => {
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    // WebSocket接続をモニタリング
    const originalWebSocket = window.WebSocket;
    window.WebSocket = class extends originalWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        console.log('🔌 WebSocket connection attempt:', { url, protocols });
        super(url, protocols);
        
        this.addEventListener('open', () => {
          console.log('✅ WebSocket connection opened:', url);
        });
        
        this.addEventListener('error', (event) => {
          console.error('❌ WebSocket error for:', url, event);
        });
        
        this.addEventListener('close', (event) => {
          console.warn('🔒 WebSocket connection closed:', { 
            url, 
            code: event.code, 
            reason: event.reason, 
            wasClean: event.wasClean 
          });
        });
      }
    };
  }
};

// 開発環境でWebSocketイベントをログ出力
logWebSocketEvents();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'beatnexus_auth_token',
  },
  // リアルタイム機能は廃止しました（UX改善のため）
  global: {
    headers: {
      'X-Client-Info': 'beatnexus-web',
      'X-Client-Version': '1.0.0',
    },
  },
});