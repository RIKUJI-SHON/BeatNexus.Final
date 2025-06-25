import React, { useState, useEffect } from 'react';
import { Trophy, Clock, Archive, Users, Mic, Crown } from 'lucide-react';
import { BattleCard } from '../components/battle/BattleCard';
import { ArchivedBattleCard } from '../components/battle/ArchivedBattleCard';
import { WaitingSubmissionCard } from '../components/battle/WaitingSubmissionCard';
import { Pagination } from '../components/ui/Pagination';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuthStore } from '../store/authStore';
import { useBattleStore } from '../store/battleStore';
import { useSubmissionStore } from '../store/submissionStore';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArchivedBattle } from '../types';

const MyBattlesPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'active' | 'waiting' | 'completed'>('active');
  
  // 各タブごとのページネーション状態
  const [activePageState, setActivePageState] = useState({
    activePage: 1,
    waitingPage: 1,
    completedPage: 1
  });
  
  const ITEMS_PER_PAGE = 8; // 1ページあたりの表示件数
  const { user } = useAuthStore();
  const { 
    battles, 
    archivedBattles,
    loading: battlesLoading, 
    archiveLoading,
    error: battlesError, 
    fetchBattles,
    fetchArchivedBattles,
    // subscribeToRealTimeUpdates // 廃止済み
  } = useBattleStore();
  const { 
    submissions, 
    loading: submissionsLoading, 
    error: submissionsError, 
    fetchSubmissions,
    withdrawSubmission 
  } = useSubmissionStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchBattles();
    fetchSubmissions();
    fetchArchivedBattles(); // アーカイブされたバトルも取得
    
    // リアルタイム機能は廃止しました（UX改善のため）
  }, [user, navigate, fetchBattles, fetchSubmissions, fetchArchivedBattles]);

  // Filter battles for current user
  const userBattles = battles.filter(battle => 
    battle.contestant_a_id === user?.id || 
    battle.contestant_b_id === user?.id
  );
  
  const activeBattles = userBattles.filter(battle => battle.status === 'active');
  const completedBattles = archivedBattles || [];
  const waitingSubmissions = submissions.filter(sub => sub.status === 'WAITING_OPPONENT');

  // Calculate stats including archived battles
  const totalBattles = userBattles.length + archivedBattles.length;
  const activeWins = userBattles.filter(battle => {
    const isContestantA = battle.contestant_a_id === user?.id;
    return isContestantA ? 
      (battle.votes_a || 0) > (battle.votes_b || 0) : 
      (battle.votes_b || 0) > (battle.votes_a || 0);
  }).length;
  
  const archivedWins = archivedBattles.filter(battle => battle.winner_id === user?.id).length;
  const totalWins = activeWins + archivedWins;
  
  const winRate = totalBattles > 0 ? Math.round((totalWins / totalBattles) * 100) : 0;
  const totalVotes = userBattles.reduce((sum, battle) => 
    sum + (battle.votes_a || 0) + (battle.votes_b || 0), 0
  ) + archivedBattles.reduce((sum, battle) => 
    sum + battle.final_votes_a + battle.final_votes_b, 0
  );

  const loading = battlesLoading || submissionsLoading;
  const error = battlesError || submissionsError;

  const handleWatchReplay = (battle: ArchivedBattle) => {
    // バトルリプレイページに遷移
    navigate(`/battle-replay/${battle.id}`);
  };

  // ページネーション処理
  const getCurrentPageData = () => {
    const currentPage = activePageState[`${activeTab}Page` as keyof typeof activePageState];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;

    switch (activeTab) {
      case 'active':
        return {
          data: activeBattles.slice(startIndex, endIndex),
          total: activeBattles.length,
          totalPages: Math.ceil(activeBattles.length / ITEMS_PER_PAGE),
          currentPage: activePageState.activePage
        };
      case 'waiting':
        return {
          data: waitingSubmissions.slice(startIndex, endIndex),
          total: waitingSubmissions.length,
          totalPages: Math.ceil(waitingSubmissions.length / ITEMS_PER_PAGE),
          currentPage: activePageState.waitingPage
        };
      case 'completed':
        return {
          data: completedBattles.slice(startIndex, endIndex),
          total: completedBattles.length,
          totalPages: Math.ceil(completedBattles.length / ITEMS_PER_PAGE),
          currentPage: activePageState.completedPage
        };
      default:
        return { data: [], total: 0, totalPages: 0, currentPage: 1 };
    }
  };

  const handlePageChange = (page: number) => {
    setActivePageState(prev => ({
      ...prev,
      [`${activeTab}Page`]: page
    }));
  };

  const handleTabChange = (tab: 'active' | 'waiting' | 'completed') => {
    setActiveTab(tab);
  };

  const paginationData = getCurrentPageData();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 py-10">
        <div className="container mx-auto px-4">
          <Card className="bg-gray-900 border border-red-500/20 p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <Trophy className="h-10 w-10 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">{t('myBattlesPage.error.loadFailed')}</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <Button
              variant="primary"
              onClick={() => {
                fetchBattles();
                fetchSubmissions();
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              {t('myBattlesPage.error.retry')}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">{t('myBattlesPage.title')}</h1>
            <p className="text-gray-400 mt-2">{t('myBattlesPage.subtitle')}</p>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="space-y-6">
          {/* タブ */}
          <div className="flex flex-col gap-6">
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'active' ? 'primary' : 'outline'}
                size="sm"
                leftIcon={<Clock className="h-4 w-4" />}
                onClick={() => handleTabChange('active')}
                className={activeTab === 'active' 
                  ? 'bg-cyan-500 text-white' 
                  : 'border-gray-700 text-gray-400 hover:text-white hover:border-cyan-500/50'
                }
              >
                {t('myBattlesPage.tabs.active')} ({activeBattles.length})
              </Button>
              <Button
                variant={activeTab === 'waiting' ? 'primary' : 'outline'}
                size="sm"
                leftIcon={<Clock className="h-4 w-4" />}
                onClick={() => handleTabChange('waiting')}
                className={activeTab === 'waiting' 
                  ? 'bg-yellow-500 text-white' 
                  : 'border-gray-700 text-gray-400 hover:text-white hover:border-yellow-500/50'
                }
              >
                {t('myBattlesPage.tabs.waiting')} ({waitingSubmissions.length})
              </Button>
              <Button
                variant={activeTab === 'completed' ? 'primary' : 'outline'}
                size="sm"
                leftIcon={<Archive className="h-4 w-4" />}
                onClick={() => handleTabChange('completed')}
                className={activeTab === 'completed' 
                  ? 'bg-green-500 text-white' 
                  : 'border-gray-700 text-gray-400 hover:text-white hover:border-green-500/50'
                }
              >
                {t('myBattlesPage.tabs.completed')} ({completedBattles.length})
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <Card className="bg-gray-900 border border-gray-800 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-cyan-500/20 rounded-lg">
                  <Crown className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{totalWins}</div>
                  <div className="text-sm text-gray-400">{t('myBattlesPage.stats.wins')}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <Trophy className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{winRate}%</div>
                  <div className="text-sm text-gray-400">{t('myBattlesPage.stats.winRate')}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <Users className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{totalVotes}</div>
                  <div className="text-sm text-gray-400">{t('myBattlesPage.stats.totalVotes')}</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Content List */}
          <div className="space-y-6">
            {activeTab === 'active' && (
              paginationData.data.length > 0 ? (
                <>
                  {paginationData.data.map((battle: any) => (
                    <BattleCard key={battle.id} battle={battle} />
                  ))}
                  
                  {/* ページネーション */}
                  <Pagination
                    currentPage={paginationData.currentPage}
                    totalPages={paginationData.totalPages}
                    onPageChange={handlePageChange}
                    showingCount={ITEMS_PER_PAGE}
                    totalCount={paginationData.total}
                    className="mt-8"
                  />
                </>
              ) : (
                <Card className="bg-gray-900 border border-gray-800 p-8 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center">
                    <Mic className="h-10 w-10 text-gray-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">{t('myBattlesPage.empty.activeBattles.title')}</h3>
                  <p className="text-gray-400 mb-6">
                    {t('myBattlesPage.empty.activeBattles.description')}
                  </p>
                  <Button
                    variant="primary"
                    className="bg-gradient-to-r from-cyan-500 to-purple-500"
                    onClick={() => navigate('/post')}
                  >
                    {t('myBattlesPage.empty.activeBattles.button')}
                  </Button>
                </Card>
              )
            )}

            {activeTab === 'waiting' && (
              paginationData.data.length > 0 ? (
                <>
                  {paginationData.data.map((submission: any) => (
                    <WaitingSubmissionCard
                      key={submission.id}
                      submission={submission}
                      onWithdraw={withdrawSubmission}
                    />
                  ))}
                  
                  {/* ページネーション */}
                  <Pagination
                    currentPage={paginationData.currentPage}
                    totalPages={paginationData.totalPages}
                    onPageChange={handlePageChange}
                    showingCount={ITEMS_PER_PAGE}
                    totalCount={paginationData.total}
                    className="mt-8"
                  />
                </>
              ) : (
                <Card className="bg-gray-900 border border-gray-800 p-8 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center">
                    <Clock className="h-10 w-10 text-gray-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">{t('myBattlesPage.empty.waitingSubmissions.title')}</h3>
                  <p className="text-gray-400">
                    {t('myBattlesPage.empty.waitingSubmissions.description')}
                  </p>
                </Card>
              )
            )}

            {activeTab === 'completed' && (
              archiveLoading ? (
                <Card className="bg-gray-900 border border-gray-800 p-8 text-center">
                  <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-400">{t('myBattlesPage.empty.loadingHistory')}</p>
                </Card>
              ) : paginationData.data.length > 0 ? (
                <>
                  {paginationData.data.map((battle: any) => (
                    <ArchivedBattleCard 
                      key={battle.id} 
                      battle={battle} 
                      userId={user?.id || ''}
                      onWatchReplay={handleWatchReplay}
                    />
                  ))}
                  
                  {/* ページネーション */}
                  <Pagination
                    currentPage={paginationData.currentPage}
                    totalPages={paginationData.totalPages}
                    onPageChange={handlePageChange}
                    showingCount={ITEMS_PER_PAGE}
                    totalCount={paginationData.total}
                    className="mt-8"
                  />
                </>
              ) : (
                <Card className="bg-gray-900 border border-gray-800 p-8 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center">
                    <Archive className="h-10 w-10 text-gray-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">{t('myBattlesPage.empty.completedBattles.title')}</h3>
                  <p className="text-gray-400 mb-6">
                    {t('myBattlesPage.empty.completedBattles.description')}
                  </p>
                  <Button
                    variant="primary"
                    className="bg-gradient-to-r from-cyan-500 to-purple-500"
                    onClick={() => navigate('/post')}
                  >
                    {t('myBattlesPage.empty.completedBattles.button')}
                  </Button>
                </Card>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyBattlesPage;