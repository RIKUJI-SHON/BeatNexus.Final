import React from 'react';
import { Button } from '../components/ui/Button';
import { useSeasonEndStore } from '../store/seasonEndStore';

const SeasonEndPreviewPage: React.FC = () => {
  const { showSeasonEndModal } = useSeasonEndStore();

  const showBoth = () => {
    showSeasonEndModal({
      seasonId: 'dev-season-001',
      seasonName: '2025-S7',
      playerRank: 12,
      playerPoints: 980,
      voterRank: 5,
      voterPoints: 42,
    });
  };

  const showPlayerOnly = () => {
    showSeasonEndModal({
      seasonId: 'dev-season-001',
      seasonName: '2025-S7',
      playerRank: 3,
      playerPoints: 1530,
      voterRank: null,
      voterPoints: null,
    });
  };

  const showVoterOnly = () => {
    showSeasonEndModal({
      seasonId: 'dev-season-001',
      seasonName: '2025-S7',
      playerRank: null,
      playerPoints: null,
      voterRank: 18,
      voterPoints: 12,
    });
  };

  const showNone = () => {
    showSeasonEndModal({
      seasonId: 'dev-season-001',
      seasonName: '2025-S7',
      playerRank: null,
      playerPoints: null,
      voterRank: null,
      voterPoints: null,
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl text-white font-bold mb-4">Season End Modal Preview</h1>
      <div className="flex flex-wrap gap-3">
        <Button onClick={showBoth} className="bg-yellow-600 hover:bg-yellow-700">両方参加</Button>
        <Button onClick={showPlayerOnly} className="bg-blue-600 hover:bg-blue-700">プレイヤーのみ</Button>
        <Button onClick={showVoterOnly} className="bg-green-600 hover:bg-green-700">投票者のみ</Button>
        <Button onClick={showNone} className="bg-gray-600 hover:bg-gray-700">未参加</Button>
      </div>
    </div>
  );
};

export default SeasonEndPreviewPage;
