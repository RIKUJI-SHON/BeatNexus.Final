import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface PasswordResetDebuggerProps {
  isVisible?: boolean;
}

interface DebugInfo {
  success: boolean;
  data?: unknown;
  error?: unknown;
  timestamp: string;
  email: string;
  redirectUrl?: string;
}

export const PasswordResetDebugger: React.FC<PasswordResetDebuggerProps> = ({ 
  isVisible = false 
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  const formatError = (error: unknown): string => {
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return (error as { message: string }).message;
    }
    return String(error);
  };

  if (!isVisible) return null;

  const sendTestResetEmail = async () => {
    if (!email.trim()) {
      alert('メールアドレスを入力してください');
      return;
    }

    setLoading(true);
    setDebugInfo(null);

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://beatnexus.app/reset-password'
      });

      setDebugInfo({
        success: !error,
        data,
        error,
        timestamp: new Date().toISOString(),
        email,
        redirectUrl: 'https://beatnexus.app/reset-password'
      });

      if (error) {
        console.error('❌ Reset email failed:', error);
      } else {
        console.log('✅ Reset email sent successfully:', data);
      }
    } catch (err) {
      setDebugInfo({
        success: false,
        error: err,
        timestamp: new Date().toISOString(),
        email
      });
      console.error('❌ Exception during reset email:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-gray-900 text-white p-4 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
      <h3 className="text-lg font-bold mb-3 text-yellow-400">🔧 Password Reset Debugger</h3>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">テスト用メールアドレス:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
            placeholder="test@example.com"
          />
        </div>

        <button
          onClick={sendTestResetEmail}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded font-medium"
        >
          {loading ? '送信中...' : '🚀 新しいリセットリンクを送信'}
        </button>

        {debugInfo && (
          <div className="mt-4 space-y-2">
            <div className="text-sm">
              <strong>結果:</strong> {debugInfo.success ? '✅ 成功' : '❌ 失敗'}
            </div>
            <div className="text-sm">
              <strong>送信時刻:</strong> {new Date(debugInfo.timestamp).toLocaleString('ja-JP')}
            </div>
            
            {debugInfo.error && (
              <div className="text-sm bg-red-900 p-2 rounded">
                <strong>エラー:</strong> <span>{formatError(debugInfo.error)}</span>
              </div>
            )}
            
            {debugInfo.success && (
              <div className="text-sm bg-green-900 p-2 rounded">
                <strong>成功:</strong> リセットメールが送信されました
                <br />
                <strong>リダイレクト先:</strong> {debugInfo.redirectUrl}
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-400 mt-3">
          <strong>使用方法:</strong>
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>メールアドレスを入力</li>
            <li>リセットリンクを送信</li>
            <li>受信したメールのリンクを即座にクリック（期限切れ前に）</li>
            <li>コンソールでデバッグ情報を確認</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
