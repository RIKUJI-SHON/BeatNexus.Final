import React from 'react';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface RatingChangeDisplayProps {
  playerName: string;
  oldRating: number;
  newRating: number;
  isWinner: boolean;
  isTie?: boolean; // 🆕 引き分けフラグ追加
  className?: string;
}

export const RatingChangeDisplay: React.FC<RatingChangeDisplayProps> = ({
  playerName,
  oldRating,
  newRating,
  isWinner,
  isTie = false, // 🆕 引き分けフラグのデフォルト値
  className = ''
}) => {
  const ratingChange = newRating - oldRating;
  const isPositive = ratingChange > 0;

  const getRatingTier = (rating: number) => {
    if (rating >= 1600) return { tier: 'マスター', color: 'text-purple-400' };
    if (rating >= 1400) return { tier: 'エキスパート', color: 'text-blue-400' };
    if (rating >= 1200) return { tier: 'アドバンス', color: 'text-green-400' };
    if (rating >= 1000) return { tier: 'ビギナー', color: 'text-yellow-400' };
    return { tier: 'ルーキー', color: 'text-gray-400' };
  };

  const { tier, color } = getRatingTier(newRating);

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">{playerName}</span>
          <Badge 
            variant="secondary" 
            className={`${
              isTie 
                ? 'bg-yellow-500/20 text-yellow-300' 
                : isWinner 
                  ? 'bg-green-500/20 text-green-300' 
                  : 'bg-red-500/20 text-red-300'
            } text-xs`}
          >
            {isTie ? '引き分け' : isWinner ? '勝利' : '敗北'}
          </Badge>
        </div>
        <Badge variant="secondary" className="bg-gray-600/20 text-gray-300 text-xs">
          {tier}
        </Badge>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">変更前</div>
            <div className={`text-lg font-bold ${color}`}>
              {oldRating}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )}
            <span className={`text-sm font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{ratingChange}
            </span>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">変更後</div>
            <div className={`text-lg font-bold ${color}`}>
              {newRating}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-gray-400">
          <Star className="h-3 w-3" />
          <span className="text-xs">Elo</span>
        </div>
      </div>
    </div>
  );
}; 