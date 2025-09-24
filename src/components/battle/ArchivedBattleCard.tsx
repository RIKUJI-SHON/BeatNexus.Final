import React, { useMemo } from 'react';
import { ArchivedBattle, Battle } from '../../types';
import { BattleCard } from './BattleCard';
import { getBattleUrlFromBattle } from '../../utils/battleUrl';

interface ArchivedBattleCardProps {
  battle: ArchivedBattle;
}

export const ArchivedBattleCard: React.FC<ArchivedBattleCardProps> = ({ battle }) => {
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

  // アクティブと完全同一の見た目を強制しつつ、遷移先はフレンドリーURLのリプレイを維持
  const friendly = getBattleUrlFromBattle({
    id: battle.original_battle_id,
    contestant_a: battle.contestant_a,
    contestant_b: battle.contestant_b,
  });
  const destinationOverride = `/battle-replay/${friendly}`;
  return <BattleCard battle={battleForCard} forceActiveStyle destinationOverride={destinationOverride} />;
}; 