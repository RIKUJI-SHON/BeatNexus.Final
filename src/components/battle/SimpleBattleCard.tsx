import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Battle } from '../../types';
import { Button } from '../ui/Button';
import { VoteButton } from '../ui/VoteButton';
import { AuthModal } from '../auth/AuthModal';
import { BattleCommentsModal } from '../ui/BattleCommentsModal';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useAuthStore } from '../../store/authStore';
import { Clock, Users, Vote, Crown, Video, MessageSquare } from 'lucide-react';
import { VSIcon } from '../ui/VSIcon';
import { RatingChangeDisplay } from '../ui/RatingChangeDisplay';
import { format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { cn } from '../../lib/utils';

interface SimpleBattleCardProps {
  battle: Battle;
}

// 色の固定化のため、colorPairs配列は不要になりました

export const SimpleBattleCard: React.FC<SimpleBattleCardProps> = ({ battle }) => {
  const { t, i18n } = useTranslation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
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
    if (battle.is_archived) {
      const currentLocale = i18n.language === 'ja' ? ja : enUS;
      setTimeRemaining(t('battleCard.archivedOn', { date: format(new Date(battle.end_voting_at), 'yyyy/MM/dd', { locale: currentLocale }) }));
      setIsExpired(true);
      return;
    }

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
    const interval = setInterval(updateTimeRemaining, 60000);
    return () => clearInterval(interval);
  }, [battle.end_voting_at, battle.is_archived, i18n.language]);

  const totalVotes = (battle.votes_a || 0) + (battle.votes_b || 0);
  const percentageA = totalVotes > 0 ? ((battle.votes_a || 0) / totalVotes) * 100 : 50;
  
  // 固定色: プレイヤーAを青、プレイヤーBを赤
  const colorA = '#3B82F6'; // Blue for Player A
  const colorB = '#EF4444'; // Red for Player B

  const handleActionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    const destination = battle.is_archived ? `/battle-replay/${battle.id}` : `/battle/${battle.id}`;
    if (user || battle.is_archived) {
      navigate(destination);
    } else {
      requireAuth(() => navigate(destination));
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const destination = battle.is_archived ? `/battle-replay/${battle.id}` : `/battle/${battle.id}`;
    navigate(destination);
  };

  const handleCommentsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCommentsModalOpen(true);
  };

  const getDefaultAvatarUrl = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

  return (
    <>
      <div onClick={handleCardClick} className="group cursor-pointer">
        <div className="battle-card-simple mb-6">
          <div className="battle-card-simple__content text-white">
            <div className="relative p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-gray-800/60 text-gray-300 border border-gray-600/30">
                  <Users className="h-3 w-3" />
                  {t('battleCard.totalVotes')}: {totalVotes}
                </div>
                <div className={cn('flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-sm', 
                  isExpired ? 'bg-gray-700/50 text-gray-300 border border-gray-600/30' : 
                  'bg-gray-800/60 text-gray-300 border border-gray-600/30')}>
                  <Clock className="h-3 w-3" />
                  <span className="text-xs font-medium">{timeRemaining}</span>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 mb-6">
                {/* Player A */}
                <div className="text-center">
                  <div className="relative inline-block mb-4">
                    {battle.is_archived && battle.winner_id === battle.player1_user_id && (
                      <Crown className="absolute -top-4 -right-4 h-8 w-8 text-yellow-400 transform rotate-12" />
                    )}
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-full p-1 shadow-lg" style={{ background: `linear-gradient(135deg, ${colorA}, ${colorA}80)` }}>
                      <img src={battle.contestant_a?.avatar_url || getDefaultAvatarUrl(battle.player1_user_id)} alt={battle.contestant_a?.username || t('battleCard.contestantA')} className="w-full h-full rounded-full object-cover border-2 border-gray-900"/>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 truncate">{battle.contestant_a?.username || t('battleCard.unknownUser')}</h3>
                  <div className="text-2xl font-extrabold text-gray-300">{battle.votes_a || 0}</div>
                  <div className="text-xs text-gray-400 font-medium">{t('battleCard.votes')}</div>
                  {battle.is_archived && (
                    <RatingChangeDisplay 
                      ratingChange={battle.player1_rating_change}
                      newRating={battle.player1_final_rating}
                    />
                  )}
                </div>

                <VSIcon className="w-16 h-16 md:w-20 md:h-20" />

                {/* Player B */}
                <div className="text-center">
                  <div className="relative inline-block mb-4">
                    {battle.is_archived && battle.winner_id === battle.player2_user_id && (
                      <Crown className="absolute -top-4 -right-4 h-8 w-8 text-yellow-400 transform rotate-12" />
                    )}
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-full p-1 shadow-lg" style={{ background: `linear-gradient(135deg, ${colorB}, ${colorB}80)` }}>
                      <img src={battle.contestant_b?.avatar_url || getDefaultAvatarUrl(battle.player2_user_id)} alt={battle.contestant_b?.username || t('battleCard.contestantB')} className="w-full h-full rounded-full object-cover border-2 border-gray-900"/>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 truncate">{battle.contestant_b?.username || t('battleCard.unknownUser')}</h3>
                  <div className="text-2xl font-extrabold text-gray-300">{battle.votes_b || 0}</div>
                  <div className="text-xs text-gray-400 font-medium">{t('battleCard.votes')}</div>
                  {battle.is_archived && (
                    <RatingChangeDisplay 
                      ratingChange={battle.player2_rating_change}
                      newRating={battle.player2_final_rating}
                    />
                  )}
                </div>
              </div>

              <div className="mb-6">
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full flex">
                    <div className="transition-all duration-1000 ease-out" style={{ width: `${percentageA}%`, background: `linear-gradient(90deg, ${colorA}, ${colorA}80)` }}/>
                    <div className="transition-all duration-1000 ease-out" style={{ width: `${100-percentageA}%`, background: `linear-gradient(90deg, ${colorB}80, ${colorB})` }}/>
                  </div>
                </div>
              </div>

              <div className={cn("flex justify-center", battle.is_archived ? "gap-3" : "")}>
                <VoteButton onClick={handleActionClick} disabled={!battle.is_archived && isExpired} className="max-w-xs">
                  <div className="flex items-center gap-2">
                    {battle.is_archived ? <Video className="h-4 w-4" /> : <Vote className="h-4 w-4" />}
                    {battle.is_archived ? t('battleCard.watchReplay') : isExpired ? t('battleCard.votingEnded') : t('battleCard.voteNow')}
                  </div>
                </VoteButton>
                
                {battle.is_archived && (
                  <VoteButton onClick={handleCommentsClick} className="max-w-xs bg-gray-700 hover:bg-gray-600 border-gray-800">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      {t('battleCard.viewComments')}
                    </div>
                  </VoteButton>
                )}
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="text-sm text-red-400">{error}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        setMode={setAuthModalMode}
      />
      <BattleCommentsModal
        isOpen={isCommentsModalOpen}
        onClose={() => setIsCommentsModalOpen(false)}
        battleId={battle.id}
        playerAName={battle.contestant_a?.username}
        playerBName={battle.contestant_b?.username}
      />
    </>
  );
}; 