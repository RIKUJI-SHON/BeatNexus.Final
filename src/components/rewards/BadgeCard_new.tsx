import React from 'react';

interface BadgeCardProps {
  id: string;
  name: string;
  image_url: string;
  earnedAt?: string;
  isEarned: boolean;
}

const BadgeCard: React.FC<BadgeCardProps> = ({
  name,
  image_url,
  isEarned,
}) => {
  return (
    <div className={`
      relative p-4 rounded-lg transition-all duration-300 transform
      ${isEarned 
        ? 'bg-gradient-to-br from-yellow-100/10 to-amber-200/5 border border-yellow-500/30 hover:border-yellow-400/50 hover:shadow-lg hover:shadow-yellow-500/20' 
        : 'bg-gradient-to-br from-slate-800/40 to-slate-700/20 border border-slate-600/30 hover:border-slate-500/50'
      }
      hover:scale-105 cursor-pointer group
    `}>
      <div className="text-center space-y-3">
        {/* バッジ画像 */}
        <div className="relative mx-auto w-16 h-16">
          <img
            src={image_url}
            alt={name}
            className={`w-full h-full object-cover rounded-full border-2 transition-all duration-300 ${
              isEarned 
                ? 'border-yellow-400 shadow-lg shadow-yellow-500/30' 
                : 'border-slate-500/50 grayscale opacity-60'
            } group-hover:scale-110`}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/images/Profile.png';
            }}
          />
        </div>

        {/* バッジ名 */}
        <h3 className={`text-sm font-medium transition-colors duration-300 ${
          isEarned ? 'text-yellow-100' : 'text-slate-400'
        }`}>
          {name}
        </h3>
      </div>
    </div>
  );
};

export default BadgeCard;
