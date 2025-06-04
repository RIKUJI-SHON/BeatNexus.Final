import React from 'react';
import { RankProgress } from '../../types';
import { RankBadge } from './RankBadge';
import { useTranslation } from 'react-i18next';

interface RankProgressBarProps {
  rankProgress: RankProgress;
  currentRating: number;
}

export const RankProgressBar: React.FC<RankProgressBarProps> = ({ 
  rankProgress, 
  currentRating 
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
      {/* ヘッダー: 現在のランクと次のランク */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <RankBadge rank={rankProgress.currentRank} size="lg" />
          <div>
            <div className="text-xl font-bold text-white">
              {rankProgress.currentRank.displayName}
            </div>
            <div className="text-gray-400 text-sm">
              {currentRating} {t('profilePage.rank.points')}
            </div>
          </div>
        </div>
        
        {rankProgress.nextRank && (
          <div className="text-right">
            <div className="text-gray-400 text-sm mb-1">
              {t('profilePage.rank.nextRank')}
            </div>
            <div className="text-lg font-semibold text-white">
              {rankProgress.nextRank.displayName}
            </div>
            <div className="text-cyan-400 text-sm font-medium">
              {rankProgress.pointsNeeded} {t('profilePage.rank.pointsToNext')}
            </div>
          </div>
        )}
      </div>

      {/* プログレスバーセクション */}
      {rankProgress.nextRank ? (
        <div className="space-y-4">
          {/* プログレスバー */}
          <div className="relative">
            {/* レーティング範囲表示 */}
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span className="font-medium">{rankProgress.currentRank.minRating}</span>
              <span className="font-medium">{rankProgress.nextRank.minRating}</span>
            </div>
            
            {/* プログレスバー本体 */}
            <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full bg-gradient-to-r ${rankProgress.currentRank.color} transition-all duration-700 ease-out relative`}
                style={{ width: `${rankProgress.progress}%` }}
              >
                {/* アニメーション効果 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                
                {/* プログレス値表示 */}
                {rankProgress.progress > 20 && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <span className="text-xs font-bold text-white drop-shadow-md">
                      {Math.round(rankProgress.progress)}%
                    </span>
                  </div>
                )}
              </div>
              
              {/* プログレス値が低い場合の外部表示 */}
              {rankProgress.progress <= 20 && (
                <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                  <span className="text-xs font-bold text-gray-300">
                    {Math.round(rankProgress.progress)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 最高ランク達成時 */
        <div className="text-center py-8">
          <div className="mb-4">
            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-500 to-cyan-500">
              🏆 {t('profilePage.rank.maxRank')}
            </div>
          </div>
          <div className="text-gray-300 text-base">
            {t('profilePage.rank.legendaryPlayer')}
          </div>
          <div className="mt-4 p-4 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-500/10 rounded-lg border border-pink-500/20">
            <div className="text-sm text-gray-300">
              あなたは最高峰に到達しました！これからも素晴らしいバトルを続けてください。
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 