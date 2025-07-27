import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Battle } from '../../types';
import { VoteButton } from '../ui/VoteButton';
import { BattleCommentsModal } from '../ui/BattleCommentsModal';
import { Clock, Crown, MessageSquare } from 'lucide-react';
import { VSIcon } from '../ui/VSIcon';
import { RatingChangeDisplay } from '../ui/RatingChangeDisplay';
import { format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { getCurrentRank } from '../../lib/rankUtils';
import { supabase } from '../../lib/supabase';
import { getDefaultAvatarUrl } from '../../utils';
import { getBattleUrlFromBattle } from '../../utils/battleUrl';

interface SimpleBattleCardProps {
  battle: Battle;
}

// 色の固定化のため、colorPairs配列は不要になりました

export const SimpleBattleCard: React.FC<SimpleBattleCardProps> = ({ battle }) => {
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
    
    if (days > 0) {
      setTimeRemaining(t('battleCard.votingEndsIn', { days, hours }));
    } else if (hours > 0) {
      setTimeRemaining(t('battleCard.votingEndsInHours', { hours, minutes }));
    } else {
      setTimeRemaining(t('battleCard.votingEndsInMinutes', { minutes }));
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
    const battleUrl = getBattleUrlFromBattle(battle);
    const destination = battle.is_archived ? `/battle-replay/${battleUrl}` : `/battle/${battleUrl}`;
    navigate(destination);
  };

  const handleCommentsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCommentsModalOpen(true);
  };

  return (
    <>
      <div onClick={handleCardClick} className="group cursor-pointer">
        <div className="battle-card-simple mb-6 transform transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-xl">
          <div className="battle-card-simple__content text-white relative overflow-hidden">
            {/* Subtle gradient overlay for more presence */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-transparent to-red-900/10 opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
            <div className="relative p-6 border border-gray-600/30 group-hover:border-gray-500/50 rounded-xl transition-colors duration-300">
              <div className="flex justify-center items-start mb-6">
                <div className={cn('flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-sm transition-all duration-300 group-hover:shadow-md', 
                  isExpired ? 'bg-gray-700/60 text-gray-300 border border-gray-600/40 group-hover:bg-gray-700/80' : 
                  'bg-gradient-to-r from-gray-800/70 to-gray-700/70 text-gray-200 border border-gray-600/50 group-hover:border-gray-500/70 group-hover:from-gray-700/80 group-hover:to-gray-600/80')}>
                  <Clock className="h-3 w-3" />
                  <span className="text-xs font-medium">{timeRemaining}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-4 md:gap-6 mb-6">
                {/* Player A */}
                <div className="text-center">
                  <div className="relative inline-block mb-4">
                    {battle.is_archived && battle.winner_id === battle.player1_user_id && (
                      <Crown className="absolute -top-4 -right-4 h-8 w-8 text-yellow-400 transform rotate-12" />
                    )}
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-full p-1 shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-blue-500/20" style={{ background: `linear-gradient(135deg, ${colorA}, ${colorA}80)` }}>
                      <img src={battle.contestant_a?.avatar_url || getDefaultAvatarUrl()} alt={battle.contestant_a?.username || t('battleCard.contestantA')} className="w-full h-full rounded-full object-cover border-2 border-gray-900"/>
                    </div>
                  </div>
                  <h3 
                    className="text-base sm:text-xl font-bold text-white mb-2 truncate max-w-[90px] sm:max-w-[120px] md:max-w-[140px] mx-auto" 
                    title={battle.contestant_a?.username || t('battleCard.unknownUser')}
                  >
                    {battle.contestant_a?.username || t('battleCard.unknownUser')}
                  </h3>
                  {/* Player A Rating Display */}
                  <div className="mb-2 flex items-center justify-center">
                    {playerRatings.playerA.loading ? (
                      <div className="text-xs text-gray-400">---</div>
                    ) : (
                      <div 
                        className="text-sm font-medium"
                        style={{ color: getCurrentRank(playerRatings.playerA.rating).iconColor }}
                      >
                        {playerRatings.playerA.rating}
                      </div>
                    )}
                  </div>
                  {battle.is_archived && (
                    <>
                  <div className="text-2xl font-extrabold text-gray-300">{battle.votes_a || 0}</div>
                  <div className="text-xs text-gray-400 font-medium">{t('battleCard.votes')}</div>
                    </>
                  )}
                  {battle.is_archived && (
                    <RatingChangeDisplay 
                      ratingChange={battle.player1_rating_change}
                      newRating={battle.player1_final_rating}
                    />
                  )}
                </div>

                {/* VS Icon with Total Votes */}
                <div className="flex flex-col items-center gap-3">
                  <VSIcon className="w-16 h-16 md:w-20 md:h-20 transition-transform duration-300 group-hover:scale-110" />
                  
                  {/* Total Votes Display */}
                  <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-gray-600/50 group-hover:border-gray-500/70 rounded-xl px-3 py-2 shadow-lg group-hover:shadow-xl transition-all duration-300">
                    <div className="text-center">
                      <div className="text-xl font-bold text-white group-hover:text-gray-100 transition-colors duration-300">{totalVotes}</div>
                      <div className="text-xs font-medium text-gray-400 group-hover:text-gray-300 uppercase tracking-wide transition-colors duration-300">VOTES</div>
                    </div>
                  </div>
                </div>

                {/* Player B */}
                <div className="text-center">
                  <div className="relative inline-block mb-4">
                    {battle.is_archived && battle.winner_id === battle.player2_user_id && (
                      <Crown className="absolute -top-4 -right-4 h-8 w-8 text-yellow-400 transform rotate-12" />
                    )}
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-full p-1 shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-red-500/20" style={{ background: `linear-gradient(135deg, ${colorB}, ${colorB}80)` }}>
                      <img src={battle.contestant_b?.avatar_url || getDefaultAvatarUrl()} alt={battle.contestant_b?.username || t('battleCard.contestantB')} className="w-full h-full rounded-full object-cover border-2 border-gray-900"/>
                    </div>
                  </div>
                  <h3 
                    className="text-base sm:text-xl font-bold text-white mb-2 truncate max-w-[90px] sm:max-w-[120px] md:max-w-[140px] mx-auto" 
                    title={battle.contestant_b?.username || t('battleCard.unknownUser')}
                  >
                    {battle.contestant_b?.username || t('battleCard.unknownUser')}
                  </h3>
                  {/* Player B Rating Display */}
                  <div className="mb-2 flex items-center justify-center">
                    {playerRatings.playerB.loading ? (
                      <div className="text-xs text-gray-400">---</div>
                    ) : (
                      <div 
                        className="text-sm font-medium"
                        style={{ color: getCurrentRank(playerRatings.playerB.rating).iconColor }}
                      >
                        {playerRatings.playerB.rating}
                      </div>
                    )}
                  </div>
                  {battle.is_archived && (
                    <>
                  <div className="text-2xl font-extrabold text-gray-300">{battle.votes_b || 0}</div>
                  <div className="text-xs text-gray-400 font-medium">{t('battleCard.votes')}</div>
                    </>
                  )}
                  {battle.is_archived && (
                    <RatingChangeDisplay 
                      ratingChange={battle.player2_rating_change}
                      newRating={battle.player2_final_rating}
                    />
                  )}
                </div>
              </div>

              {battle.is_archived && (
              <div className="mb-6">
                  <div className="h-2 bg-gray-800/80 rounded-full overflow-hidden shadow-inner border border-gray-700/50">
                  <div className="h-full flex">
                      <div className="transition-all duration-1000 ease-out group-hover:brightness-110" style={{ width: `${percentageA}%`, background: `linear-gradient(90deg, ${colorA}, ${colorA}80)` }}/>
                      <div className="transition-all duration-1000 ease-out group-hover:brightness-110" style={{ width: `${100-percentageA}%`, background: `linear-gradient(90deg, ${colorB}80, ${colorB})` }}/>
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