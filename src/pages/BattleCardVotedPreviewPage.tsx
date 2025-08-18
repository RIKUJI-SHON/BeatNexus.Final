import React from 'react';
import { BattleCard } from '../components/battle/BattleCard';
import { Battle } from '../types';

// モックデータ（最小必要フィールドのみ）
const baseBattle: Partial<Battle> = {
  battle_format: 'MAIN_BATTLE' as any,
  status: 'ACTIVE' as any,
  votes_a: 12,
  votes_b: 9,
  end_voting_at: new Date(Date.now() + 1000 * 60 * 60 * 20).toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  contestant_a: { username: 'Alpha', avatar_url: null },
  contestant_b: { username: 'Bravo', avatar_url: null },
};

const mockBattles: Battle[] = [
  {
    ...(baseBattle as Battle),
    id: 'battle-unvoted',
    player1_submission_id: 's1',
    player2_submission_id: 's2',
    player1_user_id: 'u1',
    player2_user_id: 'u2',
    contestant_a_id: 'u1',
    contestant_b_id: 'u2',
    current_user_voted: false,
  },
  {
    ...(baseBattle as Battle),
    id: 'battle-voted',
    player1_submission_id: 's3',
    player2_submission_id: 's4',
    player1_user_id: 'u3',
    player2_user_id: 'u4',
    contestant_a_id: 'u3',
    contestant_b_id: 'u4',
    current_user_voted: true,
  }
];

const BattleCardVotedPreviewPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6 text-white">BattleCard Voted Badge Preview</h1>
      <p className="text-sm text-gray-400 mb-8">開発検証用ページ。左: 未投票 / 右: 投票済 (モック)。</p>
      <div className="grid md:grid-cols-2 gap-8">
        {mockBattles.map(b => (
          <div key={b.id} className="bg-gray-900/40 p-4 rounded-xl border border-gray-700/40">
            <div className="text-xs mb-2 text-gray-400">ID: {b.id} / current_user_voted: {String(b.current_user_voted)}</div>
            <BattleCard battle={b} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default BattleCardVotedPreviewPage;
