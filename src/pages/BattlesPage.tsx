import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trophy, Crown, ArrowRight, Play, Mic, Users, Archive, BookOpen, Medal, Star, Video } from 'lucide-react';
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
          battle.player1_user_id === user.id || battle.player2_user_id === user.id
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
            .filter(battle => battle.status === 'COMPLETED')
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
        {/* Welcome Area - Enhanced Design */}
        <section className="relative mb-12 overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            {/* 背景画像 - ホーム画面と同じ画像を使用 */}
            <div className="absolute inset-0 bg-[url('/images/hero-background.png')] bg-cover bg-center bg-no-repeat">
              {/* フォールバック: オンライン画像（開発用） */}
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat [background-image:var(--fallback-bg)]"></div>
              
              {/* グラデーションオーバーレイで可読性を確保 */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/85 to-gray-950/90"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 via-transparent to-gray-900/40"></div>
            </div>
          </div>

          {/* Enhanced Background Effects */}
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl"></div>
          </div>

          <div className="relative px-8 py-16 md:py-20 text-center z-10">
            {/* Welcome Title - BEATNEXUS Wordmark */}
            <div className="mb-6 animate-fade-in relative">
              <div className="relative group">
                {/* Glow Effect Background */}
                <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-500">
                  <img 
                    src="/images/BEATNEXUS-WORDMARK.png" 
                    alt=""
                    className="mx-auto max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg h-auto blur-md scale-110 filter brightness-150"
                  />
                </div>
                
                {/* Main Wordmark */}
                <img 
                  src="/images/BEATNEXUS-WORDMARK.png" 
                  alt="BEATNEXUS"
                  className="relative mx-auto max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg h-auto drop-shadow-2xl group-hover:scale-105 transition-all duration-500 filter group-hover:brightness-110"
                />
              </div>
            </div>
            


            {/* Enhanced Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12 animate-fade-in-delay-2">
              {/* Total Submissions */}
              <Card className="group relative bg-gradient-to-br from-gray-900 via-gray-850 to-gray-950 border border-gray-700/50 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-500 rounded-xl overflow-hidden backdrop-blur-sm p-6">
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
                </div>
                <div className="relative text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/40 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Mic className="h-8 w-8 text-cyan-400" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-2">
                    {totalSubmissionsCount.toLocaleString()}+
                  </div>
                  <div className="text-sm text-gray-400 font-medium">{t('battlesPage.welcome.stats.totalSubmissions')}</div>
                </div>
              </Card>

              {/* Community Members */}
              <Card className="group relative bg-gradient-to-br from-gray-900 via-gray-850 to-gray-950 border border-gray-700/50 shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 rounded-xl overflow-hidden backdrop-blur-sm p-6">
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
                </div>
                <div className="relative text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/40 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-8 w-8 text-purple-400" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
                    {communityMembersCount.toLocaleString()}+
                  </div>
                  <div className="text-sm text-gray-400 font-medium">{t('battlesPage.welcome.stats.communityMembers')}</div>
                </div>
              </Card>

              {/* Votes Cast */}
              <Card className="group relative bg-gradient-to-br from-gray-900 via-gray-850 to-gray-950 border border-gray-700/50 shadow-xl hover:shadow-2xl hover:shadow-yellow-500/10 transition-all duration-500 rounded-xl overflow-hidden backdrop-blur-sm p-6">
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
                </div>
                <div className="relative text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/40 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Play className="h-8 w-8 text-yellow-400" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-2">
                    {totalVotesCount.toLocaleString()}+
                  </div>
                  <div className="text-sm text-gray-400 font-medium">{t('battlesPage.welcome.stats.votesCast')}</div>
                </div>
              </Card>
            </div>



            {/* Guide Link */}
            <div className="text-sm text-gray-400 animate-fade-in-delay-3">
              {t('battlesPage.welcome.guide.newHere')}{' '}
              <Link to="/how-to-guide" className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline transition-colors">
                {t('battlesPage.welcome.guide.checkGuide')}
              </Link>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:items-start">
          <div className="lg:col-span-3">
            <div id="active-battles" className="relative mb-12">
              {/* 背景グラデーション効果 */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-pink-500/5 rounded-3xl blur-xl"></div>
              
              <div className="relative bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl border border-cyan-500/30">
                        <Play className="h-8 w-8 text-cyan-400" />
                      </div>
              <div>
                        <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                          {t('battlesPage.activeBattles.title')}
                        </h2>
                        <div className="w-20 h-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full mt-2"></div>
                      </div>
                    </div>
                    <p className="text-gray-300 text-lg leading-relaxed">{t('battlesPage.activeBattles.subtitle')}</p>
              </div>
              
                  <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={handleCreateBattle}
                      className="group relative overflow-hidden px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl text-white font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/25"
              >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                <Plus className="h-5 w-5" />
                        </div>
                {t('battlesPage.activeBattles.createBattleButton')}
                      </div>
              </button>
                  </div>
                </div>
              </div>
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

          <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-8 lg:h-fit">
            
            {/* Top Rankings Widget - Enhanced Design */}
            <Card className="group relative bg-gradient-to-br from-gray-900 via-gray-850 to-gray-950 border border-gray-700/50 shadow-xl hover:shadow-2xl hover:shadow-yellow-500/10 transition-all duration-500 rounded-xl overflow-hidden backdrop-blur-sm">
              
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
              </div>

              <div className="relative p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30 backdrop-blur-sm">
                      <Trophy className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                        {t('battlesPage.rankings.title')}
                      </h2>
                      <div className="w-12 h-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
                    </div>
                  </div>
                  <Link 
                    to="/ranking"
                    className="group/link flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 transition-all duration-300 backdrop-blur-sm"
                  >
                    <span className="text-sm font-medium">{t('battlesPage.rankings.viewFullButton')}</span>
                    <ArrowRight className="h-3 w-3 group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* Rankings Content */}
                {rankingsLoading ? (
                  <div className="text-center text-gray-400 py-6">
                    <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p className="text-sm">{t('battlesPage.status.loadingRankings')}</p>
                  </div>
                ) : topRankings.length > 0 ? (
                  <div className="space-y-3">
                    {topRankings.map((entry: RankingEntry, index) => {
                      const getPositionBadge = (position: number) => {
                        switch (position) {
                          case 1:
                            return (
                              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl border border-yellow-500/40">
                                <Crown className="h-5 w-5 text-yellow-400" />
                              </div>
                            );
                          case 2:
                            return (
                              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-gray-400/20 to-gray-300/20 rounded-xl border border-gray-400/40">
                                <Medal className="h-5 w-5 text-gray-300" />
                              </div>
                            );
                          case 3:
                            return (
                              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-xl border border-amber-600/40">
                                <Medal className="h-5 w-5 text-amber-500" />
                              </div>
                            );
                          default:
                            return (
                              <div className="flex items-center justify-center w-10 h-10 bg-gray-800/80 rounded-xl border border-gray-700/50">
                                <span className="text-sm font-bold text-gray-400">{position}</span>
                              </div>
                            );
                        }
                      };

                      const getRatingWithRankColor = (rating: number, rankColor: string) => {
                        console.log('Rating:', rating, 'Rank Color:', rankColor);
                        
                        // 直接的な色指定でランクカラーをマッピング
                        let colorClass = '';
                        switch (rankColor) {
                          case 'rainbow':
                            colorClass = 'text-purple-400';
                            break;
                          case 'purple':
                            colorClass = 'text-purple-400';
                            break;
                          case 'blue':
                            colorClass = 'text-blue-400';
                            break;
                          case 'green':
                            colorClass = 'text-green-400';
                            break;
                          case 'yellow':
                            colorClass = 'text-yellow-400';
                            break;
                          case 'gray':
                            colorClass = 'text-gray-400';
                            break;
                          default:
                            colorClass = 'text-white';
                        }
                        
                        return (
                          <span className={`text-sm font-bold ${colorClass}`}>
                            {rating}
                          </span>
                        );
                      };

                      return (
                        <Link 
                          key={entry.user_id}
                          to={`/profile/${entry.user_id}`}
                          className="group/player flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-800/60 to-gray-700/60 border border-gray-700/50 hover:border-cyan-500/50 hover:bg-gradient-to-r hover:from-gray-800/80 hover:to-gray-700/80 transition-all duration-300 backdrop-blur-sm"
                        >
                          {getPositionBadge(entry.position)}
                          
                          <div className="relative">
                            <img
                              src={entry.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user_id}`}
                              alt={entry.username}
                              className="w-12 h-12 rounded-xl object-cover border-2 border-gray-600/50 group-hover/player:border-cyan-500/70 transition-all duration-300"
                            />
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/0 to-purple-500/0 group-hover/player:from-cyan-500/20 group-hover/player:to-purple-500/20 transition-all duration-300"></div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white group-hover/player:text-transparent group-hover/player:bg-clip-text group-hover/player:bg-gradient-to-r group-hover/player:from-cyan-400 group-hover/player:to-purple-400 transition-all duration-300 truncate text-sm">
                              {entry.username}
                            </div>
                            <div className="mt-1.5">
                              {getRatingWithRankColor(entry.season_points, entry.rank_color)}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-r from-gray-800/60 to-gray-700/60 border border-gray-700/50 flex items-center justify-center">
                      <Users className="h-8 w-8 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{t('latestBattles.ranking.noRankings.title')}</h3>
                    <p className="text-gray-400 text-sm">{t('battlesPage.status.noRankingsAvailable')}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* How to Guide Widget - Enhanced Design */}
            <Card className="group relative bg-gradient-to-br from-gray-900 via-gray-850 to-gray-950 border border-gray-700/50 shadow-xl hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-500 rounded-xl overflow-hidden backdrop-blur-sm">
              
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
              </div>

              <div className="relative p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl border border-green-500/30 backdrop-blur-sm">
                    <BookOpen className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400">
                      {t('battlesPage.howTo.title')}
                    </h2>
                    <div className="w-12 h-0.5 bg-gradient-to-r from-green-500 to-blue-500 rounded-full"></div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  {t('battlesPage.howTo.description')}
                </p>

                {/* Features Grid */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                    <div className="p-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg">
                      <Video className="h-4 w-4 text-cyan-400" />
                    </div>
                    <span className="text-sm text-gray-300 font-medium">Post Battle Videos</span>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <div className="p-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg">
                      <Star className="h-4 w-4 text-purple-400" />
                    </div>
                    <span className="text-sm text-gray-300 font-medium">Vote & Get Ranked</span>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                    <div className="p-1.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg">
                      <Trophy className="h-4 w-4 text-yellow-400" />
                    </div>
                    <span className="text-sm text-gray-300 font-medium">Climb Leaderboards</span>
                  </div>
                </div>

                {/* CTA Button */}
                <Link 
                  to="/how-to-guide"
                  className="group/button block w-full overflow-hidden px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl text-white font-bold text-center hover:scale-[1.02] hover:shadow-xl hover:shadow-green-500/25 transition-all duration-300"
                >
                  <div className="relative flex items-center justify-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-sm">{t('battlesPage.howTo.button')}</span>
                  </div>
                  
                  {/* Button glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-green-500/20 to-blue-500/0 opacity-0 group-hover/button:opacity-100 transition-opacity duration-300"></div>
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