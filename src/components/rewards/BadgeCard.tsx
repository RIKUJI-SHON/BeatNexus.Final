import React, { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';

interface BadgeCardProps {
  id: string;
  name: string;
  description?: string;
  image_url: string;
  earnedAt?: string;
  isEarned: boolean;
}

const BadgeCard: React.FC<BadgeCardProps> = ({
  name,
  description,
  image_url,
  earnedAt,
  isEarned,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useTranslation();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      <div 
        className={`
          relative p-6 rounded-lg transition-all duration-300 transform
          ${isEarned 
            ? 'bg-gradient-to-br from-yellow-100/10 to-amber-200/5 border border-yellow-500/30 hover:border-yellow-400/50 hover:shadow-lg hover:shadow-yellow-500/20' 
            : 'bg-gradient-to-br from-slate-800/40 to-slate-700/20 border border-slate-600/30 hover:border-slate-500/50'
          }
          hover:scale-105 cursor-pointer group
        `}
        onClick={() => setIsModalOpen(true)}
      >
        <div className="text-center space-y-4">
          {/* バッジ画像 - サイズを大きく */}
          <div className="relative mx-auto w-24 h-24">
            <img
              src={image_url}
              alt={name}
              className={`w-full h-full object-cover rounded-full border-3 transition-all duration-300 ${
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

          {/* 獲得日 */}
          {isEarned && earnedAt && (
            <div className="flex items-center justify-center gap-1 text-xs text-yellow-300/80">
              <CalendarDays className="w-3 h-3" />
              <span>{formatDate(earnedAt)}</span>
            </div>
          )}
        </div>

        {/* ホバー効果 */}
        <div className={`absolute inset-0 rounded-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100 ${
          isEarned 
            ? 'bg-gradient-to-br from-yellow-400/5 to-amber-300/5' 
            : 'bg-gradient-to-br from-slate-600/5 to-slate-500/5'
        }`} />
      </div>

      {/* 詳細モーダル */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={name}
      >
        <div className="space-y-6">
          {/* バッジ画像（大） */}
          <div className="text-center">
            <div className="relative mx-auto w-32 h-32">
              <img
                src={image_url}
                alt={name}
                className={`w-full h-full object-cover rounded-full border-4 ${
                  isEarned 
                    ? 'border-yellow-400 shadow-lg shadow-yellow-500/30' 
                    : 'border-slate-500/50 grayscale opacity-60'
                }`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/Profile.png';
                }}
              />
            </div>
          </div>

          {/* 説明 */}
          {description && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
              <h4 className="text-slate-200 font-medium mb-2">{t('premium.badges.details.description')}</h4>
              <p className="text-slate-300 text-sm leading-relaxed">{description}</p>
            </div>
          )}

          {/* 獲得日 */}
          {isEarned && earnedAt && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
              <h4 className="text-slate-200 font-medium mb-2">{t('premium.badges.details.earnedDate')}</h4>
              <div className="flex items-center gap-2 text-yellow-300">
                <CalendarDays className="w-4 h-4" />
                <span className="text-sm">{formatDate(earnedAt)}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default BadgeCard;
