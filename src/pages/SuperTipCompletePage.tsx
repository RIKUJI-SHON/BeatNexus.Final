import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const SuperTipCompletePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const paymentIntentId = searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const isSucceeded = redirectStatus === 'succeeded';
  const isFailed = redirectStatus === 'failed' || redirectStatus === 'canceled';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6
            ${isSucceeded ? 'bg-green-100 dark:bg-green-900' : isFailed ? 'bg-red-100 dark:bg-red-900' : 'bg-blue-100 dark:bg-blue-900'}">
            <span className="text-3xl">{isSucceeded ? '✅' : isFailed ? '❌' : '⏳'}</span>
          </div>

          {loading ? (
            <p className="text-gray-600 dark:text-gray-300">決済を確認中...</p>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {isSucceeded ? 'Super Tip の決済が完了しました！' : isFailed ? '決済に失敗しました' : '決済処理を受け付けました'}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {isSucceeded
                  ? 'ご支援ありがとうございます。処理は完了し、受取側に配分されました。'
                  : isFailed
                  ? 'ブラウザの戻るで再試行するか、別の支払い方法をご利用ください。'
                  : '必要に応じて数秒後に反映されます。ページを閉じても大丈夫です。'}
              </p>

              {paymentIntentId && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 text-left">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">PaymentIntent</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-300 font-mono break-all">{paymentIntentId}</p>
                </div>
              )}

              <div className="space-y-3">
                <Link
                  to="/dev/super-tips"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors block"
                >
                  開発ページへ戻る
                </Link>
                <Link
                  to="/"
                  className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-3 rounded-lg font-medium transition-colors block"
                >
                  ホームに戻る
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="text-center mt-6">
          <Link
            to="/dev/super-tips"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm transition-colors"
          >
            /dev/super-tips を開く
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SuperTipCompletePage;
