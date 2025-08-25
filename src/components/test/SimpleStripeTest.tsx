import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

const SimpleStripeTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string>('');

  const testCreateAccount = async () => {
    try {
      setLoading(true);
      setError('');
      setResult(null);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('ログインが必要です');
        return;
      }

      console.log('🚀 Creating Stripe Connect account...');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-connect-account`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: session.user.email,
            country: 'JP'
          })
        }
      );

      const data = await response.json();
      
      console.log('📋 Response:', { status: response.status, data });

      if (response.ok && data.success) {
        setResult(data);
      } else {
        setError(`Error ${response.status}: ${data.error || 'Unknown error'}`);
      }

    } catch (err) {
      console.error('❌ Error:', err);
      setError(`Network error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const testAccountStatus = async () => {
    try {
      setLoading(true);
      setError('');
      setResult(null);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('ログインが必要です');
        return;
      }

      console.log('🔍 Checking account status...');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-account-status`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({})
        }
      );

      const data = await response.json();
      
      console.log('📋 Response:', { status: response.status, data });

      if (response.ok && data.success) {
        setResult(data);
      } else {
        setError(`Error ${response.status}: ${data.error || 'Unknown error'}`);
      }

    } catch (err) {
      console.error('❌ Error:', err);
      setError(`Network error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-2xl font-bold text-white mb-6">🧪 Stripe Connect API テスト</h2>

      <div className="space-y-4 mb-6">
        <button
          onClick={testCreateAccount}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded transition-colors"
        >
          {loading ? '処理中...' : '1️⃣ Connect アカウント作成'}
        </button>

        <button
          onClick={testAccountStatus}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded transition-colors"
        >
          {loading ? '処理中...' : '2️⃣ アカウント状態確認'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/50 border border-red-600 rounded-lg mb-4">
          <h3 className="text-red-400 font-bold mb-2">❌ エラー</h3>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 bg-green-900/50 border border-green-600 rounded-lg">
          <h3 className="text-green-400 font-bold mb-2">✅ 成功</h3>
          <pre className="text-green-300 text-xs overflow-auto bg-gray-900 p-3 rounded">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
        <h3 className="text-blue-400 font-bold mb-2">💡 テストの流れ</h3>
        <ol className="text-blue-300 text-sm space-y-1">
          <li>1. まず「Connect アカウント作成」でStripe Express アカウントを作成</li>
          <li>2. 次に「アカウント状態確認」で作成されたアカウントの状態を確認</li>
          <li>3. 成功したら、実際のオンボーディングに進みます</li>
        </ol>
      </div>
    </div>
  );
};

export default SimpleStripeTest;
