import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Battle } from '../../types';
import { Card } from '../ui/Card';
import { AuthModal } from '../auth/AuthModal';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useAuthStore } from '../../store/authStore';

interface BattleCardProps {
  battle: Battle;
}

const colorPairs = [
  { a: '#3B82F6', b: '#F472B6' }, // Blue vs Pink
  { a: '#10B981', b: '#8B5CF6' }, // Green vs Purple
  { a: '#F59E0B', b: '#3B82F6' }, // Orange vs Blue
  { a: '#6366F1', b: '#F97316' }, // Indigo vs Orange
  { a: '#EC4899', b: '#10B981' }, // Pink vs Green
];

export const BattleCard: React.FC<BattleCardProps> = ({ battle }) => {
  const { t } = useTranslation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  
  const requireAuth = useRequireAuth({
    showAuthModal: true,
    setAuthModalOpen: setIsAuthModalOpen,
    setAuthModalMode: setAuthModalMode,
  });

  const getTimeRemaining = (endDate: Date) => {
    const total = new Date(endDate).getTime() - new Date().getTime();
    
    if (total <= 0) {
      return t('battleCard.votingEnded');
    }
    
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((total % (1000 * 60)) / 1000);
    
    if (days > 0) {
      return t('battleCard.votingEndsIn', { days, hours });
    } else if (hours > 0) {
      return t('battleCard.votingEndsInHours', { hours, minutes });
    } else if (minutes > 0) {
      return t('battleCard.votingEndsInMinutes', { minutes, seconds });
    } else {
      return t('battleCard.votingEndsInSeconds', { seconds });
    }
  };

  const totalVotes = (battle.votes_a || 0) + (battle.votes_b || 0);
  const percentageA = totalVotes > 0 ? ((battle.votes_a || 0) / totalVotes) * 100 : 50;
  const isALeading = (battle.votes_a || 0) > (battle.votes_b || 0);
  const isBLeading = (battle.votes_b || 0) > (battle.votes_a || 0);
  const commentCount = Math.floor(Math.random() * 20) + 1;
  const colorPairIndex = parseInt(battle.id.replace(/\D/g, '')) % colorPairs.length;
  const { a: colorA, b: colorB } = colorPairs[colorPairIndex];

  const handleVoteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    try {
      if (user) {
        navigate(`/battle/${battle.id}`);
      } else {
        requireAuth(() => navigate(`/battle/${battle.id}`));
      }
    } catch (err) {
      setError(t('battleCard.errors.navigationFailed'));
      console.error('Navigation error:', err);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      navigate(`/battle/${battle.id}`);
    } catch (err) {
      console.error('Navigation error:', err);
    }
  };

  const getDefaultAvatarUrl = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

  // バトル形式に応じたラベルを取得する関数
  const getBattleFormatInfo = (format: string) => {
    switch (format) {
      case 'MAIN_BATTLE':
        return {
          label: t('battleCard.battleFormats.MAIN_BATTLE')
        };
      case 'MINI_BATTLE':
        return {
          label: t('battleCard.battleFormats.MINI_BATTLE')
        };
      case 'THEME_CHALLENGE':
        return {
          label: t('battleCard.battleFormats.THEME_CHALLENGE')
        };
      default:
        return {
          label: 'Battle'
        };
    }
  };

  const battleFormatInfo = getBattleFormatInfo(battle.battle_format || 'MAIN_BATTLE');

  return (
    <>
      <div onClick={handleCardClick}>
        <Card className="bg-gray-900 text-white hover:bg-gray-800 transform hover:-translate-y-2 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 mb-6 overflow-hidden border border-gray-800 cursor-pointer">
          <div className="p-6">
            {/* 残り時間を左上に表示 */}
            <div className="flex justify-start mb-4">
              <div className="text-sm text-gray-400 font-medium">
                {getTimeRemaining(new Date(battle.end_voting_at))}
              </div>
            </div>

            {/* バトル形式 - 上部にシンプルなテキストで表示 */}
            <div className="flex justify-center mb-6">
              <div className="text-lg font-semibold text-gray-300">
                {battleFormatInfo.label}
              </div>
            </div>

            <div className="flex items-center justify-between gap-8">
              <div className="flex-1 text-center">
                <div className="inline-block mb-4">
                  <div 
                    className="w-28 h-28 rounded-full p-1.5"
                    style={{ background: `linear-gradient(45deg, ${colorA}, transparent)` }}
                  >
                    <img
                      src={battle.contestant_a?.avatar_url || getDefaultAvatarUrl(battle.contestant_a_id)}
                      alt={battle.contestant_a?.username || t('battleCard.contestantA')}
                      className="w-full h-full rounded-full object-cover border-2 border-gray-800"
                    />
                  </div>
                </div>
                <div className="text-xl font-bold mb-1">{battle.contestant_a?.username || t('battleCard.unknownUser')}</div>

                <div className={`text-lg transition-all duration-300 ${
                  isALeading 
                    ? 'font-extrabold text-white text-shadow-glow'
                    : 'font-bold text-gray-300'
                }`}>
                  {battle.votes_a || 0} {t('battleCard.votes')}
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="text-3xl font-bold text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                  VS
                </div>
                
                {/* 総投票数を強調して表示 */}
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">{t('battleCard.totalVotes')}</div>
                  <div className="text-2xl font-bold text-white">{totalVotes}</div>
                </div>
              </div>

              <div className="flex-1 text-center">
                <div className="inline-block mb-4">
                  <div 
                    className="w-28 h-28 rounded-full p-1.5"
                    style={{ background: `linear-gradient(45deg, ${colorB}, transparent)` }}
                  >
                    <img
                      src={battle.contestant_b?.avatar_url || getDefaultAvatarUrl(battle.contestant_b_id)}
                      alt={battle.contestant_b?.username || t('battleCard.contestantB')}
                      className="w-full h-full rounded-full object-cover border-2 border-gray-800"
                    />
                  </div>
                </div>
                <div className="text-xl font-bold mb-1">{battle.contestant_b?.username || t('battleCard.unknownUser')}</div>

                <div className={`text-lg transition-all duration-300 ${
                  isBLeading 
                    ? 'font-extrabold text-white text-shadow-glow'
                    : 'font-bold text-gray-300'
                }`}>
                  {battle.votes_b || 0} {t('battleCard.votes')}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="relative h-3 rounded-full overflow-hidden bg-gray-800">
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    background: `linear-gradient(90deg, 
                      ${isALeading ? colorA : 'transparent'} 0%, 
                      ${isALeading ? colorA : 'transparent'} ${percentageA}%, 
                      ${isBLeading ? colorB : 'transparent'} ${percentageA}%, 
                      ${isBLeading ? colorB : 'transparent'} 100%
                    )`,
                    animation: isALeading || isBLeading ? 'pulse 2s infinite' : 'none'
                  }}
                />
                
                <div className="absolute inset-0 flex">
                  <div 
                    className="h-full transition-all duration-300 relative overflow-hidden"
                    style={{ 
                      width: `${percentageA}%`,
                      background: `linear-gradient(90deg, ${colorA}, ${colorA}dd)`
                    }}
                  >
                    {isALeading && (
                      <div 
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                          animation: 'shine 2s infinite'
                        }}
                      />
                    )}
                  </div>
                  <div 
                    className="h-full transition-all duration-300 relative overflow-hidden"
                    style={{ 
                      width: `${100 - percentageA}%`,
                      background: `linear-gradient(90deg, ${colorB}dd, ${colorB})`
                    }}
                  >
                    {isBLeading && (
                      <div 
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                          animation: 'shine 2s infinite'
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              {error && (
                <div className="text-red-500 text-sm mb-2">{error}</div>
              )}
              <button 
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 transition-colors rounded-full text-white font-bold"
                onClick={handleVoteClick}
              >
                {t('battleCard.voteButton')}
              </button>
            </div>

            {/* コメント数を右下に配置 */}
            <div className="mt-4 flex justify-end">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                💬 {commentCount} {t('battleCard.comments')}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        setMode={setAuthModalMode}
      />
    </>
  );
};