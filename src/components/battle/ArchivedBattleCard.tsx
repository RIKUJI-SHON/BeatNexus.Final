import React, { useMemo } from 'react';
import { ArchivedBattle, Battle } from '../../types';
import { SimpleBattleCard } from './SimpleBattleCard';
import { SpecialBattleCard } from './SpecialBattleCard';
import { useTranslation } from 'react-i18next';

interface ArchivedBattleCardProps {
  battle: ArchivedBattle;
}

export const ArchivedBattleCard: React.FC<ArchivedBattleCardProps> = ({ battle }) => {
  const { t } = useTranslation();

  const totalVotes = useMemo(() => {
    return (battle.final_votes_a || 0) + (battle.final_votes_b || 0);
  }, [battle.final_votes_a, battle.final_votes_b]);

  const battleForCard: Battle = useMemo(() => ({
    id: battle.original_battle_id,
    created_at: battle.created_at,
    end_voting_at: battle.archived_at,
    player1_submission_id: battle.player1_submission_id,
    player2_submission_id: battle.player2_submission_id,
    player1_user_id: battle.player1_user_id,
    player2_user_id: battle.player2_user_id,
    contestant_a_id: battle.player1_user_id,
    contestant_b_id: battle.player2_user_id,
    status: 'COMPLETED',
    votes_a: battle.final_votes_a,
    votes_b: battle.final_votes_b,
    battle_format: battle.battle_format,
    updated_at: battle.updated_at,
    contestant_a: battle.contestant_a,
    contestant_b: battle.contestant_b,
    is_archived: true,
    winner_id: battle.winner_id,
    player1_rating_change: battle.player1_rating_change,
    player2_rating_change: battle.player2_rating_change,
    player1_final_rating: battle.player1_final_rating,
    player2_final_rating: battle.player2_final_rating,
    video_url_a: battle.player1_video_url ?? undefined,
    video_url_b: battle.player2_video_url ?? undefined,
  }), [battle]);

  const shouldUseSpecialCard = totalVotes >= 5;
  const CardComponent = shouldUseSpecialCard ? SpecialBattleCard : SimpleBattleCard;
  
  return <CardComponent battle={battleForCard} />;
}; 