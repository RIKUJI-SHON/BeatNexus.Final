import React from 'react';
import { Link } from 'react-router-dom';
import { getDefaultAvatarUrl } from '../../utils';

interface TopThreePodiumProps {
  topThree: Array<{
    username: string;
    avatar_url?: string | null;
    [key: string]: unknown;
  } & Record<string, unknown>>;
  activeTab: 'player' | 'voter';
  getRatingOrSeasonPoints: (entry: unknown) => number;
  getVoteCount: (entry: unknown) => number;
  getRatingColor: (rating: number) => string;
  getVoteCountColor: (voteCount: number) => string;
  getPosition: (entry: unknown) => number;
  getUserId: (entry: unknown) => string;
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
  if (topThree.length === 0) return null;

  // 左: 2位, 中央: 1位, 右: 3位 の順に並べ替え
  const byPos = (a: unknown, b: unknown) => getPosition(a) - getPosition(b);
  const sorted = [...topThree].sort(byPos).slice(0, 3);
  const podiumOrder = [sorted.find(e => getPosition(e) === 2), sorted.find(e => getPosition(e) === 1), sorted.find(e => getPosition(e) === 3)].filter(Boolean) as typeof topThree;

  const rankImageMap: Record<number, string> = {
    1: '/images/1st-place.png',
    2: '/images/2nd-place.png',
    3: '/images/3rd-place.png',
  };

  const ringClass = (position: number) =>
    position === 1
      ? 'from-yellow-400 via-amber-400 to-yellow-500'
      : position === 2
      ? 'from-gray-300 via-gray-400 to-gray-300'
      : 'from-amber-600 via-orange-500 to-amber-600';

  const isPlayerTab = activeTab === 'player';

  return (
    <div className="mb-8 min-h-[200px] sm:min-h-[240px] flex items-start justify-center">
      <div className="flex items-start justify-center gap-6 sm:gap-8 py-4 sm:py-6">
        {podiumOrder.map((entry) => {
          if (!entry) return null;
          const position = getPosition(entry);
          const userId = getUserId(entry);
          const username = entry.username;
          const avatarUrl = entry.avatar_url ?? null;

          return (
            <Link
              key={`simple-podium-${userId}`}
              to={`/profile/${userId}`}
              className="group w-20 sm:w-24 flex flex-col items-center text-center select-none"
            >
              {/* バッジ */}
              <img
                src={rankImageMap[position]}
                alt={`${position}位`}
                className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)]"
              />

              {/* アバター（シンプルなグラデリング） */}
              <div className={`p-[2px] rounded-full bg-gradient-to-br ${ringClass(position)} shadow-md`}
              >
                <img
                  src={avatarUrl || getDefaultAvatarUrl()}
                  alt={username}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover bg-black/20"
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== getDefaultAvatarUrl()) target.src = getDefaultAvatarUrl();
                  }}
                />
              </div>

              {/* ユーザー名 */}
              <div className="mt-3 w-full px-1 text-white font-semibold text-xs sm:text-sm truncate" title={username}>
                {username}
              </div>

              {/* スコア */}
              <div className="mt-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    isPlayerTab
                      ? `${getRatingColor(getRatingOrSeasonPoints(entry))} border-yellow-400/30 bg-yellow-400/10`
                      : `${getVoteCountColor(getVoteCount(entry))} border-purple-400/30 bg-purple-400/10`
                  }`}
                >
                  {isPlayerTab ? getRatingOrSeasonPoints(entry) : `${getVoteCount(entry) * 100}VP`}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};