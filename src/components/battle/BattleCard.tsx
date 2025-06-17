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
  
  // 投票数が5以上の場合はSpecialBattleCard、それ以外はSimpleBattleCard
  const CardComponent = totalVotes >= 5 ? SpecialBattleCard : SimpleBattleCard;
  
  return <CardComponent battle={battle} />;
}; 