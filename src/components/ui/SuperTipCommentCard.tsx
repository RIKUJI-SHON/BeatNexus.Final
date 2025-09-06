import React from 'react';
import { format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { getDefaultAvatarUrl } from '../../utils';
import { SuperTipReceived } from '../../hooks/useSuperTips';

interface SuperTipCommentCardProps {
  superTip: SuperTipReceived;
}

export const SuperTipCommentCard: React.FC<SuperTipCommentCardProps> = ({
  superTip
}) => {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language === 'ja' ? ja : enUS;

  // 投票サイドの判定
  let voteLabel = '';
  let voteBadgeStyle = '';
  let playerName = '';

  if (superTip.vote && superTip.battle && superTip.battle.player1_profile && superTip.battle.player2_profile) {
    if (superTip.vote === 'A') {
      voteLabel = 'A';
      voteBadgeStyle = 'bg-gradient-to-r from-cyan-500 to-cyan-400';
      playerName = superTip.battle.player1_profile.username;
    } else if (superTip.vote === 'B') {
      voteLabel = 'B';
      voteBadgeStyle = 'bg-gradient-to-r from-pink-500 to-pink-400';
      playerName = superTip.battle.player2_profile.username;
    }
  }

  // 金額ティアによるスタイル
  const getTierStyle = (amount: number) => {
    if (amount >= 3000) return 'supertip-tier-4'; // Tier 4: >=3000
    if (amount >= 1000) return 'supertip-tier-3'; // Tier 3: 1000-2999
    if (amount >= 500) return 'supertip-tier-2';  // Tier 2: 500-999
    return 'supertip-tier-1'; // Tier 1: <500
  };

  const tierStyle = getTierStyle(superTip.amount_jpy);

  return (
    <div className={`supertip-card ${tierStyle} flex items-start gap-4 p-4 bg-gray-800 rounded-xl border border-gray-700/50`}>
      <div className="relative">
        <img
          src={superTip.sender_profile.avatar_url || getDefaultAvatarUrl()}
          alt={superTip.sender_profile.username}
          className="w-10 h-10 rounded-full border-2 border-gray-600 object-cover"
        />
        {voteLabel && (
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${voteBadgeStyle}`}>
            <span className="text-white font-bold text-xs">{voteLabel}</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-semibold text-white">
            {superTip.sender_profile.username}
          </span>
          <div className="supertip-badge bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-2 py-1 rounded-full text-xs font-bold">
            💰 Super Tip
          </div>
          {voteLabel && playerName && (
            <span className={`text-xs px-2 py-1 rounded-full ${
              superTip.vote === 'A' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-pink-500/20 text-pink-300'
            }`}>
              {playerName}に投票
            </span>
          )}
          <span className="text-xs text-gray-500">
            {format(new Date(superTip.created_at), 'PPp', { locale: currentLocale })}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-gray-300 text-sm leading-relaxed flex-1 min-w-0">
            {superTip.comment}
          </p>
          <div className="ml-4 text-right whitespace-nowrap">
            <div className="text-xl font-bold text-yellow-400">
              ¥{superTip.amount_jpy.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">
              {t('superTip.connect.receivedTips.receivedAmount', { amount: Math.floor(superTip.amount_jpy * 0.85).toLocaleString() })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
