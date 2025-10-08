import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Battle } from '../../types';
import { BattleCommentsModal } from '../ui/BattleCommentsModal';
import { Clock, Crown, MessageSquare, Check } from 'lucide-react';
import { VSIcon } from '../ui/VSIcon';
import { format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { VoteButton } from '../ui/VoteButton';
import { getCurrentRank } from '../../lib/rankUtils';
import { supabase } from '../../lib/supabase';
import { getDefaultAvatarUrl } from '../../utils';
import { getBattleUrlFromBattle } from '../../utils/battleUrl';

interface SpecialBattleCardProps {
  battle: Battle;
  /** アーカイブ専用UIを抑止し、アクティブ風表示を強制 */
  forceActiveStyle?: boolean;
  /** リンク遷移先の上書き */
  destinationOverride?: string;
}

// 色の固定化のため、colorPairs配列は不要になりました

export const SpecialBattleCard: React.FC<SpecialBattleCardProps> = ({ battle, forceActiveStyle, destinationOverride }) => {
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

  const updateTimeRemaining = useCallback(() => {
    if (battle.is_archived) {
      const currentLocale = i18n.language === 'ja' ? ja : enUS;
      setTimeRemaining(t('battleCard.archivedOn', { date: format(new Date(battle.end_voting_at), 'yyyy/MM/dd', { locale: currentLocale }) }));
      setIsExpired(!forceActiveStyle ? true : false);
      return;
    }
    const total = new Date(battle.end_voting_at).getTime() - new Date().getTime();
    if (total <= 0) {
      setTimeRemaining('VOTING ENDED');
      setIsExpired(true);
      return;
    }
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((total % (1000 * 60)) / 1000);
    if (days > 0) {
      const dayLabel = days === 1 ? 'DAY' : 'DAYS';
      const hourLabel = hours === 1 ? 'HOUR' : 'HOURS';
      setTimeRemaining(`${days} ${dayLabel} ${hours} ${hourLabel} LEFT`);
    } else if (hours > 0) {
      setTimeRemaining(`${hours} HOURS LEFT`);
    } else if (minutes > 0) {
      setTimeRemaining(`${minutes} MINUTES LEFT`);
    } else {
      setTimeRemaining(`${seconds} SECONDS LEFT`);
    }
    setIsExpired(false);
  }, [battle.end_voting_at, battle.is_archived, i18n.language, t, forceActiveStyle]);

  // Load player ratings (now season_points)
  const loadPlayerRatings = useCallback(async () => {
    try {
      // Player Aのシーズンポイント取得
      const { data: playerAData, error: errorA } = await supabase
        .from('profiles')
        .select('season_points')
        .eq('id', battle.player1_user_id)
        .single();

      // Player Bのシーズンポイント取得
      const { data: playerBData, error: errorB } = await supabase
        .from('profiles')
        .select('season_points')
        .eq('id', battle.player2_user_id)
        .single();

      setPlayerRatings({
        playerA: { 
          rating: playerAData?.season_points || 1200, 
          loading: false 
        },
        playerB: { 
          rating: playerBData?.season_points || 1200, 
          loading: false 
        }
      });

      if (errorA) console.warn('⚠️ Player A season_points fetch error:', errorA);
      if (errorB) console.warn('⚠️ Player B season_points fetch error:', errorB);
    } catch (error) {
      console.error('❌ Failed to load player season points:', error);
      setPlayerRatings({
        playerA: { rating: 1200, loading: false },
        playerB: { rating: 1200, loading: false }
      });
    }
  }, [battle.player1_user_id, battle.player2_user_id]);

  useEffect(() => {
    updateTimeRemaining();
    loadPlayerRatings();
    const interval = setInterval(updateTimeRemaining, 60000);
    return () => clearInterval(interval);
  }, [updateTimeRemaining, loadPlayerRatings]);

  const totalVotes = (battle.votes_a || 0) + (battle.votes_b || 0);
  const percentageA = totalVotes > 0 ? ((battle.votes_a || 0) / totalVotes) * 100 : 50;
  
  // 固定色: プレイヤーAを青、プレイヤーBを赤
  const colorA = '#3B82F6'; // Blue for Player A
  const colorB = '#EF4444'; // Red for Player B



  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const battleUrl = getBattleUrlFromBattle(battle);
    const destination = destinationOverride
      ? destinationOverride
      : (battle.is_archived && !forceActiveStyle ? `/battle-replay/${battleUrl}` : `/battle/${battleUrl}`);
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
    color, 
    isWinner, 
    defaultNameKey, 
    currentRating,
    ratingLoading
  }: {
    player: Battle['contestant_a'];
    votes: number | undefined;
    color: string;
    isWinner: boolean;
    defaultNameKey: string;
    currentRating: number;
    ratingLoading: boolean;
  }) => (
    <div className="text-center">
      <div className="relative inline-block mb-4">
  {!forceActiveStyle && battle.is_archived && isWinner && (
          <Crown className="absolute -top-5 -right-5 h-10 w-10 text-yellow-400 transform rotate-12 animate-pulse" style={{ filter: 'drop-shadow(0 0 10px #facc15)' }}/>
        )}
        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full p-1 shadow-lg transition-all duration-300 group-hover:scale-105" style={{ background: `linear-gradient(135deg, ${color}, ${color}80)` }}>
          <img src={player?.avatar_url || getDefaultAvatarUrl()} alt={player?.username || t(defaultNameKey)} className="w-full h-full rounded-full object-cover border-2 border-gray-900"/>
        </div>
      </div>
      <h3 
        className="text-base sm:text-xl font-bold text白 mb-2 truncate max-w-[90px] sm:max-w-[120px] md:max-w-[140px] mx-auto" 
        title={player?.username || t('battleCard.unknownUser')}
      >
        {player?.username || t('battleCard.unknownUser')}
      </h3>
      {/* Player Season Points Display */}
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
  {!forceActiveStyle && battle.is_archived && (
        <>
      <div className={cn("text-2xl font-extrabold transition-all duration-300", isWinner ? "text-emerald-400 scale-110" : "text-gray-300")}>
        {votes || 0}
      </div>
      <div className="text-xs text-gray-400 font-medium">{t('battleCard.votes')}</div>
        </>
      )}
  {!forceActiveStyle && battle.is_archived && (
        <div className="mt-1 text-xs font-semibold text-emerald-300">
          {(() => {
            const isDraw = !battle.winner_id;
            const baseWin = battle.battle_format === 'MINI_BATTLE' ? 16 : 32;
            const baseDraw = battle.battle_format === 'MINI_BATTLE' ? 4 : 8;
            const baseLoss = battle.battle_format === 'MINI_BATTLE' ? 2 : 4;
            if (isDraw) return `+${baseDraw} SP`;
            if (isWinner) return `+${baseWin} SP`;
            return `+${baseLoss} SP`;
          })()}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div onClick={handleCardClick} className="group cursor-pointer">
        <div className="battle-card mb-6">
          <div className="battle-card__content text-white relative">
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
                  color={colorA}
                  isWinner={battle.winner_id === battle.player1_user_id}
                  defaultNameKey="battleCard.contestantA"
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

                  {/* Voted Badge (moved below votes) */}
                  {battle.current_user_voted && (
                    <div
                      className="mt-1 flex items-center gap-1 bg-cyan-500/15 text-cyan-300 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-cyan-400/30 shadow-sm backdrop-blur-sm pointer-events-none select-none"
                      aria-label={t('battleCard.votedAria')}
                    >
                      <Check className="w-3 h-3" aria-hidden="true" />
                      {t('battleCard.voted')}
                    </div>
                  )}
                </div>

                <PlayerDisplay 
                  player={battle.contestant_b}
                  votes={battle.votes_b}
                  color={colorB}
                  isWinner={battle.winner_id === battle.player2_user_id}
                  defaultNameKey="battleCard.contestantB"
                  currentRating={playerRatings.playerB.rating}
                  ratingLoading={playerRatings.playerB.loading}
                />
              </div>

              {!forceActiveStyle && battle.is_archived && (
              <div className="mb-6">
                <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full flex">
                    <div className="transition-all duration-1000 ease-out" style={{ width: `${percentageA}%`, background: `linear-gradient(90deg, ${colorA}cc, ${colorA}80)` }}/>
                    <div className="transition-all duration-1000 ease-out" style={{ width: `${100-percentageA}%`, background: `linear-gradient(90deg, ${colorB}80, ${colorB}cc)` }}/>
                  </div>
                </div>
              </div>
              )}
                
                {!forceActiveStyle && battle.is_archived && (
                <div className="flex justify-center">
                  <VoteButton onClick={handleCommentsClick} className="max-w-xs bg-gray-700 hover:bg-gray-600 border-gray-800">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      {t('battleCard.viewComments')}
                    </div>
                  </VoteButton>
                </div>
              )}

              {/* フォーマットタグ（カード下部中央） */}
              <div className="mt-4 flex justify-center">
                <div className={`px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${
                  battle.battle_format === 'MINI_BATTLE' 
                    ? 'bg-blue-500/15 text-blue-200 border-blue-400/30'
                    : battle.battle_format === 'MAIN_BATTLE'
                    ? 'bg-red-500/15 text-red-200 border-red-400/30'
                    : 'bg-indigo-500/15 text-indigo-200 border-indigo-400/30'
                }`}>
                  {battle.battle_format === 'MINI_BATTLE' ? 'MINI BATTLE' : (battle.battle_format === 'MAIN_BATTLE' ? 'MAIN BATTLE' : 'THEME')}
                </div>
              </div>


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