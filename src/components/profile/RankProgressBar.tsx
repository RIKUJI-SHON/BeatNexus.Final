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
    <div className="bg-gray-800/50 rounded-xl p-4 sm:p-6 border border-gray-700">
      {/* ヘッダー: 現在のランクと次のランク */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-6">
        {/* 現在のランク情報 */}
        <div className="flex items-center gap-3 sm:gap-4">
          <RankBadge rank={rankProgress.currentRank} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="text-lg sm:text-xl font-bold text-white truncate">
              {rankProgress.currentRank.displayName}
            </div>
            <div className="text-gray-400 text-sm">
              {currentRating} {t('profilePage.rank.points')}
            </div>
          </div>
        </div>
        
        {/* 次のランク情報 */}
        {rankProgress.nextRank && (
          <div className="text-left sm:text-right bg-gray-700/30 rounded-lg p-3 sm:bg-transparent sm:p-0">
            <div className="text-gray-400 text-xs sm:text-sm mb-1">
              {t('profilePage.rank.nextRank')}
            </div>
            <div className="text-base sm:text-lg font-semibold text-white">
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
        <div className="space-y-3 sm:space-y-4">
          {/* プログレスバー */}
          <div className="relative">
            {/* レーティング範囲表示 */}
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span className="font-medium">{rankProgress.currentRank.minRating}</span>
              <span className="font-medium">{rankProgress.nextRank.minRating}</span>
            </div>
            
            {/* プログレスバー本体 - モバイルで高さを調整 */}
            <div className="relative h-3 sm:h-4 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full bg-gradient-to-r ${rankProgress.currentRank.color} transition-all duration-700 ease-out relative`}
                style={{ width: `${rankProgress.progress}%` }}
              >
                {/* アニメーション効果 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                
                {/* プログレス値表示 - モバイルで位置調整 */}
                {rankProgress.progress > 25 && (
                  <div className="absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2">
                    <span className="text-xs font-bold text-white drop-shadow-md">
                      {Math.round(rankProgress.progress)}%
                    </span>
                  </div>
                )}
              </div>
              
              {/* プログレス値が低い場合の外部表示 */}
              {rankProgress.progress <= 25 && (
                <div className="absolute left-1 sm:left-2 top-1/2 transform -translate-y-1/2">
                  <span className="text-xs font-bold text-gray-300">
                    {Math.round(rankProgress.progress)}%
                  </span>
                </div>
              )}
            </div>
            
            {/* モバイル用の追加情報表示 */}
            <div className="flex justify-center mt-2 sm:hidden">
              <div className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
                {Math.round(rankProgress.progress)}% {t('profilePage.rank.complete')}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 最高ランク達成時 - モバイル最適化 */
        <div className="text-center py-6 sm:py-8">
          <div className="mb-3 sm:mb-4">
            <div className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-500 to-cyan-500">
              🏆 {t('profilePage.rank.maxRank')}
            </div>
          </div>
          <div className="text-gray-300 text-sm sm:text-base mb-3 sm:mb-4">
            {t('profilePage.rank.legendaryPlayer')}
          </div>
          <div className="p-3 sm:p-4 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-500/10 rounded-lg border border-pink-500/20">
            <div className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              あなたは最高峰に到達しました！これからも素晴らしいバトルを続けてください。
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 