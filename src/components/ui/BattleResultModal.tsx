import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Button } from './Button';
import { RankBadge } from '../profile/RankBadge';
import { useBattleResultStore, BattleResult } from '../../store/battleResultStore';
import { getCurrentRank } from '../../lib/rankUtils';
import { Share2 } from 'lucide-react';

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

  const isDraw = !result.isWin && result.ratingChange === 0;
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
            ) : isDraw ? (
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center text-4xl animate-bounce">
                🤝
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
              : isDraw
                ? 'text-blue-400'
                : 'text-gray-400'
          }`}>
            {result.isWin 
              ? t('battle.result.victory') 
              : isDraw 
                ? t('battle.result.draw') 
                : t('battle.result.defeat')}
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

          {/* Share Button Only */}
          {result.isWin && (
            <div className="flex justify-center mb-4">
              <button
                className="button"
                onClick={() => {
                  const text = t('battle.result.shareText', {
                    rating: result.newRating,
                    rank: rankInfo.displayName
                  });
                  const tags = "#BeatNexus #ビートボックス #Beatbox";
                  const taggedBase = `${text}\n\n${tags}`;

                  const MAX_TEXT_LEN = 280 - 24; // Reserve for URL
                  let taggedText = taggedBase;
                  if (taggedText.length > MAX_TEXT_LEN) {
                    const excess = taggedText.length - MAX_TEXT_LEN;
                    const newText = text.slice(0, Math.max(0, text.length - excess - 1)).trimEnd() + '…';
                    taggedText = `${newText}\n\n${tags}`;
                  }

                  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(taggedText)}&url=${encodeURIComponent(window.location.origin)}`;
                  window.open(url, '_blank');
                }}
              >
                <Share2 className="icon" />
                {t('battle.result.share')}
              </button>
            </div>
          )}
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

        /* Custom Button Styles */
        .button {
          cursor: pointer;
          padding: 1em;
          font-size: 1em;
          width: 7em;
          aspect-ratio: 1/0.25;
          color: white;
          background: #212121;
          background-size: cover;
          background-blend-mode: overlay;
          border-radius: 0.5em;
          outline: 0.1em solid #353535;
          border: 0;
          box-shadow: 0 0 1em 1em rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease-in-out;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5em;
        }

        .button:hover {
          transform: scale(1.1);
          box-shadow: 0 0 1em 0.45em rgba(0, 0, 0, 0.1);
          background: radial-gradient(circle at bottom, rgba(50, 100, 180, 0.5) 10%, #212121 70%);
          outline: 0;
        }

        .icon {
          width: 1em;
          height: 1em;
          stroke: white;
          fill: white;
        }
      `}</style>
    </>
  );
}; 