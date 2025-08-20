import React, { useState } from 'react';
import { useConsentStore } from '../../store/consentStore';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const CookieConsentBanner: React.FC = () => {
  const { open, preferences, acceptAll, rejectAll, setPreferences, closeManager } = useConsentStore();
  const { t } = useTranslation();
  const [showCustomize, setShowCustomize] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6">
      <div className="max-w-5xl mx-auto bg-gray-900 border border-gray-700 rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-4">
            <div className="flex-1 text-sm text-gray-300 leading-relaxed">
              <p className="font-semibold text-white mb-1">{t('consent.title', 'Cookieと解析に関するご確認')}</p>
              {!showCustomize && (
                <p>{t('consent.summary', '当サイトでは必須Cookieのほか、体験向上のため解析（Google Analytics）を利用できます。任意カテゴリはいつでも変更可能です。')}</p>
              )}
              {showCustomize && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked disabled className="accent-purple-500" />
                    <span className="text-gray-200 text-sm">
                      {t('consent.essential', '必須: サイト動作に必要（常に有効）')}
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences({ analytics: e.target.checked })}
                      className="accent-purple-500"
                    />
                    <span className="text-gray-200 text-sm">
                      {t('consent.analytics', '解析: 利用状況を計測し機能改善（Google Analytics/IP匿名化）')}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 opacity-60 cursor-not-allowed" title={t('consent.adsTooltip', '現時点でパーソナライズ広告は未導入です。')}>
                    <input type="checkbox" checked={false} disabled className="accent-purple-500" />
                    <span className="text-gray-200 text-sm">
                      {t('consent.ads', '広告: パーソナライズ広告（未導入）')}
                    </span>
                  </label>
                  <p className="text-xs text-gray-400 pt-1">
                    {t('consent.changeHint', 'フッターの「Cookie設定」から再度変更できます。')}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => { closeManager(); }}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label={t('common.close', '閉じる')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
            {!showCustomize && (
              <>
                <button
                  onClick={() => { rejectAll(); }}
                  className="px-4 py-2 rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 text-sm"
                >
                  {t('consent.rejectAll', 'すべて拒否')}
                </button>
                <button
                  onClick={() => setShowCustomize(true)}
                  className="px-4 py-2 rounded-md bg-gray-800 text-gray-200 hover:bg-gray-700 text-sm"
                >
                  {t('consent.customize', 'カスタマイズ')}
                </button>
                <button
                  onClick={() => { acceptAll(); }}
                  className="px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-500 font-medium text-sm"
                >
                  {t('consent.acceptAll', 'すべて許可')}
                </button>
              </>
            )}
            {showCustomize && (
              <>
                <button
                  onClick={() => { closeManager(); }}
                  className="px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-500 font-medium text-sm"
                >
                  {t('consent.save', '保存して閉じる')}
                </button>
                <button
                  onClick={() => setShowCustomize(false)}
                  className="px-4 py-2 rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 text-sm"
                >
                  {t('consent.back', '戻る')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
