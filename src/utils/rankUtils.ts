// ランク関連のユーティリティ関数

export interface RankInfo {
  name: string;
  color: string;
  bgColor: string;
  textColor: string;
  minRating: number;
  maxRating?: number;
}

export const RANK_TIERS: RankInfo[] = [
  {
    name: 'Grandmaster',
    color: 'rainbow',
    bgColor: 'bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500',
    textColor: 'text-white',
    minRating: 1800,
  },
  {
    name: 'Master',
    color: 'purple',
    bgColor: 'bg-purple-500',
    textColor: 'text-white',
    minRating: 1600,
    maxRating: 1799,
  },
  {
    name: 'Expert',
    color: 'blue',
    bgColor: 'bg-blue-500',
    textColor: 'text-white',
    minRating: 1400,
    maxRating: 1599,
  },
  {
    name: 'Advanced',
    color: 'green',
    bgColor: 'bg-green-500',
    textColor: 'text-white',
    minRating: 1300,
    maxRating: 1399,
  },
  {
    name: 'Intermediate',
    color: 'yellow',
    bgColor: 'bg-yellow-500',
    textColor: 'text-black',
    minRating: 1200,
    maxRating: 1299,
  },
  {
    name: 'Beginner',
    color: 'gray',
    bgColor: 'bg-gray-500',
    textColor: 'text-white',
    minRating: 1100,
    maxRating: 1199,
  },
];

/**
 * レーティングからランク情報を取得
 */
export function getRankFromRating(rating: number): RankInfo {
  for (const rank of RANK_TIERS) {
    if (rating >= rank.minRating && (!rank.maxRating || rating <= rank.maxRating)) {
      return rank;
    }
  }
  // デフォルト（Unranked）
  return {
    name: 'Unranked',
    color: 'unranked',
    bgColor: 'bg-gray-700',
    textColor: 'text-gray-300',
    minRating: 0,
    maxRating: 1099,
  };
}

/**
 * ランク色に基づいてTailwind CSSクラスを取得
 */
export function getRankColorClasses(rankColor: string): { bgColor: string; textColor: string } {
  switch (rankColor) {
    case 'rainbow':
      return {
        bgColor: 'bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500',
        textColor: 'text-white',
      };
    case 'purple':
      return {
        bgColor: 'bg-purple-500',
        textColor: 'text-white',
      };
    case 'blue':
      return {
        bgColor: 'bg-blue-500',
        textColor: 'text-white',
      };
    case 'green':
      return {
        bgColor: 'bg-green-500',
        textColor: 'text-white',
      };
    case 'yellow':
      return {
        bgColor: 'bg-yellow-500',
        textColor: 'text-black',
      };
    case 'gray':
      return {
        bgColor: 'bg-gray-500',
        textColor: 'text-white',
      };
    default:
      return {
        bgColor: 'bg-gray-700',
        textColor: 'text-gray-300',
      };
  }
}

/**
 * 次のランクまでに必要なレーティングを計算
 */
export function getRatingToNextRank(currentRating: number): { nextRank: string; pointsNeeded: number } | null {
  const currentRank = getRankFromRating(currentRating);
  const nextRankIndex = RANK_TIERS.findIndex(rank => rank.name === currentRank.name) - 1;
  
  if (nextRankIndex >= 0) {
    const nextRank = RANK_TIERS[nextRankIndex];
    return {
      nextRank: nextRank.name,
      pointsNeeded: nextRank.minRating - currentRating,
    };
  }
  
  return null; // すでに最高ランク
}

/**
 * レーティング変化を表示するためのフォーマット
 */
export function formatRatingChange(change: number): string {
  if (change > 0) {
    return `+${change}`;
  }
  return change.toString();
}

/**
 * 勝率を色付きで表示するためのクラスを取得
 */
export function getWinRateColorClass(winRate: number): string {
  if (winRate >= 80) return 'text-green-400';
  if (winRate >= 65) return 'text-yellow-400';
  if (winRate >= 50) return 'text-orange-400';
  return 'text-red-400';
} 