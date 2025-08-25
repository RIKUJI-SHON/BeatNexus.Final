/**
 * 🎉 購入完了ページ
 * 
 * 機能:
 * - 購入完了の確認表示
 * - セッション情報の表示
 * - 次のアクションへの誘導
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

const PurchaseSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 簡単な遅延でローディング効果
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">決済を確認中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          {/* 成功アイコン */}
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-6">
            <span className="text-3xl">✅</span>
          </div>

          {/* メッセージ */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            購入が完了しました！
          </h1>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            ありがとうございます。決済が正常に処理されました。
          </p>

          {/* セッション情報 */}
          {sessionId && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                取引ID
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">
                {sessionId}
              </p>
            </div>
          )}

          {/* アクションボタン */}
          <div className="space-y-3">
            <Link
              to="/storefront"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors block"
            >
              🛍️ ストアに戻る
            </Link>
            
            <Link
              to="/profile"
              className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-3 rounded-lg font-medium transition-colors block"
            >
              📱 マイページ
            </Link>
          </div>

          {/* 追加情報 */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              📧 次のステップ
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              購入いただいた商品・サービスに関する詳細は、
              クリエイターから直接ご連絡いたします。
            </p>
          </div>
        </div>

        {/* 戻るリンク */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm transition-colors"
          >
            🏠 ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PurchaseSuccessPage;
