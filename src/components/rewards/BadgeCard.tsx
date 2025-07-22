import React, { useState } from 'react';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Calendar, Medal } from 'lucide-react';
import { Reward } from '../../types/rewards';

interface BadgeCardProps {
  badge: Reward;
  isEarned: boolean;
  earnedAt?: string;
  className?: string;
  showDetailOnClick?: boolean;
}

const BadgeCard: React.FC<BadgeCardProps> = ({
  badge,
  isEarned,
  earnedAt,
  className = '',
  showDetailOnClick = true
}) => {
  const [showDetail, setShowDetail] = useState(false);

  const handleCardClick = () => {
    if (showDetailOnClick && isEarned) {
      setShowDetail(true);
    }
  };

  return (
    <>
      <div
        className={`
          group relative p-4 text-center transition-all duration-300 transform
          cursor-pointer hover:scale-105 hover:-translate-y-1
          bg-gradient-to-br rounded-lg border
          ${isEarned
            ? 'from-slate-800/80 to-slate-700/50 border-cyan-500/50 hover:shadow-cyan-500/20 hover:shadow-xl'
            : 'from-slate-800/30 to-slate-700/20 border-slate-600/20 opacity-60 hover:opacity-80'
          }
          ${className}
        `}
        onClick={handleCardClick}
      >
        {/* バッジ画像エリア */}
        <div className="relative mb-4">
          {isEarned ? (
            <div className="relative">
              <div className="h-20 w-20 mx-auto bg-gradient-to-br from-slate-600/80 to-slate-700/60 rounded-xl flex items-center justify-center border border-slate-500/50 transition-all duration-300 group-hover:scale-110">
                {badge.image_url ? (
                  <img
                    src={badge.image_url}
                    alt={badge.name}
                    className="h-16 w-16 object-contain rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <Medal className={`h-12 w-12 text-cyan-400 ${badge.image_url ? 'hidden' : ''}`} />
              </div>
              
              {/* グロー効果 */}
              <div className="absolute inset-0 blur-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ) : (
            <div className="h-20 w-20 mx-auto bg-slate-700/40 rounded-xl flex items-center justify-center border border-slate-600/30 transition-all duration-300 group-hover:border-slate-500/50">
              <Medal className="h-12 w-12 text-slate-500 transition-colors duration-300 group-hover:text-slate-400" />
            </div>
          )}
        </div>

        {/* バッジ情報 */}
        <div className="space-y-2">
          <h3 className={`text-sm font-medium transition-colors duration-300 ${
            isEarned 
              ? 'text-slate-50 group-hover:text-cyan-50' 
              : 'text-slate-500 group-hover:text-slate-400'
          }`}>
            {isEarned ? badge.name : '???'}
          </h3>
          
          <div className="flex items-center justify-center gap-2">
            <Badge 
              variant={isEarned ? 'default' : 'secondary'}
              className={`text-xs px-2 py-1 ${
                isEarned ? 'text-cyan-400 border-cyan-500/50' : 'text-slate-500'
              }`}
            >
              {isEarned ? 'バッジ' : '未獲得'}
            </Badge>
          </div>

          {/* 獲得日時 */}
          {isEarned && earnedAt && (
            <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
              <Calendar className="h-3 w-3" />
              <span>{new Date(earnedAt).toLocaleDateString('ja-JP')}</span>
            </div>
          )}
        </div>

        {/* 未獲得オーバーレイ */}
        {!isEarned && (
          <div className="absolute inset-0 bg-slate-900/40 rounded-lg flex items-center justify-center">
            <div className="text-slate-400 text-xs font-medium px-3 py-1 bg-slate-800/80 rounded-lg border border-slate-600/50">
              未獲得
            </div>
          </div>
        )}

        {/* ホバー効果オーバーレイ */}
        {isEarned && (
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
      </div>

      {/* 詳細モーダル */}
      {showDetail && isEarned && (
        <Modal
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          title="バッジ詳細"
          size="md"
        >
          <div className="space-y-6">
            {/* バッジ画像（大） */}
            <div className="flex justify-center">
              <div className="relative p-6 bg-gradient-to-br from-slate-800/80 to-slate-700/60 rounded-2xl border border-cyan-500/50">
                <div className="h-24 w-24 bg-gradient-to-br from-slate-600/80 to-slate-700/60 rounded-xl flex items-center justify-center border border-slate-500/50">
                  {badge.image_url ? (
                    <img
                      src={badge.image_url}
                      alt={badge.name}
                      className="h-20 w-20 object-contain rounded-lg"
                    />
                  ) : (
                    <Medal className="h-16 w-16 text-cyan-400" />
                  )}
                </div>
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-cyan-500 shadow-sm" />
              </div>
            </div>

            {/* バッジ情報 */}
            <div className="space-y-4 text-center">
              <h2 className="text-xl font-bold text-slate-50">{badge.name}</h2>
              
              {badge.description && (
                <p className="text-slate-300 text-sm leading-relaxed">
                  {badge.description}
                </p>
              )}

              <div className="flex items-center justify-center gap-4">
                <Badge variant="default" className="text-cyan-400 border border-cyan-500/50">
                  <Medal className="h-3 w-3 mr-1" />
                  バッジ
                </Badge>
              </div>

              {earnedAt && (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-400 pt-4 border-t border-slate-600/50">
                  <Calendar className="h-4 w-4" />
                  <span>獲得日: {new Date(earnedAt).toLocaleDateString('ja-JP')}</span>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default BadgeCard;
