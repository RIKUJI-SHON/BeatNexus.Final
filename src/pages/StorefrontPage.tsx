/**
 * 🛍️ BeatNexus ストアフロント
 * 
 * 機能:
 * - 全商品の表示
 * - 購入ボタン（Stripe Checkout）
 * - 販売者情報表示
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Product {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  created_at: string;
  owner: {
    id: string;
    username: string;
  };
}

const StorefrontPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);

  // 📦 全商品を取得
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          owner:profiles!owner_user_id(id, username)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('商品取得エラー:', error);
      alert('商品の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 💰 購入処理
  const handlePurchase = async (productId: string) => {
    try {
      setPurchaseLoading(productId);
      
      // 認証確認
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('購入するにはログインが必要です');
        return;
      }

      // Checkout Session作成
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: productId,
          quantity: 1,
          success_url: `${window.location.origin}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/storefront`
        })
      });

      const data = await response.json();

      if (data.success && data.checkout_url) {
        // Stripe Checkoutページにリダイレクト
        window.location.href = data.checkout_url;
      } else {
        console.error('Checkout エラー:', data);
        alert(data.error || '購入処理に失敗しました');
      }
    } catch (error) {
      console.error('購入エラー:', error);
      alert('購入処理に失敗しました');
    } finally {
      setPurchaseLoading(null);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600 dark:text-gray-300">商品を読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                🛍️ BeatNexus ストア
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                クリエイターが提供する様々な商品・サービスを購入できます
              </p>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {products.length} 商品
            </div>
          </div>
        </div>
      </div>

      {/* 商品一覧 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">🛒</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              商品がまだありません
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              クリエイターが商品を投稿するまでお待ちください
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                {/* 商品カード */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                          {product.owner.username?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {product.owner.username || 'Unknown'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(product.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {product.name}
                  </h3>
                  
                  {product.description && (
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">
                      {product.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      ¥{(product.price_cents / 100).toLocaleString()}
                    </div>
                    <button
                      onClick={() => handlePurchase(product.id)}
                      disabled={purchaseLoading === product.id}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                    >
                      {purchaseLoading === product.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>処理中...</span>
                        </>
                      ) : (
                        <>
                          <span>🛒</span>
                          <span>購入</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* フィーチャード情報 */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                安全な決済
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Stripeによる安全で確実な決済システム
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🎵</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                クリエイター支援
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                購入でクリエイターを直接支援
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                即座にアクセス
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                購入後すぐにサービスを利用可能
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorefrontPage;
