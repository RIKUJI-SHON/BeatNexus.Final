import React from 'react';
import SimpleStripeTest from '../components/test/SimpleStripeTest';

const StripeTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          🎵 BeatNexus Stripe Connect テスト
        </h1>
        
        <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h2 className="text-lg font-semibold mb-2">📋 テスト機能</h2>
          <ul className="text-gray-300 space-y-1">
            <li>✅ Stripe Connect アカウント作成</li>
            <li>✅ オンボーディングフロー</li>
            <li>✅ アカウント状態確認（API直接取得）</li>
            <li>✅ SuperTip金額プリセット管理</li>
            <li>🚧 プロダクト作成・管理（今後）</li>
            <li>🚧 決済処理統合（今後）</li>
          </ul>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <SimpleStripeTest />
        </div>

        <div className="mt-6 p-4 bg-blue-900/20 rounded-lg border border-blue-700">
          <h3 className="text-lg font-semibold mb-2">🔧 開発者向け情報</h3>
          <div className="text-sm text-gray-300 space-y-1">
            <p><strong>プロジェクト:</strong> 開発環境 (wdttluticnlqzmqmfvgt)</p>
            <p><strong>Stripe API:</strong> 2025-07-30.basil</p>
            <p><strong>Express Connect:</strong> controller設定済み</p>
            <p><strong>手数料モデル:</strong> 10%プラットフォーム手数料</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripeTestPage;
