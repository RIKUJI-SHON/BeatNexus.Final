import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Button } from './Button';
import { RankBadge } from '../profile/RankBadge';
import { useBattleResultStore, BattleResult } from '../../store/battleResultStore';
import { getCurrentRank } from '../../lib/rankUtils';

interface BattleResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: BattleResult | null;
}

export const BattleResultModal: React.FC<BattleResultModalProps> = ({
  isOpen,
  onClose,
  result,
}) => {
  const { t } = useTranslation();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    console.log('🎭 [BattleResultModal] Component render effect:', { isOpen, hasResult: !!result, result });
  }, [isOpen, result]);

  useEffect(() => {
    if (isOpen && result?.isWin) {
      console.log('🎉 [BattleResultModal] Starting confetti effect for victory');
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, result?.isWin]);

  console.log('🔍 [BattleResultModal] Render check:', { isOpen, hasResult: !!result });

  if (!result) {
    console.log('🚫 [BattleResultModal] No result, returning null');
    return null;
  }

  const isPositiveChange = result.ratingChange > 0;
  const rankInfo = getCurrentRank(result.newRating);

  return (
    <>
      {/* Confetti Effect for Wins */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="confetti-container">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'][Math.floor(Math.random() * 5)]
                }}
              />
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="p-6 text-center">
          {/* Result Icon */}
          <div className="mb-6">
            {result.isWin ? (
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-4xl animate-bounce">
                🏆
              </div>
            ) : (
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center text-4xl">
                😔
              </div>
            )}
          </div>

          {/* Battle Result Title */}
          <h2 className={`text-3xl font-bold mb-2 ${
            result.isWin 
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500' 
              : 'text-gray-400'
          }`}>
            {result.isWin ? t('battle.result.victory') : t('battle.result.defeat')}
          </h2>

          <p className="text-gray-400 mb-6">
            {t('battle.result.against')} <span className="text-white font-semibold">{result.opponentUsername}</span>
          </p>

          {/* Rating Change */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <p className="text-gray-400 text-sm mb-2">{t('battle.result.ratingChange')}</p>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl font-bold text-white">{result.newRating}</span>
              <span className={`text-lg font-semibold ${
                isPositiveChange ? 'text-green-400' : 'text-red-400'
              }`}>
                ({isPositiveChange ? '+' : ''}{result.ratingChange})
              </span>
            </div>
          </div>

          {/* New Rank Badge */}
          <div className="mb-6">
            <p className="text-gray-400 text-sm mb-3">{t('battle.result.currentRank')}</p>
            <div className="flex justify-center">
              <RankBadge rank={rankInfo} />
            </div>
          </div>

          {/* Battle Format */}
          <p className="text-gray-500 text-sm mb-6">
            {t('battle.format')}: {t(`battle.formats.${result.battleFormat.toLowerCase()}`)}
          </p>

          {/* Action Buttons */}
          <div className="flex space-x-3 justify-center">
            <Button
              onClick={onClose}
              variant="secondary"
              className="px-6"
            >
              {t('common.close')}
            </Button>
            
            {result.isWin && (
              <Button
                onClick={() => {
                                   const text = t('battle.result.shareText', {
                   rating: result.newRating,
                   rank: rankInfo.displayName
                 });
                  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`;
                  window.open(url, '_blank');
                }}
                className="px-6 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
              >
                {t('battle.result.share')} 🐦
              </Button>
            )}
          </div>
        </div>
      </Modal>

      <style>{`
        .confetti-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        
        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          animation: confetti-fall 3s linear infinite;
        }
        
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}; 