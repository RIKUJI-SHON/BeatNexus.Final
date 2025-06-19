import React from 'react';
import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RatingChangeDisplayProps {
  ratingChange: number | null | undefined;
  newRating?: number | null | undefined;
  isWinner?: boolean;
}

export const RatingChangeDisplay: React.FC<RatingChangeDisplayProps> = ({ ratingChange, newRating, isWinner }) => {
  if (ratingChange === undefined || ratingChange === null) {
    return null;
  }

  const isPositive = ratingChange > 0;
  const isNeutral = ratingChange === 0;

  const ratingChangeText = isNeutral ? '±0' : `${isPositive ? '+' : ''}${ratingChange}`;
  
  return (
    <div className="flex items-center justify-center gap-2 mt-2">
      <div
        className={cn(
          'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm',
          isPositive
            ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/30'
            : isNeutral
            ? 'text-gray-400 bg-gray-500/20 border border-gray-500/30'
            : 'text-red-400 bg-red-500/20 border border-red-500/30'
        )}
      >
        {isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : isNeutral ? (
          <Minus className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        <span>{ratingChangeText}</span>
      </div>
      {newRating && (
        <span className="text-sm font-bold text-gray-400">
          ( {newRating} )
        </span>
      )}
    </div>
  );
}; 