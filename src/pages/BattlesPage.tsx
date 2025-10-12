import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Mic, Archive } from 'lucide-react';
import { BattleCard } from '../components/battle/BattleCard';
import { AdSlot } from '../components/ads/AdSlot';
import { injectAdSlots, isAdSlotPlaceholder, generateBattleAdRules, generateArchivedBattleAdRules } from '../utils/injectAdSlots';
import { ArchivedBattleCard } from '../components/battle/ArchivedBattleCard';
import { BattleFilters, BattleFilterActions, BattleFilterStat, BattleSortKey } from '../components/battle/BattleFilters';
import { Pagination } from '../components/ui/Pagination';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { AuthModal } from '../components/auth/AuthModal';
import { useRankingStore } from '../store/rankingStore';
import { useBattleStore } from '../store/battleStore';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from 'react-i18next';
import { UserInfoCard } from '../components/ui/UserInfoCard';
import { TabbedRanking } from '../components/ui/TabbedRanking';

import GuideHeroSection from '../components/battle/GuideHeroSection';
import NewsSidebar from '../components/battle/NewsSidebar';
import { BattleFormat } from '../types';
import { useNews } from '../hooks/useNews';
import { MobileNewsDrawer } from '../components/battle/MobileNewsDrawer';

const DEFAULT_SORT: BattleSortKey = 'trending';
const DEFAULT_BATTLE_FORMAT = 'ALL' as const;

const BattlesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<BattleSortKey>(DEFAULT_SORT);
  const [showMyBattlesOnly, setShowMyBattlesOnly] = useState(false);
  const [showUnvotedOnly, setShowUnvotedOnly] = useState(false); // 新規: 未投票のみ表示
  const [showCompletedBattles, setShowCompletedBattles] = useState(false); // 新規: 完了済み表示トグル
  const [battleFormatFilter, setBattleFormatFilter] = useState<'ALL' | BattleFormat>(DEFAULT_BATTLE_FORMAT);
  const [isSwitchingBattleType, setIsSwitchingBattleType] = useState(false); // バトルタイプ切り替え時のローディング

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  // const { setOnboardingModalOpen } = useOnboardingStore(); // 未使用のため一旦コメントアウト（再利用時に復活）
  
  // ページネーション関連の状態
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10; // 1ページあたりの表示件数
  
  const { battles, archivedBattles, loading, archiveLoading, error, fetchBattles, fetchArchivedBattles } = useBattleStore();
  const { fetchRankings, currentSeason, fetchSeasons } = useRankingStore();
  const { user } = useAuthStore();
  const newsState = useNews({ limit: 8 });
  
  // TabbedRanking handles its own limit

  const setCompletedWithTransition = useCallback((value: boolean) => {
    setShowCompletedBattles((previous) => {
      if (previous === value) {
        return previous;
      }
      setIsSwitchingBattleType(true);
      return value;
    });
  }, [setIsSwitchingBattleType, setShowCompletedBattles]);

  const handleResetFilters = useCallback(() => {
    setSortBy(DEFAULT_SORT);
    setSearchQuery('');
    setShowMyBattlesOnly(false);
    setShowUnvotedOnly(false);
    setBattleFormatFilter(DEFAULT_BATTLE_FORMAT);
    if (showCompletedBattles) {
      setCompletedWithTransition(false);
    }
  }, [setBattleFormatFilter, setCompletedWithTransition, setSearchQuery, setShowMyBattlesOnly, setShowUnvotedOnly, setSortBy, showCompletedBattles]);

  const numberFormatter = useMemo(() => new Intl.NumberFormat(), []);

  const filterStats = useMemo<BattleFilterStat[]>(() => {
    const activeBattlesCount = battles?.length ?? 0;
    const archivedBattlesCount = archivedBattles?.length ?? 0;
    const totalBattles = activeBattlesCount + archivedBattlesCount;

    const activeHotCount = (battles ?? []).filter((battle) => {
      const totalVotes = (battle.votes_a ?? 0) + (battle.votes_b ?? 0);
      return totalVotes >= 5;
    }).length;

    const archivedHotCount = (archivedBattles ?? []).filter((battle) => {
      const totalVotes = (battle.final_votes_a ?? 0) + (battle.final_votes_b ?? 0);
      return totalVotes >= 5;
    }).length;

    const uniqueProducers = new Set<string>();
    (battles ?? []).forEach((battle) => {
      if (battle.contestant_a_id) {
        uniqueProducers.add(battle.contestant_a_id);
      }
      if (battle.contestant_b_id) {
        uniqueProducers.add(battle.contestant_b_id);
      }
    });
    (archivedBattles ?? []).forEach((battle) => {
      if (battle.player1_user_id) {
        uniqueProducers.add(battle.player1_user_id);
      }
      if (battle.player2_user_id) {
        uniqueProducers.add(battle.player2_user_id);
      }
    });

    const activeStats: BattleFilterStat[] = [
      {
        value: numberFormatter.format(activeHotCount),
        label: t('battleFilters.stats.hottest', 'Battles On Fire'),
        accent: 'fire',
      },
      {
        value: numberFormatter.format(activeBattlesCount),
        label: t('battleFilters.stats.active', 'Active Battles'),
        accent: 'aqua',
      },
      {
        value: numberFormatter.format(totalBattles),
        label: t('battleFilters.stats.total', 'Total Battles'),
        accent: 'emerald',
      },
      {
        value: numberFormatter.format(uniqueProducers.size),
        label: t('battleFilters.stats.producers', 'Producers Competing'),
        accent: 'violet',
      },
    ];

    const archivedStats: BattleFilterStat[] = [
      {
        value: numberFormatter.format(archivedHotCount),
        label: t('battleFilters.stats.hottest', 'Battles On Fire'),
        accent: 'fire',
      },
      {
        value: numberFormatter.format(archivedBattlesCount),
        label: t('battleFilters.stats.archived', 'Archived Battles'),
        accent: 'aqua',
      },
      {
        value: numberFormatter.format(totalBattles),
        label: t('battleFilters.stats.total', 'Total Battles'),
        accent: 'emerald',
      },
      {
        value: numberFormatter.format(uniqueProducers.size),
        label: t('battleFilters.stats.producers', 'Producers Competing'),
        accent: 'violet',
      },
    ];

    return showCompletedBattles ? archivedStats : activeStats;
  }, [archivedBattles, battles, numberFormatter, showCompletedBattles, t]);

  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([
          fetchSeasons(),
          fetchBattles(),
          fetchRankings(),
          fetchArchivedBattles(),
        ]);
        // リアルタイム機能は廃止しました（UX改善のため）
      } catch (error) {
        console.error('Error in initializeData:', error);
      }
    };
    initializeData();
  }, [fetchSeasons, fetchBattles, fetchRankings, fetchArchivedBattles]);

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

      if (battleFormatFilter !== 'ALL') {
        battleList = battleList.filter((battle) => battle.battle_format === battleFormatFilter);
      }

      // MY BATTLES フィルター
      if (showMyBattlesOnly && user) {
        battleList = battleList.filter(battle =>
          battle.contestant_a_id === user.id || battle.contestant_b_id === user.id
        );
      }

      // 未投票フィルター（ログイン時のみ有効） current_user_voted が true でないものを残す
      if (showUnvotedOnly && user) {
        battleList = battleList.filter(battle => battle.current_user_voted !== true);
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
        case 'oldest':
          return battleList.sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return aTime - bTime;
          });
        case 'trending':
        case null:
        default:
          // デフォルトは投票数の多いバトル順
          return battleList.sort(
            (a, b) => ((b.votes_a || 0) + (b.votes_b || 0)) - ((a.votes_a || 0) + (a.votes_b || 0))
          );
      }
    } catch (error) {
      console.error('Error in filteredBattles:', error);
      return [];
    }
  }, [battles, sortBy, searchQuery, showMyBattlesOnly, showUnvotedOnly, user, battleFormatFilter]);

  // アクティブシーズンが無い場合、最新の終了シーズンのアーカイブのみを投票数順で表示する
  const filteredArchivedBattles = useMemo(() => {
    try {
      let battleList = [...(archivedBattles || [])];

      if (battleFormatFilter !== 'ALL') {
        battleList = battleList.filter((battle) => battle.battle_format === battleFormatFilter);
      }

      // アクティブシーズンがない場合は、シーズンに関係なく投票総数の降順で表示
      if (!currentSeason) {
        // シーズンなしの場合も sortBy に応じて切替
        if (sortBy === 'trending') {
          return battleList.sort((a, b) => ((b.final_votes_a || 0) + (b.final_votes_b || 0)) - ((a.final_votes_a || 0) + (a.final_votes_b || 0)));
        }
        if (sortBy === 'oldest') {
          return battleList.sort((a, b) => {
            const aTime = a.archived_at ? new Date(a.archived_at).getTime() : 0;
            const bTime = b.archived_at ? new Date(b.archived_at).getTime() : 0;
            return aTime - bTime;
          });
        }
        // recent or default: 新しいアーカイブ順（降順）
        return battleList.sort((a, b) => {
          const aTime = a.archived_at ? new Date(a.archived_at).getTime() : 0;
          const bTime = b.archived_at ? new Date(b.archived_at).getTime() : 0;
          return bTime - aTime;
        });
      }

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

      if (sortBy === 'trending') {
        return battleList.sort((a, b) => ((b.final_votes_a || 0) + (b.final_votes_b || 0)) - ((a.final_votes_a || 0) + (a.final_votes_b || 0)));
      }
      if (sortBy === 'oldest') {
        return battleList.sort((a, b) => {
          const aTime = a.archived_at ? new Date(a.archived_at).getTime() : 0;
          const bTime = b.archived_at ? new Date(b.archived_at).getTime() : 0;
          return aTime - bTime;
        });
      }
      // recent or default
      return battleList.sort((a, b) => {
        const aTime = a.archived_at ? new Date(a.archived_at).getTime() : 0;
        const bTime = b.archived_at ? new Date(b.archived_at).getTime() : 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('Error in filteredArchivedBattles:', error);
      return [];
    }
  }, [archivedBattles, searchQuery, showMyBattlesOnly, user, currentSeason, sortBy, battleFormatFilter]);

  // ページネーション用の計算
  const activeBattlesTotalItems = showCompletedBattles ? 0 : filteredBattles.length;
  const archivedBattlesTotalItems = filteredArchivedBattles.length;
  
  const activeBattlesTotalPages = Math.ceil(activeBattlesTotalItems / ITEMS_PER_PAGE);
  const archivedBattlesTotalPages = Math.ceil(archivedBattlesTotalItems / ITEMS_PER_PAGE);
  
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  
  const paginatedActiveBattles = useMemo(
    () => (showCompletedBattles ? [] : filteredBattles.slice(startIndex, endIndex)),
    [filteredBattles, startIndex, endIndex, showCompletedBattles]
  );
  // ページ内リストへ広告プレースホルダ挿入 (3件ごと) - 配置キー仕様書 27.1
  const battlesWithAds = useMemo(() => {
  if (showCompletedBattles) return [];
    
    // 3件ごとに広告を挿入するルールを動的生成 (実際の件数まで)
    const adRules = generateBattleAdRules(paginatedActiveBattles.length);
    
    return injectAdSlots(paginatedActiveBattles, adRules);
  }, [paginatedActiveBattles, showCompletedBattles]);
  const paginatedArchivedBattles = filteredArchivedBattles.slice(startIndex, endIndex);
  const archivedWithAds = useMemo(() => {
    const rules = generateArchivedBattleAdRules(paginatedArchivedBattles.length);
    return injectAdSlots(paginatedArchivedBattles, rules);
  }, [paginatedArchivedBattles]);

  // 今週のピックアップ（過去7日間のアーカイブから最多投票1件）
  const weeklyPickupBattle = useMemo(() => {
    try {
      if (!archivedBattles || archivedBattles.length === 0) return null;
      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const cutoff = now - sevenDaysMs;
      const recent = archivedBattles.filter((b) => {
        const ts = b.archived_at ? new Date(b.archived_at).getTime() : 0;
        return ts >= cutoff;
      });
      if (recent.length === 0) return null;
      const sorted = recent.sort((a, b) => {
        const aVotes = (a.final_votes_a || 0) + (a.final_votes_b || 0);
        const bVotes = (b.final_votes_a || 0) + (b.final_votes_b || 0);
        if (bVotes !== aVotes) return bVotes - aVotes; // 投票数降順
        const aTime = a.archived_at ? new Date(a.archived_at).getTime() : 0;
        const bTime = b.archived_at ? new Date(b.archived_at).getTime() : 0;
        return bTime - aTime; // タイブレーク: 新しい方
      });
      return sorted[0] ?? null;
    } catch (e) {
      console.error('Error computing weeklyPickupBattle:', e);
      return null;
    }
  }, [archivedBattles]);

  // フィルターが変更されたときにページを1に戻す
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, showMyBattlesOnly, showUnvotedOnly, showCompletedBattles, battleFormatFilter]);

  // Active/Past battles切り替え時に一時的にローディング状態を表示
  useEffect(() => {
    if (isSwitchingBattleType) {
      const timer = setTimeout(() => {
        setIsSwitchingBattleType(false);
      }, 300); // 300msのローディングアニメーション
      return () => clearTimeout(timer);
    }
  }, [isSwitchingBattleType]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // ページ変更時に上部にスクロール
    document.getElementById('active-battles')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-6 sm:py-8 md:py-10">
      <div className="container-ultra-wide">
        {/* Guide Hero Section - 固定で表示 */}
        <GuideHeroSection />

        <main className="grid grid-cols-1 gap-6 lg:grid-cols-5" role="main">
          {/* Left Sidebar - PC表示のみ（ニュースのみ） */}
          <aside className="hidden lg:block lg:col-span-1 lg:sticky lg:top-24 lg:self-start" aria-label="News and updates">
            <NewsSidebar
              news={newsState.news}
              loading={newsState.loading}
              error={newsState.error}
              onRetry={newsState.refetch}
              limit={5}
            />
          </aside>

          {/* Main Content */}
          <section className="lg:col-span-3" aria-label="Battle listings">
            <div className="filter-sticky mb-6 space-y-4">
              <BattleFilterActions />
              <BattleFilters
                sortBy={sortBy}
                setSortBy={setSortBy}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                showMyBattlesOnly={showMyBattlesOnly}
                setShowMyBattlesOnly={setShowMyBattlesOnly}
                showUnvotedOnly={showUnvotedOnly}
                setShowUnvotedOnly={setShowUnvotedOnly}
                showCompletedBattles={showCompletedBattles}
                setShowCompletedBattles={setCompletedWithTransition}
                isLoggedIn={!!user}
                battleFormat={battleFormatFilter}
                setBattleFormat={setBattleFormatFilter}
                defaultSortBy={DEFAULT_SORT}
                stats={filterStats}
                onResetFilters={handleResetFilters}
                isMobileLayout={true}
              />
            </div>
            
            <div className="space-y-4 sm:space-y-6 mt-4 sm:mt-6 md:mt-8" role="region" aria-label="Battle results">
              {!showCompletedBattles ? (
                (loading || isSwitchingBattleType) ? (
                  <div role="status" aria-live="polite">
                    <Card className="bg-gray-900 border border-gray-800 p-8 text-center">
                      <div
                        className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"
                        aria-hidden="true"
                      ></div>
                      <p className="text-gray-400">{t('battlesPage.status.loadingBattles')}</p>
                    </Card>
                  </div>
                ) : error ? (
                  <div role="alert">
                    <Card className="bg-gray-900 border border-red-500/20 p-8 text-center">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center" aria-hidden="true">
                        <Trophy className="h-10 w-10 text-red-500" />
                      </div>
                      <h2 className="text-xl font-semibold text-white mb-4">{t('battlesPage.status.errorLoadingBattles')}</h2>
                      <p className="text-gray-400 mb-6">{error}</p>
                      <Button
                        variant="primary"
                        onClick={() => fetchBattles()}
                        className="bg-red-500 hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                        aria-describedby="error-description"
                      >
                        {t('battlesPage.status.tryAgainButton')}
                      </Button>
                      <div id="error-description" className="sr-only">
                        Click to retry loading battles after an error occurred
                      </div>
                    </Card>
                  </div>
                ) : paginatedActiveBattles.length > 0 ? (
                  <>
                    <div role="list" aria-label="Active battles and ads">
                      {battlesWithAds.map((item, idx) => {
                        if (isAdSlotPlaceholder(item)) {
                          return (
                            <div key={`ad-${item.__adPlacement}-${idx}`} role="listitem">
                              <AdSlot placementKey={item.__adPlacement} preloadMargin="300px" className="my-4" />
                            </div>
                          );
                        }
                        const battle = item as typeof paginatedActiveBattles[number];
                        return (
                          <div key={battle.id} role="listitem">
                            <BattleCard battle={battle} />
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* アクティブバトル用のページネーション */}
                    <nav aria-label="Battle pagination" className="mt-6 sm:mt-8">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={activeBattlesTotalPages}
                        onPageChange={handlePageChange}
                        showingCount={ITEMS_PER_PAGE}
                        totalCount={activeBattlesTotalItems}
                        className="mt-4 sm:mt-6"
                      />
                    </nav>
                  </>
                ) : (
                  // フォールバック: アクティブシーズンが無い場合は最新終了シーズンのアーカイブを表示（投票数順）
                  !currentSeason ? (
                    archiveLoading ? (
                      <Card className="bg-gray-900 border border-gray-800 p-8 text-center">
                        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" aria-hidden="true"></div>
                        <p className="text-gray-400">{t('battlesPage.status.loadingCompletedBattles')}</p>
                      </Card>
                    ) : paginatedArchivedBattles.length > 0 ? (
                      <>
                        {archivedWithAds.map((item, idx) => {
                          if (isAdSlotPlaceholder(item)) {
                            return (
                              <div key={`ad-arch-${item.__adPlacement}-${idx}`} role="listitem">
                                <AdSlot placementKey={item.__adPlacement} preloadMargin="300px" className="my-4" />
                              </div>
                            );
                          }
                          const battle = item as typeof paginatedArchivedBattles[number];
                          return (
                            <ArchivedBattleCard 
                              key={battle.id} 
                              battle={battle}
                            />
                          );
                        })}
                        <Pagination
                          currentPage={currentPage}
                          totalPages={archivedBattlesTotalPages}
                          onPageChange={handlePageChange}
                          showingCount={ITEMS_PER_PAGE}
                          totalCount={archivedBattlesTotalItems}
                          className="mt-6 sm:mt-8"
                        />
                      </>
                    ) : (
                      <div 
                        className="flex flex-col items-center justify-center py-16 px-8 text-center bg-gradient-to-br from-slate-800/40 to-slate-700/30 rounded-xl border border-slate-600/30"
                        role="status"
                        aria-live="polite"
                      >
                        <div className="relative mb-6" aria-hidden="true">
                          <div className="w-24 h-24 bg-gradient-to-br from-slate-700/60 to-slate-600/40 rounded-2xl flex items-center justify-center border border-slate-500/30">
                            <Archive className="w-12 h-12 text-slate-400" />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-slate-600/10 rounded-2xl blur-xl opacity-50" />
                        </div>
                        <div className="space-y-4 max-w-md">
                          <h3 className="text-xl font-semibold text-slate-200">
                            {t('battlesPage.status.noCompletedBattles')}
                          </h3>
                          <p className="text-slate-400 text-sm leading-relaxed">
                            {t('battlesPage.status.checkBackSoonCompleted')}
                          </p>
                        </div>
                      </div>
                    )
                  ) : (
                    // 通常: アクティブバトルが0件でアクティブシーズンは存在 → 既存メッセージ
                    <div 
                      className="flex flex-col items-center justify-center py-16 px-8 text-center bg-gradient-to-br from-slate-800/40 to-slate-700/30 rounded-xl border border-slate-600/30"
                      role="status"
                      aria-live="polite"
                    >
                      {/* アイコン */}
                      <div className="relative mb-6" aria-hidden="true">
                        <div className="w-24 h-24 bg-gradient-to-br from-slate-700/60 to-slate-600/40 rounded-2xl flex items-center justify-center border border-slate-500/30">
                          <Mic className="w-12 h-12 text-slate-400" />
                        </div>
                        
                        {/* 装飾的なグロー効果 */}
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-slate-600/10 rounded-2xl blur-xl opacity-50" />
                      </div>

                      {/* メッセージ */}
                      <div className="space-y-4 max-w-md">
                        <h2 className="text-xl font-semibold text-slate-200">
                          {t('battlesPage.status.noBattlesFound')}
                        </h2>
                        
                        {/* ヒント */}
                        <div className="mt-6 p-4 bg-slate-800/60 rounded-lg border border-slate-600/40">
                          <p className="text-cyan-300 text-sm font-medium flex items-center justify-center gap-2">
                            <Mic className="w-4 h-4" aria-hidden="true" />
                            {t('battlesPage.status.createBattleHint')}
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
                )
              ) : (
                // アーカイブされたバトルの表示（showCompletedBattles === true の場合）
                (archiveLoading || isSwitchingBattleType) ? (
                  <Card className="bg-gray-900 border border-gray-800 p-8 text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" aria-hidden="true"></div>
                    <p className="text-gray-400">{t('battlesPage.status.loadingCompletedBattles')}</p>
                  </Card>
                ) : paginatedArchivedBattles.length > 0 ? (
                  <>
                    {archivedWithAds.map((item, idx) => {
                      if (isAdSlotPlaceholder(item)) {
                        return (
                          <div key={`ad-arch-${item.__adPlacement}-${idx}`} role="listitem">
                            <AdSlot placementKey={item.__adPlacement} preloadMargin="300px" className="my-4" />
                          </div>
                        );
                      }
                      const battle = item as typeof paginatedArchivedBattles[number];
                      return (
                        <ArchivedBattleCard 
                          key={battle.id} 
                          battle={battle}
                        />
                      );
                    })}
                    
                    {/* アーカイブバトル用のページネーション */}
                    <Pagination
                      currentPage={currentPage}
                      totalPages={archivedBattlesTotalPages}
                      onPageChange={handlePageChange}
                      showingCount={ITEMS_PER_PAGE}
                      totalCount={archivedBattlesTotalItems}
                      className="mt-6 sm:mt-8"
                    />
                  </>
                ) : (
                  <div 
                    className="flex flex-col items-center justify-center py-16 px-8 text-center bg-gradient-to-br from-slate-800/40 to-slate-700/30 rounded-xl border border-slate-600/30"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="relative mb-6" aria-hidden="true">
                      <div className="w-24 h-24 bg-gradient-to-br from-slate-700/60 to-slate-600/40 rounded-2xl flex items-center justify-center border border-slate-500/30">
                        <Archive className="w-12 h-12 text-slate-400" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-slate-600/10 rounded-2xl blur-xl opacity-50" />
                    </div>

                    <div className="space-y-4 max-w-md">
                      <h3 className="text-xl font-semibold text-slate-200">
                        {t('battlesPage.status.noCompletedBattles')}
                      </h3>
                      
                      <p className="text-slate-400 text-sm leading-relaxed">
                        {t('battlesPage.status.checkBackSoonCompleted')}
                      </p>
                      
                      <div className="mt-6 p-4 bg-slate-800/60 rounded-lg border border-slate-600/40">
                        <p className="text-cyan-300 text-xs font-medium flex items-center justify-center gap-2">
                          <Archive className="w-4 h-4" aria-hidden="true" />
                          {t('battlesPage.status.completedBattlesHint')}
                        </p>
                      </div>
                    </div>

                    {/* 装飾的なパーティクル */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                      <div className="absolute top-10 left-10 w-2 h-2 bg-cyan-400/20 rounded-full animate-pulse" />
                      <div className="absolute top-20 right-16 w-1 h-1 bg-purple-400/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                      <div className="absolute bottom-16 left-20 w-1.5 h-1.5 bg-amber-400/20 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
                      <div className="absolute bottom-10 right-10 w-2 h-2 bg-pink-400/20 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Weekly Pickup Section */}
            {weeklyPickupBattle && (
              <section className="mt-6 sm:mt-8 hidden lg:block" aria-label="Weekly pickup battle">
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">
                  {t('battlesPage.weeklyPickup.mostAttention', '今週最も注目を集めたバトル')}
                </h2>
                <ArchivedBattleCard battle={weeklyPickupBattle} />
              </section>
            )}

          </section>

          {/* Right Sidebar */}
          <aside className="lg:col-span-1 space-y-6 sticky-sidebar-extended hidden lg:block" aria-label="Rankings and community stats">
            
            {/* Top Rankings with Tabs */}
            <TabbedRanking 
              maxItems={5}
              showViewAllButton={true}
            />

          </aside>
        </main>

      </div>

      <MobileNewsDrawer
        news={newsState.news}
        loading={newsState.loading}
        error={newsState.error}
        onRetry={newsState.refetch}
      />
      
      {/* Weekly Pickup - Mobile only between list and rankings */}
      {weeklyPickupBattle && (
        <section className="lg:hidden mt-6 w-full" aria-label="Weekly pickup battle (mobile)">
          <div className="w-full px-4 sm:px-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">
              {t('battlesPage.weeklyPickup.mostAttention', '今週最も注目を集めたバトル')}
            </h2>
            <ArchivedBattleCard battle={weeklyPickupBattle} />
          </div>
        </section>
      )}


      {/* Mobile Rankings - モバイル版でのみ表示 */}
      <section className="lg:hidden mt-8 w-full" aria-label="Mobile rankings">
        <div className="w-full px-4 sm:px-6">
          <TabbedRanking 
            maxItems={5}
            showViewAllButton={true}
          />
        </div>
      </section>
      
      {/* Mobile User Info Card - モバイル版でのみ表示、コンテナの外に配置 */}
      {user && (
        <section className="lg:hidden mt-6 w-full" aria-label="User info">
          <div className="w-full px-4 sm:px-6">
            <UserInfoCard />
          </div>
        </section>
      )}

      {/* Auth Modal */}
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