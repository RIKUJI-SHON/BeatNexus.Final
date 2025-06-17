import React from 'react';
import { Battle } from '../../types';
import { SimpleBattleCard } from './SimpleBattleCard';
import { SpecialBattleCard } from './SpecialBattleCard';

interface BattleCardProps {
  battle: Battle;
}

export const BattleCard: React.FC<BattleCardProps> = ({ battle }) => {
  // 投票数の合計を計算
  const totalVotes = (battle.votes_a || 0) + (battle.votes_b || 0);
  
  // 残り投票時間を計算（1日 = 24時間 = 86400000ミリ秒）
  const timeRemaining = new Date(battle.end_voting_at).getTime() - new Date().getTime();
  const oneDayInMs = 24 * 60 * 60 * 1000;
  const isEndingSoon = timeRemaining <= oneDayInMs && timeRemaining > 0;
  
  // 投票数が5以上 OR 残り投票時間が1日以下の場合はSpecialBattleCard
  const shouldUseSpecialCard = totalVotes >= 5 || isEndingSoon;
  const CardComponent = shouldUseSpecialCard ? SpecialBattleCard : SimpleBattleCard;
  
  return <CardComponent battle={battle} />;
}; 