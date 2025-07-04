import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Button } from './Button';
import { Share2, Zap, Clock } from 'lucide-react';

export interface BattleMatchedData {
  battleId: string;
  opponentUsername: string;
  battleFormat: string;
  votingEndsAt: string;
  matchType: 'immediate' | 'progressive';
  ratingDifference?: number;
}

interface BattleMatchedModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchData: BattleMatchedData | null;
}

export const BattleMatchedModal: React.FC<BattleMatchedModalProps> = ({
  isOpen,
  onClose,
  matchData,
}) => {
  const { t } = useTranslation();
  const [showSparks, setShowSparks] = useState(false);

  useEffect(() => {
    console.log('⚡ [BattleMatchedModal] Component props changed:', { 
      isOpen, 
      hasData: !!matchData, 
      matchData: matchData ? {
        battleId: matchData.battleId,
        opponentUsername: matchData.opponentUsername,
        battleFormat: matchData.battleFormat
      } : null 
    });
  }, [isOpen, matchData]);

  useEffect(() => {
    if (isOpen && matchData) {
      console.log('⚡ [BattleMatchedModal] Starting spark effect for match');
      setShowSparks(true);
      const timer = setTimeout(() => setShowSparks(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, matchData]);

  console.log('🔍 [BattleMatchedModal] Render check:', { isOpen, hasData: !!matchData });

  if (!matchData) {
    console.log('🚫 [BattleMatchedModal] No match data, returning null');
    return null;
  }

  return (
    <>
      {/* Spark Effect for Match */}
      {showSparks && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="spark-container">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="spark-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2.5}s`,
                  backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'][Math.floor(Math.random() * 4)]
                }}
              />
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="p-6 text-center">
          {/* Match Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center text-4xl animate-pulse">
              ⚡
            </div>
          </div>

          {/* Match Title */}
          <h2 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500">
            {t('battle.matched.title')}
          </h2>

          <p className="text-gray-400 mb-6">
            {t('battle.matched.against')} <span className="text-white font-semibold">{matchData.opponentUsername}</span>
          </p>

          {/* Battle Info */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6 space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-semibold">{t(`battle.formats.${matchData.battleFormat}`)}</span>
            </div>
            
            <div className="flex items-center justify-center space-x-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span className="text-gray-400">{t('battle.matched.votingPeriod')}</span>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mb-6">
            <p className="text-gray-300 text-sm mb-4">
              {t('battle.matched.encouragement')}
            </p>
            
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                window.location.href = `/battle/${matchData.battleId}`;
              }}
              className="w-full"
            >
              {t('battle.matched.viewBattle')}
            </Button>
          </div>

          {/* Share Button */}
          <div className="flex justify-center">
            <button
              className="battle-share-button"
              onClick={() => {
                const text = t('battle.matched.shareText', {
                  opponent: matchData.opponentUsername,
                  format: t(`battle.formats.${matchData.battleFormat}`)
                });
                const tags = "#BeatNexus #ビートボックス #Beatbox";
                const battleUrl = `${window.location.origin}/battle/${matchData.battleId}`;
                const shareText = `${text}\n\n${battleUrl}\n\n${tags}`;

                const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
                window.open(url, '_blank');
              }}
            >
              <Share2 className="icon" />
              {t('battle.matched.share')}
            </button>
          </div>
        </div>
      </Modal>

      <style>{`
        .spark-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        
        .spark-piece {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: spark-burst 2.5s ease-out infinite;
        }
        
        @keyframes spark-burst {
          0% {
            transform: scale(0) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: scale(1) rotate(180deg);
            opacity: 0.8;
          }
          100% {
            transform: scale(0) rotate(360deg);
            opacity: 0;
          }
        }

        /* Battle Share Button Styles */
        .battle-share-button {
          cursor: pointer;
          padding: 0.75em 1.5em;
          font-size: 0.9em;
          color: white;
          background: linear-gradient(135deg, #3b82f6, #1e40af);
          border: none;
          border-radius: 0.5em;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5em;
          text-decoration: none;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        }

        .battle-share-button:hover {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        }

        .battle-share-button .icon {
          width: 1.2em;
          height: 1.2em;
        }
      `}</style>
    </>
  );
}; 