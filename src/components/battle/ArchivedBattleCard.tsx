import React, { useEffect, useMemo } from 'react';
import { Trophy, Crown, Users, Calendar, Play, ShieldCheck, ShieldX, Swords, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
  t: (key: string) => string;
}> = ({ username, avatarUrl, userId, isCurrentUser, isWinner, votes, isPlayerA, ratingChange, newRating, t }) => {
  
  const getRatingChangeDisplay = () => {
    if (ratingChange === undefined || ratingChange === null) return null;
    
    const isPositive = ratingChange > 0;
    const isNeutral = ratingChange === 0;
    
    return (
      <div className={cn(
        "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
        isPositive ? "text-green-400 bg-green-500/10" : 
        isNeutral ? "text-gray-400 bg-gray-500/10" : 
        "text-red-400 bg-red-500/10"
      )}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : 
         isNeutral ? <Minus className="h-3 w-3" /> : 
         <TrendingDown className="h-3 w-3" />}
        {isPositive ? '+' : ''}{ratingChange}
        {newRating && (
          <span className="text-gray-500 ml-1">
            ({newRating})
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      "flex flex-col items-center p-3 rounded-lg",
      isWinner ? "bg-green-500/10 border-green-500/30" : "bg-gray-800/50 border-gray-700/50",
      isPlayerA ? "border-l-2" : "border-r-2"
    )}>
      <div className="relative mb-2">
        <img
          src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`}
          alt={username || (isPlayerA ? t('archivedBattleCard.playerA') : t('archivedBattleCard.playerB'))}
          className="w-16 h-16 rounded-full border-2 border-gray-600 group-hover:border-gray-500 transition-all"
        />
        {isWinner && (
          <Crown className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 bg-gray-900 p-1 rounded-full" />
        )}
        {isCurrentUser && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {t('archivedBattleCard.me')}
          </div>
        )}
      </div>
      <div className="text-sm font-medium text-white truncate max-w-[100px]">{username || (isPlayerA ? t('archivedBattleCard.playerA') : t('archivedBattleCard.playerB'))}</div>
      <div className="text-xs text-gray-400 mb-1">{votes} {t('archivedBattleCard.votesSuffix')}</div>
      {getRatingChangeDisplay()}
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

  const getResultBadge = () => {
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
        className: 'bg-green-500/20 text-green-400 border border-green-500/30',
      };
    }
    return {
      icon: <ShieldX className="h-4 w-4" />,
      text: t('archivedBattleCard.result.loss'),
      className: 'bg-red-500/20 text-red-400 border border-red-500/30',
    };
  };

  const resultBadge = getResultBadge();
  const currentLocale = i18n.language === 'ja' ? ja : enUS;

  return (
    <Card className="group bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 rounded-xl overflow-hidden">
      {/* Header: Battle Format & Date */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <div>
          <h3 className="text-md font-semibold text-cyan-400">
            {battle.battle_format.replace(/_/g, ' ')}
          </h3>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(battle.archived_at), 'yyyy/MM/dd HH:mm', { locale: currentLocale })}
          </p>
        </div>
        <div className={cn("px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5", resultBadge.className)}>
          {resultBadge.icon}
          {resultBadge.text}
        </div>
      </div>

      {/* Players & Score */}
      <div className="p-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <PlayerDisplay
          username={battle.contestant_a?.username || undefined}
          avatarUrl={battle.contestant_a?.avatar_url || undefined}
          userId={battle.player1_user_id}
          isCurrentUser={battle.player1_user_id === userId}
          isWinner={battle.winner_id === battle.player1_user_id}
          votes={battle.final_votes_a}
          isPlayerA={true}
          ratingChange={battle.player1_rating_change}
          newRating={battle.player1_final_rating}
          t={t}
        />
        
        <div className="text-center">
          <div className="text-4xl font-extrabold text-gray-400 group-hover:text-white transition-colors">
            VS
          </div>
          <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
            <Users className="h-3 w-3" />
            {battle.final_votes_a + battle.final_votes_b} {t('archivedBattleCard.votesSuffix')}
          </div>
        </div>

        <PlayerDisplay
          username={battle.contestant_b?.username || undefined}
          avatarUrl={battle.contestant_b?.avatar_url || undefined}
          userId={battle.player2_user_id}
          isCurrentUser={battle.player2_user_id === userId}
          isWinner={battle.winner_id === battle.player2_user_id}
          votes={battle.final_votes_b}
          isPlayerA={false}
          ratingChange={battle.player2_rating_change}
          newRating={battle.player2_final_rating}
          t={t}
        />
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-gray-800 bg-gray-950/50">
        {/* Watch Replay Button */}
        {onWatchReplay && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Play className="h-4 w-4" />}
            onClick={() => onWatchReplay(battle)}
            className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            {t('archivedBattleCard.watchReplayButton')}
          </Button>
        )}
      </div>
    </Card>
  );
}; 