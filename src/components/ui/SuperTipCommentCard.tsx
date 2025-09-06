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

  return (
    <div
      className={(() => {
        // 投票サイドによるクラス決定
        const side: 'A' | 'B' | undefined = superTip.vote || undefined;
        // 金額によるティア決定
        const amt = superTip.amount_jpy;
        const tier = amt >= 3000 ? 4 : amt >= 1000 ? 3 : amt >= 500 ? 2 : 1;
        const sideCls = side === 'A' ? 'supertip-side-A' : side === 'B' ? 'supertip-side-B' : '';
        return `supertip-card ${sideCls} supertip-tier-${tier}`.trim();
      })()}
    >
      <div className="supertip-card-info p-4">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <img
              src={superTip.sender_profile.avatar_url || getDefaultAvatarUrl()}
              alt={superTip.sender_profile.username}
              className={(() => {
                const side: 'A' | 'B' | undefined = superTip.vote || undefined;
                const border = side === 'A' ? 'border-cyan-300/70' : side === 'B' ? 'border-pink-300/70' : 'border-yellow-300/70';
                return `w-10 h-10 rounded-full border-2 ${border}`;
              })()}
            />
            {superTip.vote && (
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${voteBadgeStyle}`}>
                <span className="text-white font-bold text-xs">{voteLabel}</span>
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-white">
                {superTip.sender_profile.username}
              </span>
              <span className="text-xs text-gray-400">
                {format(new Date(superTip.created_at), 'PPp', { locale: currentLocale })}
              </span>
              <span className="supertip-badge ml-2 hidden md:inline-flex">
                <span className="supertip-badge__dot" />
                {t('superTip.preview.badge', 'Super Tip')}
              </span>
              {superTip.vote && playerName && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  superTip.vote === 'A' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-pink-500/20 text-pink-300'
                }`}>
                  {playerName}に投票
                </span>
              )}
            </div>
            
            <p className="text-gray-200 text-sm leading-relaxed">
              {superTip.comment}
            </p>
          </div>
          
          <div className="ml-auto self-center text-right text-white/95 text-base sm:text-lg md:text-2xl font-extrabold tracking-tight whitespace-nowrap">
            ¥{superTip.amount_jpy.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};
