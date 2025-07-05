import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBattleStore } from '../store/battleStore';
import { BattleView } from '../components/battle/BattleView';
import { Helmet } from 'react-helmet-async';

const BattleViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { battles, loading, error, fetchBattles } = useBattleStore();
  
  // データを取得
  useEffect(() => {
    if (battles.length === 0) {
      fetchBattles();
    }
  }, [fetchBattles, battles.length]);
  
  const battle = battles.find(b => b.id === id);
  
  const imageUrl = '/images/hero-background.png';
  const pageTitle = battle ? 
    `${battle.contestant_a?.username || 'Player 1'} vs ${battle.contestant_b?.username || 'Player 2'} - BeatNexus Battle` : 
    'BeatNexus Battle';
  const description = battle ?
    `Watch the epic beatbox battle between ${battle.contestant_a?.username || 'Player 1'} and ${battle.contestant_b?.username || 'Player 2'}! Vote for your favorite performer on BeatNexus.` :
    'Watch epic beatbox battles and vote for your favorite performers on BeatNexus.';
  
  // ローディング状態
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h1 className="text-xl font-bold text-white mb-2">Loading Battle...</h1>
          <p className="text-gray-400">Please wait while we load the battle details.</p>
        </div>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Error Loading Battle</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button 
            onClick={() => fetchBattles()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  // バトルが見つからない場合
  if (!battle && !loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Battle Not Found</h1>
          <p className="text-gray-400 mb-6">The battle you're looking for doesn't exist or has been removed.</p>
          <button 
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors mr-4"
          >
            Go Back
          </button>
          <button 
            onClick={() => window.location.href = '/battles'}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            View All Battles
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={imageUrl} />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={pageTitle} />
        <meta property="twitter:description" content={description} />
        <meta property="twitter:image" content={imageUrl} />
      </Helmet>
      <div className="min-h-screen bg-gray-950">
        <BattleView battle={battle!} isArchived={false} />
      </div>
    </>
  );
};

export default BattleViewPage;