import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Battle } from '../../types';
import { BattleCommentsModal } from '../ui/BattleCommentsModal';
import { Clock, Crown, MessageSquare, ThumbsUp } from 'lucide-react';
import { VSIcon } from '../ui/VSIcon';
import { RatingChangeDisplay } from '../ui/RatingChangeDisplay';
import { format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { VoteButton } from '../ui/VoteButton';
import { getCurrentRank } from '../../lib/rankUtils';
import { supabase } from '../../lib/supabase';
import { getDefaultAvatarUrl } from '../../utils';

interface SpecialBattleCardProps {
  battle: Battle;
}

// 色の固定化のため、colorPairs配列は不要になりました

export const SpecialBattleCard: React.FC<SpecialBattleCardProps> = ({ battle }) => {
  const { t, i18n } = useTranslation();
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [playerRatings, setPlayerRatings] = useState<{
    playerA: { rating: number; loading: boolean };
    playerB: { rating: number; loading: boolean };
  }>({
    playerA: { rating: 1200, loading: true },
    playerB: { rating: 1200, loading: true }
  });
  const navigate = useNavigate();

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
    const seconds = Math.floor((total % (1000 * 60)) / 1000);
    
    if (days > 0) {
      setTimeRemaining(t('battleCard.votingEndsIn', { days, hours }));
    } else if (hours > 0) {
      setTimeRemaining(t('battleCard.votingEndsInHours', { hours, minutes }));
    } else if (minutes > 0) {
      setTimeRemaining(t('battleCard.timeLeft.minutes', { count: minutes, seconds }));
    } else {
      setTimeRemaining(t('battleCard.timeLeft.seconds', { count: seconds }));
    }
    setIsExpired(false);
  };

  // Load player ratings
  const loadPlayerRatings = async () => {
    try {
      // Player Aのレート取得
      const { data: playerAData, error: errorA } = await supabase
        .from('profiles')
        .select('rating')
        .eq('id', battle.player1_user_id)
        .single();

      // Player Bのレート取得
      const { data: playerBData, error: errorB } = await supabase
        .from('profiles')
        .select('rating')
        .eq('id', battle.player2_user_id)
        .single();

      setPlayerRatings({
        playerA: { 
          rating: playerAData?.rating || 1200, 
          loading: false 
        },
        playerB: { 
          rating: playerBData?.rating || 1200, 
          loading: false 
        }
      });

      if (errorA) console.warn('⚠️ Player A rating fetch error:', errorA);
      if (errorB) console.warn('⚠️ Player B rating fetch error:', errorB);
    } catch (error) {
      console.error('❌ Failed to load player ratings:', error);
      setPlayerRatings({
        playerA: { rating: 1200, loading: false },
        playerB: { rating: 1200, loading: false }
      });
    }
  };

  useEffect(() => {
    updateTimeRemaining();
    loadPlayerRatings(); // レート情報を読み込み
    const interval = setInterval(updateTimeRemaining, 60000);
    return () => clearInterval(interval);
  }, [battle.end_voting_at, battle.is_archived, i18n.language]);

  const totalVotes = (battle.votes_a || 0) + (battle.votes_b || 0);
  const percentageA = totalVotes > 0 ? ((battle.votes_a || 0) / totalVotes) * 100 : 50;
  
  // 固定色: プレイヤーAを青、プレイヤーBを赤
  const colorA = '#3B82F6'; // Blue for Player A
  const colorB = '#EF4444'; // Red for Player B



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

  const PlayerDisplay = ({ 
    player, 
    votes, 
    ratingChange, 
    finalRating, 
    color, 
    isWinner, 
    defaultNameKey, 
    userId,
    currentRating,
    ratingLoading
  }: {
    player: Battle['contestant_a'];
    votes: number | undefined;
    ratingChange: number | null | undefined;
    finalRating: number | null | undefined;
    color: string;
    isWinner: boolean;
    defaultNameKey: string;
    userId: string;
    currentRating: number;
    ratingLoading: boolean;
  }) => (
    <div className="text-center">
      <div className="relative inline-block mb-4">
        {battle.is_archived && isWinner && (
          <Crown className="absolute -top-5 -right-5 h-10 w-10 text-yellow-400 transform rotate-12 animate-pulse" style={{ filter: 'drop-shadow(0 0 10px #facc15)' }}/>
        )}
        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full p-1 shadow-lg transition-all duration-300 group-hover:scale-105" style={{ background: `linear-gradient(135deg, ${color}, ${color}80)` }}>
          <img src={player?.avatar_url || getDefaultAvatarUrl()} alt={player?.username || t(defaultNameKey)} className="w-full h-full rounded-full object-cover border-2 border-gray-900"/>
        </div>
      </div>
      <h3 
        className="text-base sm:text-xl font-bold text-white mb-2 truncate max-w-[90px] sm:max-w-[120px] md:max-w-[140px] mx-auto" 
        title={player?.username || t('battleCard.unknownUser')}
      >
        {player?.username || t('battleCard.unknownUser')}
      </h3>
      {/* Player Rating Display */}
      <div className="mb-2 flex items-center justify-center">
        {ratingLoading ? (
          <div className="text-xs text-gray-400">---</div>
        ) : (
          <div 
            className="text-sm font-medium"
            style={{ color: getCurrentRank(currentRating).iconColor }}
          >
            {currentRating}
          </div>
        )}
      </div>
      {battle.is_archived && (
        <>
      <div className={cn("text-2xl font-extrabold transition-all duration-300", isWinner ? "text-emerald-400 scale-110" : "text-gray-300")}>
        {votes || 0}
      </div>
      <div className="text-xs text-gray-400 font-medium">{t('battleCard.votes')}</div>
        </>
      )}
      {battle.is_archived && (
        <RatingChangeDisplay 
          ratingChange={ratingChange}
          newRating={finalRating}
        />
      )}
    </div>
  );

  return (
    <>
      <div onClick={handleCardClick} className="group cursor-pointer">
        <div className="battle-card mb-6">
          <div className="battle-card__content text-white">
            <div className="relative p-6">
              <div className="flex justify-center items-start mb-6">
                <div className={cn('flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-sm', 
                  isExpired ? 'bg-gray-700/50 text-gray-300 border border-gray-600/30' : 
                  'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30')}>
                  <Clock className="h-3 w-3" />
                  <span className="text-xs font-medium">{timeRemaining}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-4 md:gap-6 mb-6">
                <PlayerDisplay 
                  player={battle.contestant_a}
                  votes={battle.votes_a}
                  ratingChange={battle.player1_rating_change}
                  finalRating={battle.player1_final_rating}
                  color={colorA}
                  isWinner={battle.winner_id === battle.player1_user_id}
                  defaultNameKey="battleCard.contestantA"
                  userId={battle.player1_user_id}
                  currentRating={playerRatings.playerA.rating}
                  ratingLoading={playerRatings.playerA.loading}
                />
                
                {/* VS Icon with Total Votes */}
                <div className="flex flex-col items-center gap-3">
                <VSIcon className="w-16 h-16 md:w-20 md:h-20" />
                  
                  {/* Total Votes Display - Special Battle Style */}
                  <div className="bg-cyan-500/10 backdrop-blur-sm border border-cyan-500/30 rounded-xl px-3 py-2 shadow-lg">
                    <div className="text-center">
                      <div className="text-xl font-bold text-cyan-300">{totalVotes}</div>
                      <div className="text-xs font-medium text-cyan-400/80 uppercase tracking-wide">VOTES</div>
                    </div>
                  </div>
                </div>

                <PlayerDisplay 
                  player={battle.contestant_b}
                  votes={battle.votes_b}
                  ratingChange={battle.player2_rating_change}
                  finalRating={battle.player2_final_rating}
                  color={colorB}
                  isWinner={battle.winner_id === battle.player2_user_id}
                  defaultNameKey="battleCard.contestantB"
                  userId={battle.player2_user_id}
                  currentRating={playerRatings.playerB.rating}
                  ratingLoading={playerRatings.playerB.loading}
                />
              </div>

              {battle.is_archived && (
              <div className="mb-6">
                <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full flex">
                    <div className="transition-all duration-1000 ease-out" style={{ width: `${percentageA}%`, background: `linear-gradient(90deg, ${colorA}cc, ${colorA}80)` }}/>
                    <div className="transition-all duration-1000 ease-out" style={{ width: `${100-percentageA}%`, background: `linear-gradient(90deg, ${colorB}80, ${colorB}cc)` }}/>
                  </div>
                </div>
              </div>
              )}
                
                {battle.is_archived && (
                <div className="flex justify-center">
                  <VoteButton onClick={handleCommentsClick} className="max-w-xs bg-gray-700 hover:bg-gray-600 border-gray-800">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      {t('battleCard.viewComments')}
                    </div>
                  </VoteButton>
                </div>
              )}


            </div>
          </div>
        </div>
      </div>

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