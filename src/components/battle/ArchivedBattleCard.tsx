import React, { useEffect, useMemo } from 'react';
import { Trophy, Crown, Users, Calendar, Play, ShieldCheck, ShieldX, Swords, TrendingUp, TrendingDown, Minus, Flame, Medal, Star } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ArchivedBattle } from '../../types';
import { format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface ArchivedBattleCardProps {
  battle: ArchivedBattle;
  userId: string;
  onWatchReplay?: (battle: ArchivedBattle) => void;
}

const PlayerDisplay: React.FC<{
  username?: string;
  avatarUrl?: string;
  userId: string;
  isCurrentUser: boolean;
  isWinner?: boolean;
  votes: number;
  isPlayerA: boolean;
  ratingChange?: number;
  newRating?: number;
  playerColor: string;
  t: (key: string) => string;
}> = ({ username, avatarUrl, userId, isCurrentUser, isWinner, votes, isPlayerA, ratingChange, newRating, playerColor, t }) => {
  
  const getRatingChangeDisplay = () => {
    if (ratingChange === undefined || ratingChange === null) return null;
    
    const isPositive = ratingChange > 0;
    const isNeutral = ratingChange === 0;
    
    return (
      <div className={cn(
        "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm",
        isPositive ? "text-emerald-400 bg-emerald-500/20 border border-emerald-500/30" : 
        isNeutral ? "text-gray-400 bg-gray-500/20 border border-gray-500/30" : 
        "text-red-400 bg-red-500/20 border border-red-500/30"
      )}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : 
         isNeutral ? <Minus className="h-3 w-3" /> : 
         <TrendingDown className="h-3 w-3" />}
        {isPositive ? '+' : ''}{ratingChange}
        {newRating && (
          <span className="text-gray-400 ml-1">
            ({newRating})
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      "relative flex flex-col items-center p-4 rounded-xl transition-all duration-300",
      isWinner ? "bg-gradient-to-b from-emerald-500/20 to-emerald-600/10 border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/20" : 
      "bg-gradient-to-b from-gray-800/60 to-gray-900/60 border border-gray-700/50",
      "hover:scale-105 transform"
    )}>
      
      {/* Winner Crown */}
      {isWinner && (
        <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
          <Crown className="h-4 w-4 text-white" />
        </div>
      )}

      {/* Player Avatar */}
      <div className="relative mb-3">
        <div 
          className="w-16 h-16 rounded-full p-1 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${playerColor}, ${playerColor}80)` }}
        >
          <img
            src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`}
            alt={username || (isPlayerA ? t('archivedBattleCard.playerA') : t('archivedBattleCard.playerB'))}
            className="w-full h-full rounded-full border-2 border-gray-900 object-cover"
          />
        </div>
        
        {/* Current User Badge */}
        {isCurrentUser && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
            <Star className="h-3 w-3" />
          </div>
        )}
      </div>

      {/* Player Info */}
      <div className="text-center space-y-2">
        <h4 className="text-sm font-bold text-white truncate max-w-[120px]">
          {username || (isPlayerA ? t('archivedBattleCard.playerA') : t('archivedBattleCard.playerB'))}
        </h4>
        
        <div className={cn(
          "text-lg font-extrabold transition-all duration-300",
          isWinner ? "text-emerald-400 scale-110" : "text-gray-300"
        )}>
          {votes}
        </div>
        
        <div className="text-xs text-gray-400 font-medium">
          {t('archivedBattleCard.votesSuffix')}
        </div>
        
        {getRatingChangeDisplay()}
      </div>
    </div>
  );
};

export const ArchivedBattleCard: React.FC<ArchivedBattleCardProps> = ({ 
  battle, 
  userId,
  onWatchReplay 
}) => {
  const { t, i18n } = useTranslation();
  
  const userWasPlayerA = battle.player1_user_id === userId;
  const isUserWinner = battle.winner_id === userId;
  const isDraw = battle.winner_id === null;

  // ユーザーがこのバトルの参加者かどうか
  const isParticipant = useMemo(() => {
    return battle.player1_user_id === userId || battle.player2_user_id === userId;
  }, [battle, userId]);

  // カラーテーマ
  const colorPairs = [
    { a: '#3B82F6', b: '#F472B6', bg: 'from-blue-600/20 to-pink-600/20' },
    { a: '#10B981', b: '#8B5CF6', bg: 'from-emerald-600/20 to-purple-600/20' },
    { a: '#F59E0B', b: '#3B82F6', bg: 'from-amber-600/20 to-blue-600/20' },
    { a: '#6366F1', b: '#F97316', bg: 'from-indigo-600/20 to-orange-600/20' },
    { a: '#EC4899', b: '#10B981', bg: 'from-pink-600/20 to-emerald-600/20' },
  ];
  
  const colorPairIndex = parseInt(battle.id.replace(/\D/g, '')) % colorPairs.length;
  const { a: colorA, b: colorB, bg: gradientBg } = colorPairs[colorPairIndex];

  const getResultBadge = () => {
    if (!isParticipant) {
      // 参加者でない場合は通常の勝者表示
      if (isDraw) {
        return {
          icon: <Swords className="h-4 w-4" />,
          text: t('archivedBattleCard.result.draw'),
          className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
        };
      }
      return {
        icon: <Trophy className="h-4 w-4" />,
        text: battle.winner_id === battle.player1_user_id ? 
              (battle.contestant_a?.username || 'Player A') : 
              (battle.contestant_b?.username || 'Player B'),
        className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      };
    }

    // 参加者の場合は自分の結果を表示
    if (isDraw) {
      return {
        icon: <Swords className="h-4 w-4" />,
        text: t('archivedBattleCard.result.draw'),
        className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      };
    }
    if (isUserWinner) {
      return {
        icon: <ShieldCheck className="h-4 w-4" />,
        text: t('archivedBattleCard.result.win'),
        className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      };
    }
    return {
      icon: <ShieldX className="h-4 w-4" />,
      text: t('archivedBattleCard.result.loss'),
      className: 'bg-red-500/20 text-red-400 border border-red-500/30',
    };
  };

  const getBattleFormatInfo = (format: string) => {
    switch (format) {
      case 'MAIN_BATTLE':
        return {
          label: t('battleCard.battleFormats.MAIN_BATTLE'),
          icon: <Crown className="h-4 w-4" />,
          color: 'from-yellow-500 to-amber-600'
        };
      case 'MINI_BATTLE':
        return {
          label: t('battleCard.battleFormats.MINI_BATTLE'),
          icon: <Flame className="h-4 w-4" />,
          color: 'from-cyan-500 to-blue-600'
        };
      case 'THEME_CHALLENGE':
        return {
          label: t('battleCard.battleFormats.THEME_CHALLENGE'),
          icon: <Trophy className="h-4 w-4" />,
          color: 'from-purple-500 to-pink-600'
        };
      default:
        return {
          label: 'Battle',
          icon: <Medal className="h-4 w-4" />,
          color: 'from-gray-500 to-gray-600'
        };
    }
  };

  const resultBadge = getResultBadge();
  const battleFormatInfo = getBattleFormatInfo(battle.battle_format);
  const currentLocale = i18n.language === 'ja' ? ja : enUS;
  const totalVotes = battle.final_votes_a + battle.final_votes_b;

  return (
    <Card className={`group relative bg-gradient-to-br ${gradientBg} from-gray-900 to-gray-950 border border-gray-700/50 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/20 transition-all duration-500 rounded-xl overflow-hidden`}>
      
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
      </div>

      {/* Header: Battle Format, Date & Result */}
      <div className="relative p-5 border-b border-gray-800/50">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-gray-800/80 to-gray-700/80 border border-gray-600/50 text-white font-bold text-sm shadow-lg backdrop-blur-sm">
            <div className="text-gray-300">
              {battleFormatInfo.icon}
            </div>
            <span className="text-gray-200">{battleFormatInfo.label}</span>
          </div>
          
          <div className={cn("px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm", resultBadge.className)}>
            {resultBadge.icon}
            {resultBadge.text}
          </div>
        </div>
        
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
          <Calendar className="h-3 w-3" />
          {format(new Date(battle.archived_at), 'yyyy/MM/dd HH:mm', { locale: currentLocale })}
        </div>
      </div>

      {/* Main Battle Display */}
      <div className="relative p-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-6">
          
          {/* Player A */}
          <PlayerDisplay
            username={battle.contestant_a?.username || undefined}
            avatarUrl={battle.contestant_a?.avatar_url || undefined}
            userId={battle.player1_user_id}
            isCurrentUser={battle.player1_user_id === userId}
            isWinner={battle.winner_id === battle.player1_user_id}
            votes={battle.final_votes_a}
            isPlayerA={true}
            ratingChange={battle.player1_rating_change ?? undefined}
            newRating={battle.player1_final_rating ?? undefined}
            playerColor={colorA}
            t={t}
          />
          
          {/* VS Section */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 drop-shadow-lg">
                VS
              </div>
              <div className="absolute inset-0 text-3xl font-black text-cyan-400/20 blur-sm">
                VS
              </div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                <Users className="h-3 w-3" />
                Total
              </div>
              <div className="text-lg font-bold text-white bg-gray-800/60 px-2 py-1 rounded-full">
                {totalVotes}
              </div>
            </div>
          </div>

          {/* Player B */}
          <PlayerDisplay
            username={battle.contestant_b?.username || undefined}
            avatarUrl={battle.contestant_b?.avatar_url || undefined}
            userId={battle.player2_user_id}
            isCurrentUser={battle.player2_user_id === userId}
            isWinner={battle.winner_id === battle.player2_user_id}
            votes={battle.final_votes_b}
            isPlayerA={false}
            ratingChange={battle.player2_rating_change ?? undefined}
            newRating={battle.player2_final_rating ?? undefined}
            playerColor={colorB}
            t={t}
          />
        </div>

        {/* Vote Distribution Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>{totalVotes > 0 ? ((battle.final_votes_a / totalVotes) * 100).toFixed(1) : '50.0'}%</span>
            <span>Final Results</span>
            <span>{totalVotes > 0 ? ((battle.final_votes_b / totalVotes) * 100).toFixed(1) : '50.0'}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden shadow-inner">
            <div className="h-full flex">
              <div 
                className="transition-all duration-1000 ease-out"
                style={{ 
                  width: totalVotes > 0 ? `${(battle.final_votes_a / totalVotes) * 100}%` : '50%', 
                  background: `linear-gradient(90deg, ${colorA}, ${colorA}80)` 
                }}
              />
              <div 
                className="transition-all duration-1000 ease-out"
                style={{ 
                  width: totalVotes > 0 ? `${(battle.final_votes_b / totalVotes) * 100}%` : '50%', 
                  background: `linear-gradient(90deg, ${colorB}80, ${colorB})` 
                }}
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        {onWatchReplay && (
          <Button
            variant="primary"
            size="lg"
            leftIcon={<Play className="h-4 w-4" />}
            onClick={() => onWatchReplay(battle)}
            className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 transition-all duration-300 transform hover:scale-105 shadow-lg font-bold"
          >
            {t('archivedBattleCard.watchReplayButton')}
          </Button>
        )}
      </div>
    </Card>
  );
}; 