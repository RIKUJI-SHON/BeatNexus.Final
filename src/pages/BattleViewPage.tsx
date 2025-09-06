import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useBattleStore } from '../store/battleStore';
import { BattleView } from '../components/battle/BattleView';
import { Helmet } from 'react-helmet-async';
import { getBattleIdFromPath } from '../utils/battleUrl';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const BattleViewPage: React.FC = () => {
  const { battlePath } = useParams<{ battlePath: string }>();
  const [searchParams] = useSearchParams();
  const { battles, loading, error, fetchBattles } = useBattleStore();
  const [showNotification, setShowNotification] = useState(false);
  
  // Super Tip関連のURLパラメータ
  const superTipStatus = searchParams.get('superTip');
  
  // URL パスからバトルIDを抽出（新旧両形式に対応）
  const battleId = useMemo(() => {
    return getBattleIdFromPath(battlePath || '');
  }, [battlePath]);

  // Super Tip通知の表示制御
  useEffect(() => {
    if (superTipStatus) {
      setShowNotification(true);
      // 5秒後に自動で通知を非表示
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [superTipStatus]);

  // Super Tip通知コンポーネント
  const SuperTipNotification = () => {
    if (!showNotification || !superTipStatus) return null;

    const getNotificationConfig = () => {
      switch (superTipStatus) {
        case 'succeeded':
          return {
            icon: <CheckCircle className="w-5 h-5 text-green-500" />,
            title: 'Super Tip送信完了！',
            message: 'Super Tipが正常に送信されました。',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
            borderColor: 'border-green-200 dark:border-green-800'
          };
        case 'failed':
          return {
            icon: <XCircle className="w-5 h-5 text-red-500" />,
            title: 'Super Tip送信失敗',
            message: '決済の処理に失敗しました。',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
            borderColor: 'border-red-200 dark:border-red-800'
          };
        case 'processing':
        default:
          return {
            icon: <Clock className="w-5 h-5 text-blue-500" />,
            title: 'Super Tip処理中...',
            message: 'Webhookでの処理完了をお待ちください。',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            borderColor: 'border-blue-200 dark:border-blue-800'
          };
      }
    };

    const config = getNotificationConfig();

    return (
      <div className={`fixed top-4 right-4 z-50 max-w-sm w-full ${config.bgColor} ${config.borderColor} border rounded-lg shadow-lg p-4`}>
        <div className="flex items-start space-x-3">
          {config.icon}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              {config.title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {config.message}
            </p>
          </div>
          <button
            onClick={() => setShowNotification(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ×
          </button>
        </div>
      </div>
    );
  };
  
  // データを取得
  useEffect(() => {
    if (battles.length === 0) {
      fetchBattles();
    }
  }, [fetchBattles, battles.length]);
  
  const battle = battles.find(b => b.id === battleId);
  
  const imageUrl = 'https://beat-nexus-heatbeat-test.vercel.app/images/OGP.png';
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
      <SuperTipNotification />
      <div className="min-h-screen bg-gray-950">
        <BattleView battle={battle!} isArchived={false} />
      </div>
    </>
  );
};

export default BattleViewPage;