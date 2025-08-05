import React, { useEffect, useState } from 'react';

interface SupabaseAuthDebuggerProps {
  onTokensDetected?: (tokens: { accessToken: string; refreshToken: string }) => void;
}

export const SupabaseAuthDebugger: React.FC<SupabaseAuthDebuggerProps> = ({ onTokensDetected }) => {
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const extractAllAuthInfo = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      const pathname = window.location.pathname;
      const fullUrl = window.location.href;

      // ハッシュパラメータ解析
      const hashParams = new URLSearchParams(hash.substring(1));
      const hashData = Object.fromEntries(hashParams.entries());

      // サーチパラメータ解析
      const searchParams = new URLSearchParams(search);
      const searchData = Object.fromEntries(searchParams.entries());

      // localStorage/sessionStorageの確認
      const localStorageKeys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || key.includes('auth') || key.includes('token')
      );
      const sessionStorageKeys = Object.keys(sessionStorage).filter(key => 
        key.includes('supabase') || key.includes('auth') || key.includes('token')
      );

      const info = {
        url: {
          full: fullUrl,
          pathname,
          hash,
          search,
        },
        params: {
          hash: hashData,
          search: searchData,
        },
        storage: {
          localStorage: localStorageKeys.reduce((acc, key) => {
            acc[key] = localStorage.getItem(key);
            return acc;
          }, {} as Record<string, string | null>),
          sessionStorage: sessionStorageKeys.reduce((acc, key) => {
            acc[key] = sessionStorage.getItem(key);
            return acc;
          }, {} as Record<string, string | null>),
        },
        detected: {
          hasHashTokens: !!(hashData.access_token && hashData.refresh_token),
          hasSearchTokens: !!(searchData.access_token && searchData.refresh_token),
          type: hashData.type || searchData.type,
        }
      };

      setDebugInfo(info);

      // トークンが検出された場合、親コンポーネントに通知
      if (info.detected.hasHashTokens && onTokensDetected) {
        onTokensDetected({
          accessToken: hashData.access_token,
          refreshToken: hashData.refresh_token
        });
      } else if (info.detected.hasSearchTokens && onTokensDetected) {
        onTokensDetected({
          accessToken: searchData.access_token,
          refreshToken: searchData.refresh_token
        });
      }

      console.log('🔍 SUPABASE AUTH DEBUGGER:', info);
    };

    extractAllAuthInfo();

    // URLハッシュの変更を監視
    const handleHashChange = () => {
      console.log('🔄 Hash changed, re-extracting auth info...');
      extractAllAuthInfo();
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [onTokensDetected]);

  if (process.env.NODE_ENV === 'production') {
    return null; // 本番環境では表示しない
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '400px',
      maxHeight: '500px',
      overflow: 'auto',
      zIndex: 9999,
      fontFamily: 'monospace'
    }}>
      <h3 style={{ margin: '0 0 10px 0' }}>🔍 Supabase Auth Debug</h3>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
};

export default SupabaseAuthDebugger;
