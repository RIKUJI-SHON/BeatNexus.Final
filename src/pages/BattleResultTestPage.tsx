import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { useBattleResultStore } from '../store/battleResultStore';

const BattleResultTestPage: React.FC = () => {
  const { showResultModal } = useBattleResultStore();

  const handleShowVictory = () => {
    showResultModal({
      battleId: 'test-battle-001',
      isWin: true,
      ratingChange: 25,
      newRating: 1225,
      newRank: 'Advanced',
      opponentUsername: 'OpponentX',
      battleFormat: 'MAIN_BATTLE'
    });
  };

  const handleShowDraw = () => {
    showResultModal({
      battleId: 'test-battle-002',
      isWin: false,
      ratingChange: 0,
      newRating: 1200,
      newRank: 'Advanced',
      opponentUsername: 'OpponentY',
      battleFormat: 'MINI_BATTLE'
    });
  };

  const handleShowDefeat = () => {
    showResultModal({
      battleId: 'test-battle-003',
      isWin: false,
      ratingChange: -18,
      newRating: 1182,
      newRank: 'Intermediate',
      opponentUsername: 'OpponentZ',
      battleFormat: 'THEME_CHALLENGE'
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold text-white mb-8">Battle Result Modal Test</h1>

      <div className="flex flex-col md:flex-row gap-4">
        <Button onClick={handleShowVictory} className="bg-yellow-500 hover:bg-yellow-600 px-8 py-3 font-semibold">
          勝利モーダル
        </Button>

        <Button onClick={handleShowDraw} className="bg-blue-500 hover:bg-blue-600 px-8 py-3 font-semibold">
          引き分けモーダル
        </Button>

        <Button onClick={handleShowDefeat} className="bg-red-600 hover:bg-red-700 px-8 py-3 font-semibold">
          敗北モーダル
        </Button>
      </div>
    </div>
  );
};

export default BattleResultTestPage; 