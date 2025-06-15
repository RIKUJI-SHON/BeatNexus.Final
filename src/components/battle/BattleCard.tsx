import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Battle } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { AuthModal } from '../auth/AuthModal';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useAuthStore } from '../../store/authStore';
import { Clock, Users, Vote } from 'lucide-react';

interface BattleCardProps {
  battle: Battle;
}

const colorPairs = [
  { a: '#3B82F6', b: '#F472B6', bg: 'from-blue-600/20 to-pink-600/20' }, // Blue vs Pink
  { a: '#10B981', b: '#8B5CF6', bg: 'from-emerald-600/20 to-purple-600/20' }, // Green vs Purple
  { a: '#F59E0B', b: '#3B82F6', bg: 'from-amber-600/20 to-blue-600/20' }, // Orange vs Blue
  { a: '#6366F1', b: '#F97316', bg: 'from-indigo-600/20 to-orange-600/20' }, // Indigo vs Orange
  { a: '#EC4899', b: '#10B981', bg: 'from-pink-600/20 to-emerald-600/20' }, // Pink vs Green
];

export const BattleCard: React.FC<BattleCardProps> = ({ battle }) => {
  const { t } = useTranslation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  
  const requireAuth = useRequireAuth({
    showAuthModal: true,
    setAuthModalOpen: setIsAuthModalOpen,
    setAuthModalMode: setAuthModalMode,
  });

  const updateTimeRemaining = () => {
    const total = new Date(battle.end_voting_at).getTime() - new Date().getTime();
    
    if (total <= 0) {
      setTimeRemaining(t('battleCard.votingEnded'));
      setIsExpired(true);
      return;
    }
    
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      setTimeRemaining(t('battleCard.votingEndsIn', { days, hours }));
    } else if (hours > 0) {
      setTimeRemaining(t('battleCard.votingEndsInHours', { hours, minutes }));
    } else {
      setTimeRemaining(t('battleCard.votingEndsInMinutes', { minutes }));
    }
    setIsExpired(false);
  };

  useEffect(() => {
    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [battle.end_voting_at]);

  const totalVotes = (battle.votes_a || 0) + (battle.votes_b || 0);
  const percentageA = totalVotes > 0 ? ((battle.votes_a || 0) / totalVotes) * 100 : 50;
  const percentageB = 100 - percentageA;
  const isALeading = (battle.votes_a || 0) > (battle.votes_b || 0);
  const isBLeading = (battle.votes_b || 0) > (battle.votes_a || 0);
  const isDraw = (battle.votes_a || 0) === (battle.votes_b || 0);
  
  const colorPairIndex = parseInt(battle.id.replace(/\D/g, '')) % colorPairs.length;
  const { a: colorA, b: colorB, bg: gradientBg } = colorPairs[colorPairIndex];

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





  return (
    <>
      <div onClick={handleCardClick} className="group cursor-pointer">
        <Card className={`relative bg-gradient-to-br ${gradientBg} from-gray-900 to-gray-950 text-white hover:shadow-2xl hover:shadow-cyan-500/20 transform hover:-translate-y-1 hover:scale-[1.02] transition-all duration-500 mb-6 overflow-hidden border border-gray-700/50 backdrop-blur-sm`}>
          
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
          </div>



          <div className="relative p-6">
            {/* Header: Time */}
            <div className="flex justify-end items-start mb-6">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-sm ${
                isExpired ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                'bg-gray-800/60 text-gray-300 border border-gray-600/30'
              }`}>
                <Clock className="h-3 w-3" />
                <span className="text-xs font-medium">{timeRemaining}</span>
              </div>
            </div>

            {/* Main Battle Display */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 mb-6">
              
              {/* Player A */}
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <div 
                    className="w-24 h-24 md:w-28 md:h-28 rounded-full p-1 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${colorA}, ${colorA}80)` }}
                  >
                    <img
                      src={battle.contestant_a?.avatar_url || getDefaultAvatarUrl(battle.player1_user_id)}
                      alt={battle.contestant_a?.username || t('battleCard.contestantA')}
                      className="w-full h-full rounded-full object-cover border-2 border-gray-900"
                    />
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-white mb-2 truncate">
                  {battle.contestant_a?.username || t('battleCard.unknownUser')}
                </h3>
                
                <div className="text-2xl font-extrabold text-gray-300">
                  {battle.votes_a || 0}
                </div>
                <div className="text-xs text-gray-400 font-medium">
                  {t('battleCard.votes')}
                </div>
              </div>

              {/* VS Section */}
              <div className="flex flex-col items-center gap-3">
                <div>
                  <img 
                    src="/images/VS.png" 
                    alt="VS" 
                    className="w-16 h-16 md:w-20 md:h-20 object-contain"
                  />
                </div>
                
                <div className="text-center">
                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                    <Users className="h-3 w-3" />
                    {t('battleCard.totalVotes')}
                  </div>
                  <div className="text-xl font-bold text-white bg-gray-800/50 px-3 py-1 rounded-full">
                    {totalVotes}
                  </div>
                </div>
              </div>

              {/* Player B */}
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <div 
                    className="w-24 h-24 md:w-28 md:h-28 rounded-full p-1 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${colorB}, ${colorB}80)` }}
                  >
                    <img
                      src={battle.contestant_b?.avatar_url || getDefaultAvatarUrl(battle.player2_user_id)}
                      alt={battle.contestant_b?.username || t('battleCard.contestantB')}
                      className="w-full h-full rounded-full object-cover border-2 border-gray-900"
                    />
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-white mb-2 truncate">
                  {battle.contestant_b?.username || t('battleCard.unknownUser')}
                </h3>
                
                <div className="text-2xl font-extrabold text-gray-300">
                  {battle.votes_b || 0}
                </div>
                <div className="text-xs text-gray-400 font-medium">
                  {t('battleCard.votes')}
                </div>
              </div>
            </div>

            {/* Vote Progress Bar */}
            <div className="mb-6">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden shadow-inner">
                <div className="h-full flex">
                  <div 
                    className="transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${percentageA}%`, 
                      background: `linear-gradient(90deg, ${colorA}, ${colorA}80)` 
                    }}
                  />
                  <div 
                    className="transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${percentageB}%`, 
                      background: `linear-gradient(90deg, ${colorB}80, ${colorB})` 
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleVoteClick}
                variant="primary"
                size="lg"
                leftIcon={<Vote className="h-4 w-4" />}
                className="px-8 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 transition-all duration-300 transform hover:scale-105 shadow-lg font-bold"
                disabled={isExpired}
              >
                {isExpired ? t('battleCard.votingEnded') : t('battleCard.voteNow')}
              </Button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="text-sm text-red-400">{error}</div>
              </div>
            )}
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