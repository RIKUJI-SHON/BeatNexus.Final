import React from 'react';
import { HandCoins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

/**
 * Super Tip 受け取り設定カード
 * - プレイヤー向けに Stripe Connect 設定ページへの導線を提供
 * - プロフィールや投稿ページなど複数箇所で再利用可能
 */
export const SuperTipSettingsCard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <HandCoins className="h-5 w-5 text-cyan-400" />
        <h2 className="text-xl font-semibold text-slate-200">Super Tip受け取り設定</h2>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-800/40 rounded-xl border border-slate-600/30 p-4">
        <p className="text-slate-300 text-sm">
          Super Tip（応援チップ）を受け取るための設定やダッシュボードの確認ができます。
        </p>
        <Button
          onClick={() => navigate('/profile/stripe-connect')}
          variant="primary"
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25"
        >
          設定ページを開く
        </Button>
      </div>
    </div>
  );
};

export default SuperTipSettingsCard;
