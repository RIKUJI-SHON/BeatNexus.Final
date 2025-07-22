import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trophy, Crown, ArrowRight, Play, Mic, Users, Archive, Medal, Star } from 'lucide-react';
import beatnexusWordmark from '../assets/images/BEATNEXUS-WORDMARK.png';
import heroBackground from '../assets/images/hero-background.png';
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
import { RankingEntry } from '../types';
import { useTranslation } from 'react-i18next';
import { getRankColorClasses } from '../utils/rankUtils';
import { useOnboardingStore } from '../store/onboardingStore';
import { MonthlyLimitCard } from '../components/ui/SubmissionCooldownCard';
import { TabbedRanking } from '../components/ui/TabbedRanking';
import NewsSidebar from '../components/ui/NewsSidebar';

const BattlesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'trending' | 'ending' | 'completed' | null>('trending');
  const [showMyBattlesOnly, setShowMyBattlesOnly] = useState(false);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { setOnboardingModalOpen } = useOnboardingStore();
  
  // ページネーション関連の状態
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10; // 1ページあたりの表示件数
  
  const { battles, activeBattles, archivedBattles, archivedBattlesCount, communityMembersCount, totalVotesCount, totalSubmissionsCount, loading, archiveLoading, error, fetchBattles, fetchArchivedBattles, fetchArchivedBattlesCount, fetchCommunityMembersCount, fetchTotalVotesCount, fetchTotalSubmissionsCount } = useBattleStore();
  const { rankings, loading: rankingsLoading, fetchRankings } = useRankingStore();
  const { user } = useAuthStore();
  
  // Get top 10 rankings safely (not used, TabbedRanking handles its own limit)
  const topRankings = rankings?.slice(0, 10) || [];

  useEffect(() => {
    const initializeData = async () => {
    try {
        await fetchBattles();
        await fetchRankings();
        await fetchArchivedBattles();
        await fetchArchivedBattlesCount();
        await fetchCommunityMembersCount();
        await fetchTotalVotesCount();
        await fetchTotalSubmissionsCount();
        
        // リアルタイム機能は廃止しました（UX改善のため）
    } catch (error) {
      console.error('Error in useEffect:', error);
    }
    };
    
    initializeData();
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
      // 完了済みフィルターの場合は空の配列を返す（archived_battlesを使用するため）
      if (sortBy === 'completed') {
        return [];
      }

      let battleList = [...(battles || [])];

      // MY BATTLES フィルター
      if (showMyBattlesOnly && user) {
        battleList = battleList.filter(battle => {
          // battleStoreで設定されるcontestant_a_id/contestant_b_idを使用
          const battleWithIds = battle as any;
          return battleWithIds.contestant_a_id === user.id || battleWithIds.contestant_b_id === user.id;
        });
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
        case null:
        default:
          // フィルターが外れている場合はtrending順（人気順）
          return battleList.sort((a, b) => 
            ((b.votes_a || 0) + (b.votes_b || 0)) - ((a.votes_a || 0) + (a.votes_b || 0))
          );
      }
    } catch (error) {
      console.error('Error in filteredBattles:', error);
      return [];
    }
  }, [battles, sortBy, searchQuery, showMyBattlesOnly, user]);

  const filteredArchivedBattles = useMemo(() => {
    try {
      let battleList = [...(archivedBattles || [])];

      // MY BATTLES フィルター（アーカイブバトル用）
      if (showMyBattlesOnly && user) {
        battleList = battleList.filter(battle => 
          battle.player1_user_id === user.id || battle.player2_user_id === user.id
        );
      }

      // 検索フィルター（アーカイブバトル用）
      if (searchQuery) {
        battleList = battleList.filter(battle => 
          battle.contestant_a?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          battle.contestant_b?.username?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // 完了済みフィルターが選択されている場合のソート
      if (sortBy === 'completed') {
        return battleList.sort((a, b) => {
          const aTime = a.archived_at ? new Date(a.archived_at).getTime() : 0;
          const bTime = b.archived_at ? new Date(b.archived_at).getTime() : 0;
          return bTime - aTime; // 新しい順（最近完了した順）
        });
      }

      // 通常のアーカイブ表示の場合はそのまま返す（archived_atの降順でソート済み）
      return battleList.sort((a, b) => {
        const aTime = a.archived_at ? new Date(a.archived_at).getTime() : 0;
        const bTime = b.archived_at ? new Date(b.archived_at).getTime() : 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('Error in filteredArchivedBattles:', error);
      return [];
    }
  }, [archivedBattles, searchQuery, showMyBattlesOnly, user, sortBy]);

  // ページネーション用の計算
  const activeBattlesTotalItems = sortBy === 'completed' ? 0 : filteredBattles.length;
  const archivedBattlesTotalItems = filteredArchivedBattles.length;
  
  const activeBattlesTotalPages = Math.ceil(activeBattlesTotalItems / ITEMS_PER_PAGE);
  const archivedBattlesTotalPages = Math.ceil(archivedBattlesTotalItems / ITEMS_PER_PAGE);
  
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  
  const paginatedActiveBattles = sortBy === 'completed' ? [] : filteredBattles.slice(startIndex, endIndex);
  const paginatedArchivedBattles = filteredArchivedBattles.slice(startIndex, endIndex);

  // フィルターが変更されたときにページを1に戻す
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, showMyBattlesOnly]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // ページ変更時に上部にスクロール
    document.getElementById('active-battles')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-950 py-10">
      <div className="container-ultra-wide">
        {/* Welcome Area - Enhanced Design */}
        <section className="relative mb-8 overflow-hidden rounded-2xl border border-gray-700/50">
          {/* Background Image */}
          <div className="absolute inset-0">
            {/* 背景画像 - ホーム画面と同じ画像を使用 */}
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${heroBackground})` }}>
              {/* フォールバック: オンライン画像（開発用） */}
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat [background-image:var(--fallback-bg)]"></div>
              
              {/* グラデーションオーバーレイで可読性を確保 */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/85 to-gray-950/90"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 via-transparent to-gray-900/40"></div>
            </div>
          </div>

          {/* Enhanced Background Effects */}
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-yellow-500/5 rounded-full blur-3xl"></div>
          </div>

          <div className="relative px-6 py-10 text-center z-10">
            {/* Welcome Title - BEATNEXUS Wordmark */}
            <div className="mb-4 animate-fade-in relative">
              <div className="relative group">
                {/* Glow Effect Background */}
                <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                  <img 
                    src={beatnexusWordmark} 
                    alt=""
                    className="mx-auto max-w-xs sm:max-w-sm md:max-w-md h-auto blur-sm scale-110 filter brightness-150"
                  />
                </div>
                
                {/* Main Wordmark */}
                <img 
                  src={beatnexusWordmark} 
                  alt="BEATNEXUS"
                  className="relative mx-auto max-w-xs sm:max-w-sm md:max-w-md h-auto drop-shadow-2xl group-hover:scale-105 transition-all duration-500 filter group-hover:brightness-110"
                />
              </div>
            </div>
            
            {/* Enhanced Stats Grid - Hidden on mobile */}
            {/* 統計カード（投稿動画数・コミュニティメンバー・総投票数）を削除 */}
            
            {/* Guide Link */}
            <div className="text-xs text-gray-400 animate-fade-in-delay-3">
              {t('battlesPage.welcome.guide.newHere')}{' '}
              <button 
                onClick={() => setOnboardingModalOpen(true)}
                className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline transition-colors"
              >
                {t('battlesPage.welcome.guide.checkGuide')}
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left Sidebar - ニュース */}
          <aside className="lg:col-span-1 space-y-6 sticky-sidebar hidden lg:block">
              <NewsSidebar />
          </aside>

          {/* Main Content */}
          <div className={user ? 'lg:col-span-3' : 'lg:col-span-3'}>
            <BattleFilters
              sortBy={sortBy}
              setSortBy={setSortBy}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              showMyBattlesOnly={showMyBattlesOnly}
              setShowMyBattlesOnly={setShowMyBattlesOnly}
              isLoggedIn={!!user}
            />
            
            <div className="space-y-6 mt-8">
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
                  <div className={`
                    flex flex-col items-center justify-center
                    py-16 px-8 text-center
                    bg-gradient-to-br from-slate-800/40 to-slate-700/30
                    rounded-xl border border-slate-600/30
                  `}>
                    {/* アイコン */}
                    <div className="relative mb-6">
                      <div className="w-24 h-24 bg-gradient-to-br from-slate-700/60 to-slate-600/40 rounded-2xl flex items-center justify-center border border-slate-500/30">
                        <Mic className="w-12 h-12 text-slate-400" />
                      </div>
                      
                      {/* 装飾的なグロー効果 */}
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-slate-600/10 rounded-2xl blur-xl opacity-50" />
                    </div>

                    {/* メッセージ */}
                    <div className="space-y-4 max-w-md">
                      <h3 className="text-xl font-semibold text-slate-200">
                        {t('battlesPage.status.noBattlesFound')}
                      </h3>
                      
                      <p className="text-slate-400 text-sm leading-relaxed">
                        {searchQuery 
                          ? t('battlesPage.status.noBattlesMatchSearch')
                          : loading 
                            ? t('battlesPage.status.loadingBattles')
                            : t('battlesPage.status.beTheFirstToCreate')
                        }
                      </p>
                      
                      {/* ヒント */}
                      <div className="mt-6 p-4 bg-slate-800/60 rounded-lg border border-slate-600/40">
                        <p className="text-cyan-300 text-xs font-medium flex items-center justify-center gap-2">
                          <Mic className="w-4 h-4" />
                          新しいバトルを作成して、コミュニティを盛り上げよう！
                        </p>
                      </div>
                    </div>

                    {/* 装飾的なパーティクル */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className="absolute top-10 left-10 w-2 h-2 bg-cyan-400/20 rounded-full animate-pulse" />
                      <div className="absolute top-20 right-16 w-1 h-1 bg-purple-400/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                      <div className="absolute bottom-16 left-20 w-1.5 h-1.5 bg-amber-400/20 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
                      <div className="absolute bottom-10 right-10 w-2 h-2 bg-pink-400/20 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                    </div>

                    <Button
                      variant="primary"
                      className="bg-gradient-to-r from-cyan-500 to-purple-500 mt-6"
                      onClick={handleCreateBattle}
                    >
                      {t('battlesPage.activeBattles.createBattleButton')}
                    </Button>
                  </div>
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
                  <div className={`
                    flex flex-col items-center justify-center
                    py-16 px-8 text-center
                    bg-gradient-to-br from-slate-800/40 to-slate-700/30
                    rounded-xl border border-slate-600/30
                  `}>
                    {/* アイコン */}
                    <div className="relative mb-6">
                      <div className="w-24 h-24 bg-gradient-to-br from-slate-700/60 to-slate-600/40 rounded-2xl flex items-center justify-center border border-slate-500/30">
                        <Archive className="w-12 h-12 text-slate-400" />
                      </div>
                      
                      {/* 装飾的なグロー効果 */}
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-slate-600/10 rounded-2xl blur-xl opacity-50" />
                    </div>

                    {/* メッセージ */}
                    <div className="space-y-4 max-w-md">
                      <h3 className="text-xl font-semibold text-slate-200">
                        {t('battlesPage.status.noCompletedBattles')}
                      </h3>
                      
                      <p className="text-slate-400 text-sm leading-relaxed">
                        {t('battlesPage.status.checkBackSoonCompleted')}
                      </p>
                      
                      {/* ヒント */}
                      <div className="mt-6 p-4 bg-slate-800/60 rounded-lg border border-slate-600/40">
                        <p className="text-cyan-300 text-xs font-medium flex items-center justify-center gap-2">
                          <Archive className="w-4 h-4" />
                          完了したバトルがここに表示されます
                        </p>
                      </div>
                    </div>

                    {/* 装飾的なパーティクル */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className="absolute top-10 left-10 w-2 h-2 bg-cyan-400/20 rounded-full animate-pulse" />
                      <div className="absolute top-20 right-16 w-1 h-1 bg-purple-400/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                      <div className="absolute bottom-16 left-20 w-1.5 h-1.5 bg-amber-400/20 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
                      <div className="absolute bottom-10 right-10 w-2 h-2 bg-pink-400/20 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <aside className="lg:col-span-1 space-y-6 sticky-sidebar-extended hidden lg:block">
            
            {/* Top Rankings with Tabs */}
            <TabbedRanking 
              maxItems={5}
              showViewAllButton={true}
            />

            {/* Monthly Limit Card - ランキングの下に配置 */}
            {user && (
              <div className="w-full hidden lg:block">
                <MonthlyLimitCard />
              </div>
            )}

          </aside>
        </div>

      </div>
      
      {/* Mobile Rankings - モバイル版でのみ表示 */}
      <div className="lg:hidden mt-8 w-full">
        <div className="w-full px-4 sm:px-6">
          <TabbedRanking 
            maxItems={5}
            showViewAllButton={true}
          />
        </div>
      </div>
      
      {/* Mobile News Sidebar - モバイル版でのみ表示 */}
      <div className="lg:hidden mt-6 w-full">
        <div className="w-full px-4 sm:px-6">
          <NewsSidebar />
        </div>
      </div>
      
      {/* Mobile Monthly Limit Card - モバイル版でのみ表示、コンテナの外に配置 */}
      {user && (
        <div className="lg:hidden mt-6 w-full">
          <div className="w-full px-4 sm:px-6">
            <MonthlyLimitCard />
          </div>
        </div>
      )}
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