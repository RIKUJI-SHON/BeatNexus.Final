import React from 'react';
import { HandCoins, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useTranslation } from 'react-i18next';
import { useStripeConnectStatus } from '../../hooks/useStripeConnectStatus';

/**
 * Super Tip 受け取り設定カード
 * - プレイヤー向けに Stripe Connect 設定ページへの導線を提供
 * - 現在の受け取り可能状況を表示
 * - プロフィールや投稿ページなど複数箇所で再利用可能
 */
export const SuperTipSettingsCard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { loading, error, isReceivingReady } = useStripeConnectStatus();

  // ステータスアイコンとスタイルを決定
  const getStatusIcon = () => {
    if (loading) {
      return <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />;
    }
    if (error) {
      return <AlertCircle className="h-5 w-5 text-amber-400" />;
    }
    return isReceivingReady ? 
      <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : 
      <AlertCircle className="h-5 w-5 text-amber-400" />;
  };

  const getStatusText = () => {
    if (loading) return t('superTip.settingsCard.status.checking');
    if (error) return t('superTip.settingsCard.status.error');
    return isReceivingReady ? 
      t('superTip.settingsCard.status.ready') : 
      t('superTip.settingsCard.status.needSetup');
  };

  const getStatusDescription = () => {
    if (error) return t('superTip.settingsCard.statusDescription.error');
    return isReceivingReady ? 
      t('superTip.settingsCard.statusDescription.ready') : 
      t('superTip.settingsCard.statusDescription.needSetup');
  };

  const getStatusPillClass = () => {
    if (loading) return 'bg-cyan-500/20 text-cyan-300';
    if (error) return 'bg-amber-500/20 text-amber-300';
    return isReceivingReady ? 
      'bg-emerald-500/20 text-emerald-300' : 
      'bg-amber-500/20 text-amber-300';
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <HandCoins className="h-5 w-5 text-cyan-400" />
        <h2 className="text-xl font-semibold text-slate-200">{t('superTip.settingsCard.title')}</h2>
      </div>

      <div className="bg-slate-800/40 rounded-xl border border-slate-600/30 p-4 space-y-4">
        {/* 受け取り状況表示 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-200">受け取り状況</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusPillClass()}`}>
                  {getStatusText()}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300">
                {getStatusDescription()}
              </p>
            </div>
          </div>
        </div>

        {/* 説明文とボタン */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-600/30 pt-4">
          <p className="text-slate-300 text-sm">
            {t('superTip.settingsCard.description')}
          </p>
          <Button
            onClick={() => navigate('/profile/stripe-connect')}
            variant="primary"
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 inline-flex items-center gap-2 shrink-0"
          >
            <ExternalLink className="h-4 w-4" />
            {t('superTip.settingsCard.openSettings')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SuperTipSettingsCard;
