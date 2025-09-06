import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PaymentProcessing } from '../components/payments/PaymentProcessing';
import { usePaymentStatus } from '../hooks/usePaymentStatus';

const SuperTipCompletePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // URLパラメータから情報を取得
  const paymentIntentId = searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');
  const battleId = searchParams.get('battle_id');
  const flow = searchParams.get('flow');
  
  // 決済状況をポーリング
  const { status, loading: statusLoading, isSucceeded: paymentSucceeded } = usePaymentStatus(paymentIntentId || undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  // client_secretからpayment_intent_idを抽出（Stripeから戻ってきた時）
  useEffect(() => {
    const clientSecret = searchParams.get('payment_intent_client_secret');
    if (clientSecret && !paymentIntentId) {
      const piId = clientSecret.split('_secret_')[0];
      if (piId) {
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('payment_intent', piId);
        navigate(`?${newSearchParams.toString()}`, { replace: true });
      }
    }
  }, [searchParams, paymentIntentId, navigate]);

  // 決済完了後の自動リダイレクト処理
  useEffect(() => {
    if (paymentSucceeded && battleId) {
      const timer = setTimeout(() => {
        navigate(`/battle/${battleId}?superTip=succeeded`, { replace: true });
      }, 2000); // 2秒後にリダイレクト
      return () => clearTimeout(timer);
    }
  }, [paymentSucceeded, battleId, navigate]);

  const handleComplete = () => {
    if (battleId) {
      navigate(`/battle/${battleId}`);
    } else if (flow === 'standalone') {
      navigate('/dev/super-tips');
    } else {
      navigate('/');
    }
  };

  // PaymentIntentIDがある場合は新しいポーリングUIを使用
  if (paymentIntentId && status) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Super Tip
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {battleId ? 'バトル投票' : 'スタンドアロン'}での決済
            </p>
          </div>

          <PaymentProcessing
            status={status.payment_status as 'pending' | 'succeeded' | 'failed'}
            amount={100} // TODO: 実際の金額を取得
            onComplete={paymentSucceeded ? handleComplete : undefined}
          />

          {/* 決済詳細情報 */}
          {battleId && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                決済詳細
              </h3>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <p>バトルID: {battleId}</p>
                <p>PaymentIntent: {paymentIntentId}</p>
              </div>
            </div>
          )}

          {/* 進行状況インジケーター */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>決済開始</span>
              <span>Stripe処理</span>
              <span>完了</span>
            </div>
            <div className="mt-2 bg-gray-200 dark:bg-gray-600 rounded-full h-1">
              <div 
                className={`h-1 rounded-full transition-all duration-500 ${
                  status.payment_status === 'succeeded' 
                    ? 'bg-green-500 w-full' 
                    : status.payment_status === 'failed'
                    ? 'bg-red-500 w-full'
                    : 'bg-blue-500 w-2/3'
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 従来のフォールバックUI（PaymentIntentIDがない場合）
  const isSucceeded = redirectStatus === 'succeeded';
  const isFailed = redirectStatus === 'failed' || redirectStatus === 'canceled';

  // battle_id がない旧フローのみこのフォールバックUIを表示
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 ${
            isSucceeded ? 'bg-green-100 dark:bg-green-900' : isFailed ? 'bg-red-100 dark:bg-red-900' : 'bg-blue-100 dark:bg-blue-900'
          }`}>
            <span className="text-3xl">{isSucceeded ? '✅' : isFailed ? '❌' : '⏳'}</span>
          </div>

          {loading ? (
            <p className="text-gray-600 dark:text-gray-300">{t('superTip.complete.checking')}</p>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {isSucceeded ? t('superTip.complete.title.success') : isFailed ? t('superTip.complete.title.failed') : t('superTip.complete.title.processing')}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {isSucceeded
                  ? t('superTip.complete.desc.success')
                  : isFailed
                  ? t('superTip.complete.desc.failed')
                  : t('superTip.complete.desc.processing')}
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
                  {t('superTip.complete.backToDev')}
                </Link>
                <Link
                  to="/"
                  className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-3 rounded-lg font-medium transition-colors block"
                >
                  {t('superTip.complete.backToHome')}
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
            {t('superTip.complete.openDevLink')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SuperTipCompletePage;
