/**
 * 🎯 Stripe Connect 完全統合ダッシュボード
 * 
 * 機能:
 * - アカウント作成・オンボーディング
 * - アカウント状態表示（API直接取得）
 * - 商品作成・管理
 * - 売上履歴表示
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

// 簡単な通知関数
const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
  console.log(`${type.toUpperCase()}: ${message}`);
  if (type === 'error') {
    alert(`エラー: ${message}`);
  } else {
    // 成功メッセージは控えめに
    console.log(`成功: ${message}`);
  }
};

interface StripeAccount {
  account_id: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements: Record<string, unknown>;
  onboarding_complete: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  stripe_product_id: string;
  is_active: boolean;
  created_at: string;
}

const StripeConnectDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [accountStatus, setAccountStatus] = useState<StripeAccount | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [showCreateProduct, setShowCreateProduct] = useState(false);

  // 🔍 アカウント状態を確認
  const checkAccountStatus = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        showNotification('認証が必要です', 'error');
        return;
      }

      // プロファイルからStripeアカウント情報を取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_account_id, stripe_charges_enabled')
        .eq('id', session.user.id)
        .single();

      if (profile?.stripe_account_id) {
        setHasAccount(true);
        
        // Stripe APIから最新状態を取得
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-account-status`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setAccountStatus(data);
          }
        }

        // ユーザーの商品一覧を取得
        await fetchProducts();
      }
    } catch (error) {
      console.error('アカウント状態確認エラー:', error);
      showNotification('アカウント状態の確認に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // 📦 商品一覧を取得
  const fetchProducts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('owner_user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('商品取得エラー:', error);
    }
  };

  // 🔗 Stripe オンボーディング開始（アカウント作成+設定を同時実行）
  const createConnectAccount = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        showNotification('認証が必要です', 'error');
        return;
      }

      // Step 1: 最小限のアカウント作成（必要な場合のみ）
      const userEmail = session.user?.email;
      if (!userEmail) {
        showNotification('メールアドレスが取得できません', 'error');
        return;
      }

      try {
        // 簡易アカウント作成を試行（既に存在する場合はスキップ）
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-connect-account`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: userEmail,
            country: 'JP'
          })
        });
      } catch (error) {
        // アカウント作成失敗でも続行（既に存在する可能性）
        console.log('アカウント作成をスキップ（既に存在する可能性）:', error);
      }

      // Step 2: stripe-onboarding関数でオンボーディングリンクを作成してリダイレクト
      const { data, error } = await supabase.functions.invoke('stripe-onboarding', {
        body: {
          refresh_url: window.location.href,
          return_url: `${window.location.origin}/payment-setup?success=true`
        }
      });

      if (data?.success) {
        // Stripeオンボーディングページにリダイレクト
        showNotification('Stripeアカウント設定ページにリダイレクトします...', 'info');
        window.location.href = data.onboarding_url;
      } else {
        throw new Error(data?.error || error?.message || 'オンボーディングリンクの作成に失敗しました');
      }
    } catch (error) {
      console.error('アカウント設定エラー:', error);
      showNotification(error instanceof Error ? error.message : 'アカウント設定でエラーが発生しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 🚀 オンボーディング開始
  const startOnboarding = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        showNotification('認証が必要です', 'error');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-onboarding`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh_url: `${window.location.origin}/settings?onboarding=refresh`,
          return_url: `${window.location.origin}/settings?onboarding=complete`
        })
      });

      const data = await response.json();

      if (data.success) {
        // 新しいタブでオンボーディングを開く
        window.open(data.onboarding_url, '_blank');
        showNotification('オンボーディングページを開きました', 'success');
      } else {
        showNotification(data.error || 'オンボーディングの開始に失敗しました', 'error');
      }
    } catch (error) {
      console.error('オンボーディングエラー:', error);
      showNotification('オンボーディングの開始に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAccountStatus();
  }, [checkAccountStatus]);

  // オンボーディング完了通知の処理
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('onboarding') === 'complete') {
      showNotification('オンボーディングが完了しました！', 'success');
      checkAccountStatus();
      // URLパラメータをクリア
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [checkAccountStatus]);

  if (loading && !hasAccount) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          💰 SuperTip収益化設定
        </h3>

        {!hasAccount ? (
          // アカウント未作成の場合
          <div className="text-center">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">🏦</span>
              </div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                収益を受け取る準備をしましょう
              </h4>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Stripe Connectアカウントを作成して、SuperTipやコンテンツ販売での収益を受け取れるようになります。
              </p>
            </div>
            <button
              onClick={createConnectAccount}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? '作成中...' : 'Stripe連結アカウントを作成'}
            </button>
          </div>
        ) : (
          // アカウント作成済みの場合
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* アカウント状態表示 */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  📋 アカウント状態
                </h4>
                {accountStatus ? (
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        accountStatus.details_submitted ? 'bg-green-400' : 'bg-yellow-400'
                      }`}></span>
                      <span className="text-sm">詳細情報: {accountStatus.details_submitted ? '完了' : '未完了'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        accountStatus.charges_enabled ? 'bg-green-400' : 'bg-red-400'
                      }`}></span>
                      <span className="text-sm">決済受付: {accountStatus.charges_enabled ? '有効' : '無効'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        accountStatus.payouts_enabled ? 'bg-green-400' : 'bg-red-400'
                      }`}></span>
                      <span className="text-sm">振込: {accountStatus.payouts_enabled ? '有効' : '無効'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">状態を確認中...</p>
                )}
              </div>

              {/* アクションボタン */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  ⚙️ 設定
                </h4>
                <div className="space-y-2">
                  {!accountStatus?.onboarding_complete && (
                    <button
                      onClick={startOnboarding}
                      disabled={loading}
                      className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                    >
                      オンボーディング開始
                    </button>
                  )}
                  <button
                    onClick={checkAccountStatus}
                    disabled={loading}
                    className="w-full bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                  >
                    状態を更新
                  </button>
                </div>
              </div>

              {/* 商品管理 */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  🛍️ 商品管理
                </h4>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    商品数: {products.length}
                  </p>
                  {accountStatus?.charges_enabled && (
                    <button
                      onClick={() => setShowCreateProduct(true)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                    >
                      新しい商品を作成
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 商品一覧 */}
            {products.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">📦 あなたの商品</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <div key={product.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 dark:text-white">{product.name}</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{product.description}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-bold text-lg">
                          ¥{(product.price_cents / 100).toLocaleString()}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          product.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {product.is_active ? '販売中' : '停止中'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 商品作成モーダル */}
      {showCreateProduct && (
        <ProductCreateModal 
          onClose={() => setShowCreateProduct(false)}
          onSuccess={() => {
            setShowCreateProduct(false);
            fetchProducts();
          }}
        />
      )}
    </div>
  );
};

// 商品作成モーダルコンポーネント
const ProductCreateModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'jpy'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      showNotification('商品名と価格は必須です', 'error');
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        showNotification('認証が必要です', 'error');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-product`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price_cents: Math.round(parseFloat(formData.price) * 100),
          currency: formData.currency
        })
      });

      const data = await response.json();

      if (data.success) {
        showNotification('商品が作成されました！', 'success');
        onSuccess();
      } else {
        showNotification(data.error || '商品作成に失敗しました', 'error');
      }
    } catch (error) {
      console.error('商品作成エラー:', error);
      showNotification('商品作成に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          新しい商品を作成
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              商品名 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="例：プライベートレッスン"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              説明
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
              placeholder="商品の詳細説明..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              価格 (円) *
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="5000"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 font-medium transition-colors"
            >
              {loading ? '作成中...' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StripeConnectDashboard;
