import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trophy, Crown, ArrowRight, Play, Mic, Users, Archive, BookOpen, Medal, Star } from 'lucide-react';
import { BattleCard } from '../components/battle/BattleCard';
import { ArchivedBattleCard } from '../components/battle/ArchivedBattleCard';
import { BattleFilters } from '../components/battle/BattleFilters';
import { Pagination } from '../components/ui/Pagination';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { AuthModal } from '../components/auth/AuthModal';
import { useRankingStore } from '../store/rankingStore';
import { useBattleStore } from '../store/battleStore';
import { useAuthStore } from '../store/authStore';
import { RankingEntry, BattleFormat } from '../types';
import { useTranslation } from 'react-i18next';
import { getRankColorClasses } from '../utils/rankUtils';

const BattlesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'trending' | 'ending' | 'completed'>('recent');
  const [showMyBattlesOnly, setShowMyBattlesOnly] = useState(false);
  const [selectedBattleFormat, setSelectedBattleFormat] = useState<BattleFormat | 'ALL'>('ALL');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // ページネーション関連の状態
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10; // 1ページあたりの表示件数
  
  const { battles, activeBattles, archivedBattles, archivedBattlesCount, communityMembersCount, totalVotesCount, totalSubmissionsCount, loading, archiveLoading, error, fetchBattles, fetchArchivedBattles, fetchArchivedBattlesCount, fetchCommunityMembersCount, fetchTotalVotesCount, fetchTotalSubmissionsCount, subscribeToRealTimeUpdates } = useBattleStore();
  const { rankings, loading: rankingsLoading, fetchRankings } = useRankingStore();
  const { user } = useAuthStore();
  
  // Get top 3 rankings safely
  const topRankings = rankings?.slice(0, 3) || [];

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const initializeData = async () => {
    try {
        await fetchBattles();
        await fetchRankings();
        await fetchArchivedBattles();
        await fetchArchivedBattlesCount();
        await fetchCommunityMembersCount();
        await fetchTotalVotesCount();
        await fetchTotalSubmissionsCount();
        
        // リアルタイム購読を開始
        unsubscribe = subscribeToRealTimeUpdates();
    } catch (error) {
      console.error('Error in useEffect:', error);
    }
    };
    
    initializeData();
    
    // クリーンアップでリアルタイム購読を停止
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []); // 空の依存配列でマウント時のみ実行

  const requireAuth = useRequireAuth({
    showAuthModal: true,
    setAuthModalOpen: setIsAuthModalOpen,
    setAuthModalMode: () => {},
  });

  const handleCreateBattle = (e: React.MouseEvent) => {
    e.preventDefault();
    if (requireAuth(() => navigate('/post'))) {
      navigate('/post');
    }
  };

  const filteredBattles = useMemo(() => {
    try {
      let battleList = [...(battles || [])];

      // MY BATTLES フィルター
      if (showMyBattlesOnly && user) {
        battleList = battleList.filter(battle => 
          battle.contestant_a_id === user.id || battle.contestant_b_id === user.id
        );
      }

      // バトル形式フィルター
      if (selectedBattleFormat !== 'ALL') {
        battleList = battleList.filter(battle => 
          battle.battle_format === selectedBattleFormat
        );
      }

      // 検索フィルター
      if (searchQuery) {
        battleList = battleList.filter(battle => 
          battle.contestant_a?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          battle.contestant_b?.username?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // ソート処理
      switch (sortBy) {
        case 'recent':
          return battleList.sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bTime - aTime;
          });
        case 'trending':
          return battleList.sort((a, b) => 
            ((b.votes_a || 0) + (b.votes_b || 0)) - ((a.votes_a || 0) + (a.votes_b || 0))
          );
        case 'ending':
          return battleList.sort((a, b) => {
            const aTime = a.end_voting_at ? new Date(a.end_voting_at).getTime() : 0;
            const bTime = b.end_voting_at ? new Date(b.end_voting_at).getTime() : 0;
            return aTime - bTime;
          });
        case 'completed':
          return battleList
            .filter(battle => battle.status === 'completed')
            .sort((a, b) => {
              const aTime = a.end_voting_at ? new Date(a.end_voting_at).getTime() : 0;
              const bTime = b.end_voting_at ? new Date(b.end_voting_at).getTime() : 0;
              return bTime - aTime;
            });
        default:
          return battleList;
      }
    } catch (error) {
      console.error('Error in filteredBattles:', error);
      return [];
    }
  }, [battles, sortBy, searchQuery, showMyBattlesOnly, selectedBattleFormat, user]);

  const filteredArchivedBattles = useMemo(() => {
    try {
      let battleList = [...(archivedBattles || [])];

      // MY BATTLES フィルター（アーカイブバトル用）
      if (showMyBattlesOnly && user) {
        battleList = battleList.filter(battle => 
          battle.player1_user_id === user.id || battle.player2_user_id === user.id
        );
      }

      // バトル形式フィルター（アーカイブバトル用）
      if (selectedBattleFormat !== 'ALL') {
        battleList = battleList.filter(battle => 
          battle.battle_format === selectedBattleFormat
        );
      }

      // 検索フィルター（アーカイブバトル用）
      if (searchQuery) {
        battleList = battleList.filter(battle => 
          battle.contestant_a?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          battle.contestant_b?.username?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return battleList;
    } catch (error) {
      console.error('Error in filteredArchivedBattles:', error);
      return [];
    }
  }, [archivedBattles, searchQuery, showMyBattlesOnly, selectedBattleFormat, user]);

  // ページネーション用の計算
  const activeBattlesTotalItems = filteredBattles.length;
  const archivedBattlesTotalItems = filteredArchivedBattles.length;
  
  const activeBattlesTotalPages = Math.ceil(activeBattlesTotalItems / ITEMS_PER_PAGE);
  const archivedBattlesTotalPages = Math.ceil(archivedBattlesTotalItems / ITEMS_PER_PAGE);
  
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  
  const paginatedActiveBattles = filteredBattles.slice(startIndex, endIndex);
  const paginatedArchivedBattles = filteredArchivedBattles.slice(startIndex, endIndex);

  // フィルターが変更されたときにページを1に戻す
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, showMyBattlesOnly, selectedBattleFormat]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // ページ変更時に上部にスクロール
    document.getElementById('active-battles')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-950 py-10">
      <div className="container mx-auto px-4">
        <div className="relative mb-12 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/2034851/pexels-photo-2034851.jpeg?auto=compress&cs=tinysrgb&w=1920')] bg-cover bg-center">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 to-gray-900/90" />
          </div>

          <div className="relative px-8 py-12 md:py-16 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 animate-fade-in">
              {t('battlesPage.welcome.title')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-500">BeatNexus</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8 animate-fade-in-delay-1">
              {t('battlesPage.welcome.subtitle')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-10 animate-fade-in-delay-2">
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
                <Mic className="h-6 w-6 text-cyan-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{totalSubmissionsCount.toLocaleString()}+</div>
                <div className="text-sm text-gray-400">{t('battlesPage.welcome.stats.totalSubmissions')}</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
                <Users className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{communityMembersCount.toLocaleString()}+</div>
                <div className="text-sm text-gray-400">{t('battlesPage.welcome.stats.communityMembers')}</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
                <Play className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{totalVotesCount.toLocaleString()}+</div>
                <div className="text-sm text-gray-400">{t('battlesPage.welcome.stats.votesCast')}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-delay-2">
              <Button
                variant="primary"
                size="lg"
                leftIcon={<Play className="h-5 w-5" />}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full px-10"
                onClick={() => {
                  // 同じページなので何もしない（もしくはスクロール）
                  document.getElementById('active-battles')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {t('battlesPage.welcome.buttons.watchBattles')}
              </Button>
              <Button
                variant="outline"
                size="lg"
                leftIcon={<Mic className="h-5 w-5" />}
                className="border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 rounded-full px-10"
                onClick={handleCreateBattle}
              >
                {t('battlesPage.welcome.buttons.postBeat')}
              </Button>
            </div>

            <div className="mt-6 text-sm text-gray-400 animate-fade-in-delay-2">
              {t('battlesPage.welcome.guide.newHere')}{' '}
              <Link to="/how-to-guide" className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline">
                {t('battlesPage.welcome.guide.checkGuide')}
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:items-start">
          <div className="lg:col-span-3">
            <div id="active-battles" className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white">{t('battlesPage.activeBattles.title')}</h2>
                <p className="text-gray-400 mt-2">{t('battlesPage.activeBattles.subtitle')}</p>
              </div>
              
              <button 
                onClick={handleCreateBattle}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus className="h-5 w-5" />
                {t('battlesPage.activeBattles.createBattleButton')}
              </button>
            </div>

            <BattleFilters
              sortBy={sortBy}
              setSortBy={setSortBy}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              showMyBattlesOnly={showMyBattlesOnly}
              setShowMyBattlesOnly={setShowMyBattlesOnly}
              selectedBattleFormat={selectedBattleFormat}
              setSelectedBattleFormat={setSelectedBattleFormat}
              isLoggedIn={!!user}
            />
            
            <div className="space-y-6">
              {sortBy !== 'completed' ? (
                loading ? (
                  <Card className="bg-gray-900 border border-gray-800 p-8 text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-400">{t('battlesPage.status.loadingBattles')}</p>
                  </Card>
                ) : error ? (
                  <Card className="bg-gray-900 border border-red-500/20 p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                      <Trophy className="h-10 w-10 text-red-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-4">{t('battlesPage.status.errorLoadingBattles')}</h3>
                    <p className="text-gray-400 mb-6">{error}</p>
                    <Button
                      variant="primary"
                      onClick={() => fetchBattles()}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      {t('battlesPage.status.tryAgainButton')}
                    </Button>
                  </Card>
                ) : paginatedActiveBattles.length > 0 ? (
                  <>
                    {paginatedActiveBattles.map(battle => (
                      <BattleCard key={battle.id} battle={battle} />
                    ))}
                    
                    {/* アクティブバトル用のページネーション */}
                    <Pagination
                      currentPage={currentPage}
                      totalPages={activeBattlesTotalPages}
                      onPageChange={handlePageChange}
                      showingCount={ITEMS_PER_PAGE}
                      totalCount={activeBattlesTotalItems}
                      className="mt-8"
                    />
                  </>
                ) : (
                  <Card className="bg-gray-900 border border-gray-800 p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center">
                      <Mic className="h-10 w-10 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-4">{t('battlesPage.status.noBattlesFound')}</h3>
                    <p className="text-gray-400 mb-6">
                      {searchQuery 
                        ? t('battlesPage.status.noBattlesMatchSearch')
                        : loading 
                          ? t('battlesPage.status.loadingBattles')
                          : t('battlesPage.status.beTheFirstToCreate')
                      }
                    </p>
                    <Button
                      variant="primary"
                      className="bg-gradient-to-r from-cyan-500 to-purple-500"
                      onClick={handleCreateBattle}
                    >
                      {t('battlesPage.activeBattles.createBattleButton')}
                    </Button>
                  </Card>
                )
              ) : (
                archiveLoading ? (
                  <Card className="bg-gray-900 border border-gray-800 p-8 text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-400">{t('battlesPage.status.loadingCompletedBattles')}</p>
                  </Card>
                ) : paginatedArchivedBattles.length > 0 ? (
                  <>
                    {paginatedArchivedBattles.map(battle => (
                      <ArchivedBattleCard 
                        key={battle.id} 
                        battle={battle} 
                        userId={user?.id || ''} 
                        onWatchReplay={(b) => navigate(`/battle-replay/${b.id}`)}
                      />
                    ))}
                    
                    {/* アーカイブバトル用のページネーション */}
                    <Pagination
                      currentPage={currentPage}
                      totalPages={archivedBattlesTotalPages}
                      onPageChange={handlePageChange}
                      showingCount={ITEMS_PER_PAGE}
                      totalCount={archivedBattlesTotalItems}
                      className="mt-8"
                    />
                  </>
                ) : (
                  <Card className="bg-gray-900 border border-gray-800 p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center">
                      <Archive className="h-10 w-10 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-4">{t('battlesPage.status.noCompletedBattles')}</h3>
                    <p className="text-gray-400 mb-6">
                      {t('battlesPage.status.checkBackSoonCompleted')}
                    </p>
                  </Card>
                )
              )}
            </div>
          </div>

          <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-8 lg:h-fit lg:max-h-[calc(100vh-6rem)]">
            <Card className="bg-gray-900 border border-gray-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <h2 className="text-lg font-bold text-white">{t('battlesPage.rankings.title')}</h2>
                </div>
                <Link 
                  to="/ranking"
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-sm"
                >
                  {t('battlesPage.rankings.viewFullButton')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {rankingsLoading ? (
                <div className="text-center text-gray-400 py-6">
                  <div className="animate-spin w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-xs">{t('battlesPage.status.loadingRankings')}</p>
                </div>
              ) : topRankings.length > 0 ? (
                <div className="space-y-4">
                  {topRankings.map((entry: RankingEntry, index) => {
                    const getPositionBadge = (position: number) => {
                      switch (position) {
                        case 1:
                          return (
                            <div className="flex items-center justify-center w-8 h-8 bg-yellow-500/20 rounded-full">
                              <Crown className="h-4 w-4 text-yellow-500" />
                            </div>
                          );
                        case 2:
                          return (
                            <div className="flex items-center justify-center w-8 h-8 bg-gray-300/20 rounded-full">
                              <Medal className="h-4 w-4 text-gray-300" />
                            </div>
                          );
                        case 3:
                          return (
                            <div className="flex items-center justify-center w-8 h-8 bg-amber-600/20 rounded-full">
                              <Medal className="h-4 w-4 text-amber-600" />
                            </div>
                          );
                        default:
                          return (
                            <div className="flex items-center justify-center w-8 h-8 bg-gray-800 rounded-full">
                              <span className="text-sm font-bold text-gray-400">{position}</span>
                            </div>
                          );
                      }
                    };

                    const getTierBadge = (rankName: string, rankColor: string) => {
                      const { bgColor, textColor } = getRankColorClasses(rankColor);

                      return (
                        <Badge variant="secondary" className={`${bgColor} ${textColor} text-xs px-2 py-1 font-medium`}>
                          {rankName}
                        </Badge>
                      );
                    };

                    return (
                      <Link 
                        key={entry.user_id}
                        to={`/profile/${entry.user_id}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors group"
                      >
                        <div className="flex items-center justify-center">
                          {getPositionBadge(entry.position)}
                        </div>
                        
                        <img
                          src={entry.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user_id}`}
                          alt={entry.username}
                          className="w-10 h-10 rounded-lg object-cover border border-gray-700 group-hover:border-cyan-500/50 transition-colors"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white group-hover:text-cyan-400 transition-colors truncate">
                            {entry.username}
                          </div>
                          <div className="flex gap-2 mt-1">
                            {getTierBadge(entry.rank_name, entry.rank_color)}
                            <Badge
                              variant="secondary"
                              className="bg-cyan-500/20 text-cyan-300 text-xs"
                            >
                              {entry.season_points}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                    <Users className="h-8 w-8 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{t('latestBattles.ranking.noRankings.title')}</h3>
                  <p className="text-gray-400 text-sm">{t('battlesPage.status.noRankingsAvailable')}</p>
                </div>
              )}
            </Card>

            {/* How-to Guide Card */}
            <Card className="bg-gray-900 border border-gray-800 p-5 hover:border-gray-700 transition-all duration-300">
              <div className="text-center">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-md font-semibold text-white mb-2">
                  {t('battlesPage.howTo.title')}
                </h3>
                <p className="text-gray-300 text-xs mb-3">
                  {t('battlesPage.howTo.description')}
                </p>
                <Link 
                  to="/how-to-guide"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg text-white text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  <BookOpen className="h-3 w-3" />
                  {t('battlesPage.howTo.button')}
                </Link>
              </div>
            </Card>
          </aside>
        </div>
      </div>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode="login" 
        setMode={() => {}}
      />
    </div>
  );
};

export default BattlesPage;