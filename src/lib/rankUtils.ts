import { RankInfo, RankProgress } from '../types';

// ランク定義
export const RANKS: RankInfo[] = [
  {
    rank: 'UNRANKED',
    displayName: 'Unranked',
    color: 'from-gray-500 to-gray-700',
    iconColor: 'text-gray-500',
    minRating: 0,
    maxRating: 1099
  },
  {
    rank: 'BEGINNER',
    displayName: 'Beginner',
    color: 'from-gray-400 to-gray-600',
    iconColor: 'text-gray-400',
    minRating: 1100,
    maxRating: 1199
  },
  {
    rank: 'INTERMEDIATE',
    displayName: 'Intermediate',
    color: 'from-yellow-400 to-yellow-600',
    iconColor: 'text-yellow-400',
    minRating: 1200,
    maxRating: 1299
  },
  {
    rank: 'ADVANCED',
    displayName: 'Advanced',
    color: 'from-green-400 to-green-600',
    iconColor: 'text-green-400',
    minRating: 1300,
    maxRating: 1399
  },
  {
    rank: 'EXPERT',
    displayName: 'Expert',
    color: 'from-blue-400 to-blue-600',
    iconColor: 'text-blue-400',
    minRating: 1400,
    maxRating: 1599
  },
  {
    rank: 'MASTER',
    displayName: 'Master',
    color: 'from-purple-400 to-purple-600',
    iconColor: 'text-purple-400',
    minRating: 1600,
    maxRating: 1799
  },
  {
    rank: 'GRANDMASTER',
    displayName: 'Grandmaster',
    color: 'from-pink-400 via-purple-500 to-cyan-500',
    iconColor: 'text-pink-400',
    minRating: 1800,
    maxRating: Infinity
  }
];

/**
 * レーティングに基づいて現在のランクを取得
 */
export function getCurrentRank(rating: number): RankInfo {
  for (const rank of RANKS) {
    if (rating >= rank.minRating && rating <= rank.maxRating) {
      return rank;
    }
  }
  // フォールバック: 最初のランク（Unranked）を返す
  return RANKS[0];
}

/**
 * 次のランクを取得
 */
export function getNextRank(currentRankIndex: number): RankInfo | null {
  if (currentRankIndex >= RANKS.length - 1) {
    return null; // 最高ランクの場合
  }
  return RANKS[currentRankIndex + 1];
}

/**
 * ランクの進捗情報を計算
 */
export function calculateRankProgress(rating: number): RankProgress {
  const currentRank = getCurrentRank(rating);
  const currentRankIndex = RANKS.findIndex(rank => rank.rank === currentRank.rank);
  const nextRank = getNextRank(currentRankIndex);
  
  let progress = 0;
  let pointsNeeded = 0;
  let totalPointsInCurrentRank = 0;
  
  if (nextRank) {
    const pointsInCurrentRank = rating - currentRank.minRating;
    totalPointsInCurrentRank = nextRank.minRating - currentRank.minRating;
    progress = Math.min((pointsInCurrentRank / totalPointsInCurrentRank) * 100, 100);
    pointsNeeded = nextRank.minRating - rating;
  } else {
    // 最高ランクの場合
    progress = 100;
    pointsNeeded = 0;
    totalPointsInCurrentRank = 1; // 0除算を避ける
  }
  
  return {
    currentRank,
    nextRank,
    progress: Math.max(0, progress),
    pointsNeeded: Math.max(0, pointsNeeded),
    totalPointsInCurrentRank
  };
} 