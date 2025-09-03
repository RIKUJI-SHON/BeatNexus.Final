import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SuperTipCompletePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const paymentIntentId = searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');
  const battleId = searchParams.get('battle_id');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  // battle_id が付与されている場合は元のバトル視聴ページへ即時リダイレクト
  useEffect(() => {
    if (battleId) {
      const status = redirectStatus || 'processing';
      // /battle/:battlePath はフレンドリーURLとUUIDの両方に対応しているため、UUIDのみでもOK
      const target = `/battle/${battleId}?superTip=${status}`;
      navigate(target, { replace: true });
    }
  }, [battleId, redirectStatus, navigate]);

  const isSucceeded = redirectStatus === 'succeeded';
  const isFailed = redirectStatus === 'failed' || redirectStatus === 'canceled';

  // battle_id がない旧フローのみこのフォールバックUIを表示
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6
            ${isSucceeded ? 'bg-green-100 dark:bg-green-900' : isFailed ? 'bg-red-100 dark:bg-red-900' : 'bg-blue-100 dark:bg-blue-900'}">
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
