import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getDefaultAvatarUrl } from '../../utils';

interface TopThreePodiumProps {
  topThree: Array<{
    username: string;
    avatar_url?: string;
    [key: string]: any;
  }>;
  activeTab: 'player' | 'voter';
  getRatingOrSeasonPoints: (entry: any) => number;
  getVoteCount: (entry: any) => number;
  getRatingColor: (rating: number) => string;
  getVoteCountColor: (voteCount: number) => string;
  getPosition: (entry: any) => number;
  getUserId: (entry: any) => string;
}

export const TopThreePodium: React.FC<TopThreePodiumProps> = ({
  topThree,
  activeTab,
  getRatingOrSeasonPoints,
  getVoteCount,
  getRatingColor,
  getVoteCountColor,
  getPosition,
  getUserId,
}) => {
  const { t } = useTranslation();

  if (topThree.length === 0) return null;

  // 表彰台の配置順（同率順位対応）
  const podiumOrder = [];
  
  // 全てのエントリを順位でグループ化
  const positionGroups: { [position: number]: any[] } = {};
  topThree.forEach(entry => {
    const position = getPosition(entry);
    if (!positionGroups[position]) {
      positionGroups[position] = [];
    }
    positionGroups[position].push(entry);
  });
  
  // 順位順でソートして上位3人を選択（同率の場合は複数表示）
  const sortedPositions = Object.keys(positionGroups)
    .map(Number)
    .sort((a, b) => a - b);
  
  let displayCount = 0;
  for (const position of sortedPositions) {
    const entriesAtPosition = positionGroups[position];
    for (const entry of entriesAtPosition) {
      if (displayCount < 5 && position <= 3) { // 最大5人まで、3位以内のみ
        // 表彰台の表示順：2位、1位、3位の順で配置
        if (position === 2 && displayCount === 0) {
          podiumOrder.unshift(entry); // 2位を最初に配置
        } else if (position === 1) {
          // 1位を中央に配置（2位がある場合は2番目、ない場合は最初）
          const insertIndex = podiumOrder.length > 0 ? 1 : 0;
          podiumOrder.splice(insertIndex, 0, entry);
        } else {
          podiumOrder.push(entry); // 3位以下は末尾に追加
        }
        displayCount++;
      }
    }
  }
  
  // 表示順が崩れている場合の修正（同率1位が複数いる場合など）
  if (podiumOrder.length > 0) {
    // 実際の順位に基づいて最終的な表示位置を調整
    const finalOrder = [];
    
    // 2位を探して最初に配置
    const secondPlaceEntries = podiumOrder.filter(entry => getPosition(entry) === 2);
    finalOrder.push(...secondPlaceEntries);
    
    // 1位を中央に配置
    const firstPlaceEntries = podiumOrder.filter(entry => getPosition(entry) === 1);
    finalOrder.push(...firstPlaceEntries);
    
    // 3位以下を最後に配置
    const remainingEntries = podiumOrder.filter(entry => getPosition(entry) !== 1 && getPosition(entry) !== 2);
    finalOrder.push(...remainingEntries);
    
    // 同率順位対応：最大5人まで表示
    podiumOrder.length = 0;
    podiumOrder.push(...finalOrder.slice(0, 5));
  }

  const getPositionConfig = (position: number) => {
    switch (position) {
      case 1:
        return {
          icon: Trophy,
          rankImage: '/images/1st-place.png',
          bgGradient: 'from-yellow-400/30 via-amber-500/20 to-yellow-600/30',
          borderColor: 'border-yellow-400/60',
          shadowColor: 'shadow-yellow-500/30',
          glowClass: 'drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]',
          height: 'h-40 sm:h-44 md:h-48',
          iconSize: 'h-8 w-8',
          iconColor: 'text-yellow-400',
          textGlow: 'drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]',
          transform: 'hover:scale-105',
          pulse: '',
        };
      case 2:
        return {
          icon: Medal,
          rankImage: '/images/2nd-place.png',
          bgGradient: 'from-gray-300/30 via-gray-400/20 to-gray-500/30',
          borderColor: 'border-gray-400/60',
          shadowColor: 'shadow-gray-400/30',
          glowClass: 'drop-shadow-[0_0_12px_rgba(156,163,175,0.5)]',
          height: 'h-36 sm:h-40 md:h-44',
          iconSize: 'h-6 w-6',
          iconColor: 'text-gray-300',
          textGlow: 'drop-shadow-[0_0_6px_rgba(156,163,175,0.7)]',
          transform: 'hover:scale-103',
          pulse: '',
        };
      case 3:
        return {
          icon: Award,
          rankImage: '/images/3rd-place.png',
          bgGradient: 'from-amber-600/30 via-orange-500/20 to-amber-700/30',
          borderColor: 'border-amber-600/60',
          shadowColor: 'shadow-amber-600/30',
          glowClass: 'drop-shadow-[0_0_10px_rgba(217,119,6,0.5)]',
          height: 'h-32 sm:h-36 md:h-40',
          iconSize: 'h-5 w-5',
          iconColor: 'text-amber-600',
          textGlow: 'drop-shadow-[0_0_5px_rgba(217,119,6,0.6)]',
          transform: 'hover:scale-102',
          pulse: '',
        };
      default:
        return null;
    }
  };

  return (
    <div className="relative mb-8">
      {/* 背景エフェクト */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-purple-500/10 to-cyan-500/10 blur-3xl rounded-3xl" />
      
      <div className="relative bg-gray-900/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 sm:p-8">


        <div className="flex justify-center items-end gap-4 sm:gap-6 md:gap-8">
          {podiumOrder.map((entry) => {
            if (!entry) return null;
            
            const position = getPosition(entry);
            const config = getPositionConfig(position);
            if (!config) return null;

            const isPlayerTab = activeTab === 'player';

            return (
              <Link
                key={`podium-${getUserId(entry)}`}
                to={`/profile/${getUserId(entry)}`}
                className={`relative flex flex-col items-center p-3 sm:p-4 w-28 sm:w-32 md:w-36 ${config.height} rounded-2xl bg-gradient-to-br ${config.bgGradient} border-2 ${config.borderColor} backdrop-blur-sm transition-all duration-300 ${config.transform} ${config.shadowColor} shadow-xl group ${config.pulse}`}
              >
                {/* ランキングアイコン */}
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-10">
                  <img
                    src={config.rankImage}
                    alt={`${position}位`}
                    className="w-12 h-12 object-contain drop-shadow-lg"
                  />
                </div>

                {/* アバター */}
                <div className={`mt-4 rounded-full overflow-hidden border-2 ${config.borderColor} ${config.glowClass} group-hover:scale-105 transition-transform duration-300 flex-shrink-0`}>
                  <img
                    src={entry.avatar_url || getDefaultAvatarUrl()}
                    alt={entry.username}
                    className="w-16 h-16 object-cover"
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== getDefaultAvatarUrl()) {
                        target.src = getDefaultAvatarUrl();
                      }
                    }}
                  />
                </div>

                {/* ユーザー名 */}
                <div className="mt-2 text-center px-1 w-full">
                  <div 
                    className={`font-bold text-xs sm:text-sm text-white ${config.textGlow} overflow-hidden text-ellipsis whitespace-nowrap`}
                    title={entry.username}
                  >
                    {entry.username.length > 8 ? `${entry.username.substring(0, 8)}...` : entry.username}
                  </div>
                </div>

                {/* スコア */}
                <div className="mt-1 text-center">
                  <div className={`text-xs sm:text-sm font-bold ${
                    isPlayerTab
                      ? getRatingColor(getRatingOrSeasonPoints(entry))
                      : getVoteCountColor(getVoteCount(entry))
                  } ${config.textGlow}`}>
                    {isPlayerTab
                      ? getRatingOrSeasonPoints(entry)
                      : `${getVoteCount(entry) * 100}VP`
                    }
                  </div>
                </div>



                {/* ホバーエフェクト */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${config.bgGradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300`} />
              </Link>
            );
          })}
        </div>

        {/* 表彰台の土台 */}
        <div className="flex justify-center items-end gap-4 sm:gap-6 md:gap-8 mt-4">
          <div className="w-28 sm:w-32 md:w-36 h-6 bg-gradient-to-r from-gray-600 to-gray-700 rounded-t-lg border-t-2 border-gray-400" />
          <div className="w-28 sm:w-32 md:w-36 h-8 bg-gradient-to-r from-yellow-600 to-amber-700 rounded-t-lg border-t-2 border-yellow-400" />
          <div className="w-28 sm:w-32 md:w-36 h-4 bg-gradient-to-r from-amber-700 to-orange-800 rounded-t-lg border-t-2 border-amber-600" />
        </div>
      </div>
    </div>
  );
}; 