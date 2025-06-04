import React from 'react';
import { Shield, Crown, Star, Gem, Zap } from 'lucide-react';
import { RankInfo } from '../../types';

interface RankBadgeProps {
  rank: RankInfo;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const RankBadge: React.FC<RankBadgeProps> = ({ 
  rank, 
  size = 'md', 
  showLabel = true 
}) => {
  const getRankIcon = (rankName: string) => {
    switch (rankName) {
      case 'UNRANKED':
        return Shield;
      case 'BEGINNER':
        return Shield;
      case 'INTERMEDIATE':
        return Star;
      case 'ADVANCED':
        return Gem;
      case 'EXPERT':
        return Crown;
      case 'MASTER':
        return Crown;
      case 'GRANDMASTER':
        return Zap;
      default:
        return Shield;
    }
  };

  const Icon = getRankIcon(rank.rank);

  const sizeClasses = {
    sm: {
      container: 'px-2 py-1',
      icon: 'h-3 w-3',
      text: 'text-xs'
    },
    md: {
      container: 'px-3 py-1.5',
      icon: 'h-4 w-4',
      text: 'text-sm'
    },
    lg: {
      container: 'px-4 py-2',
      icon: 'h-5 w-5',
      text: 'text-base'
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${rank.color} ${currentSize.container} font-bold text-white shadow-lg`}>
      <Icon className={`${currentSize.icon} ${rank.iconColor} drop-shadow-sm`} />
      {showLabel && (
        <span className={`${currentSize.text} drop-shadow-sm`}>
          {rank.displayName}
        </span>
      )}
    </div>
  );
}; 