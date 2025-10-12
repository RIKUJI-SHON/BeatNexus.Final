import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowDownAZ,
  Check,
  ChevronDown,
  Filter,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  User,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BattleFormat } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export type BattleSortKey = 'recent' | 'trending' | 'oldest' | null;

export interface BattleFilterStat {
  value: string;
  label: string;
  accent?: 'fire' | 'aqua' | 'violet' | 'emerald';
}

export interface BattleFiltersProps {
  sortBy: BattleSortKey;
  setSortBy: (sort: BattleSortKey) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showMyBattlesOnly: boolean;
  setShowMyBattlesOnly: (show: boolean) => void;
  showUnvotedOnly: boolean;
  setShowUnvotedOnly: (show: boolean) => void;
  showCompletedBattles: boolean;
  setShowCompletedBattles: (show: boolean) => void;
  isLoggedIn: boolean;
  battleFormat: 'ALL' | BattleFormat;
  setBattleFormat: (format: 'ALL' | BattleFormat) => void;
  defaultSortBy: BattleSortKey;
  stats: BattleFilterStat[];
  onResetFilters: () => void;
  isMobileLayout?: boolean;
}

export const BattleFilterActions: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleRankingClick = () => {
    navigate('/ranking');
  };

  const handleBattleStartClick = () => {
    if (user) {
      navigate('/post');
    } else {
      navigate('/auth');
    }
  };

  const handleTournamentClick = () => {
    navigate('/tournament');
  };

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-6 max-w-4xl mx-auto px-4">
      <button
        onClick={handleRankingClick}
        className="group flex flex-col items-center justify-end p-3 sm:p-6 h-28 sm:h-40 transition-all duration-300 hover:scale-105"
      >
        <div className="w-12 sm:w-20 h-12 sm:h-20 flex items-center justify-center mb-1 sm:mb-2 group-hover:scale-110 transition-transform duration-300">
          <img
            src="/images/Ranking_icon.png"
            alt="Ranking"
            className="h-8 sm:h-12 w-8 sm:w-12 object-contain filter brightness-110 group-hover:brightness-150 group-hover:drop-shadow-lg transition-all duration-300"
          />
        </div>
        <span className="text-xs sm:text-base font-medium text-gray-300 group-hover:text-white group-hover:drop-shadow-lg transition-colors text-center whitespace-nowrap">
          {t('battleFilters.buttons.ranking')}
        </span>
      </button>

      <button
        onClick={handleBattleStartClick}
        className="group flex flex-col items-center justify-end p-4 sm:p-10 h-32 sm:h-48 transition-all duration-300 hover:scale-110 hover:drop-shadow-2xl"
      >
        <div className="w-16 sm:w-32 h-16 sm:h-32 flex items-center justify-center mb-1 sm:mb-3 group-hover:scale-110 transition-all duration-300">
          <img
            src="/images/VS.png"
            alt="Battle Start"
            className="w-12 sm:w-20 h-12 sm:h-20 object-contain filter brightness-110 group-hover:brightness-200 group-hover:drop-shadow-2xl transition-all duration-300"
          />
        </div>
        <span className="text-xs sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 group-hover:from-cyan-200 group-hover:to-purple-200 group-hover:drop-shadow-xl transition-all duration-300 text-center whitespace-nowrap">
          {t('battleFilters.buttons.battleStart')}
        </span>
      </button>

      <button
        onClick={handleTournamentClick}
        className="group flex flex-col items-center justify-end p-3 sm:p-6 h-28 sm:h-40 transition-all duration-300 hover:scale-105"
      >
        <div className="w-12 sm:w-20 h-12 sm:h-20 flex items-center justify-center mb-1 sm:mb-2 group-hover:scale-110 transition-transform duration-300">
          <img
            src="/images/Tournaments.png"
            alt="Tournament"
            className="h-8 sm:h-12 w-8 sm:w-12 object-contain filter brightness-110 group-hover:brightness-150 group-hover:drop-shadow-lg transition-all duration-300"
          />
        </div>
        <span className="text-xs sm:text-base font-medium text-gray-300 group-hover:text-white group-hover:drop-shadow-lg transition-colors text-center whitespace-nowrap">
          {t('battleFilters.buttons.tournament')}
        </span>
      </button>
    </div>
  );
};

export const BattleFilters: React.FC<BattleFiltersProps> = ({
  sortBy,
  setSortBy,
  searchQuery,
  setSearchQuery,
  showMyBattlesOnly,
  setShowMyBattlesOnly,
  showUnvotedOnly,
  setShowUnvotedOnly,
  showCompletedBattles,
  setShowCompletedBattles,
  isLoggedIn,
  battleFormat,
  setBattleFormat,
  defaultSortBy,
  stats,
  onResetFilters,
  isMobileLayout = false,
}) => {
  const { t } = useTranslation();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMoreMenuOpen && !isSortMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setIsMoreMenuOpen(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(target)) {
        setIsSortMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMoreMenuOpen, isSortMenuOpen]);

  const tabLabels = useMemo(
    () => ({
      active: t('battleFilters.tabs.active', 'Active'),
      more: t('battleFilters.tabs.more', 'More'),
    }),
    [t]
  );

  const formatOptions = useMemo(
    () => [
      { value: 'ALL' as const, label: t('battleFilters.format.all', 'All Formats') },
      { value: 'MAIN_BATTLE' as const, label: t('battleFilters.format.main', 'Main Battle') },
      { value: 'MINI_BATTLE' as const, label: t('battleFilters.format.mini', 'Mini Battle') },
    ],
    [t]
  );

  const sortOptions = useMemo(
    () => [
      { value: 'trending' as const, label: t('battleFilters.sortOptions.popular', 'Sort by Popularity') },
      { value: 'recent' as const, label: t('battleFilters.sortOptions.newest', 'Sort by Newest') },
      { value: 'oldest' as const, label: t('battleFilters.sortOptions.oldest', 'Sort by Oldest') },
    ],
    [t]
  );

  const handleActiveSelect = useCallback(() => {
    setShowCompletedBattles(false);
    setSortBy('trending');
    setIsMoreMenuOpen(false);
  }, [setShowCompletedBattles, setSortBy]);

  const handleFormatChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setBattleFormat(event.target.value as 'ALL' | BattleFormat);
  };

  const renderFormatSelect = (variant: 'desktop' | 'mobile') => (
    <div className={`relative ${variant === 'desktop' ? 'min-w-[220px]' : ''}`}>
      <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
      <select
        name="battle-format"
        value={battleFormat}
        onChange={handleFormatChange}
        className="w-full appearance-none rounded-2xl border border-white/10 bg-gray-900/80 pl-10 pr-10 py-2.5 text-sm text-white transition-all focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
        aria-label={t('battleFilters.formatAriaLabel', 'Filter by format')}
      >
        {formatOptions.map((option) => (
          <option key={option.value} value={option.value} className="bg-gray-950 text-white">
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  );

  const toggleMoreMenu = () => setIsMoreMenuOpen((prev) => !prev);
  const toggleSortMenu = () => setIsSortMenuOpen((prev) => !prev);

  const isActiveSelected = !showCompletedBattles && sortBy === 'trending';

  const handleReset = () => {
    onResetFilters();
    setIsMoreMenuOpen(false);
    setIsSortMenuOpen(false);
  };

  const isMoreActive = useMemo(
    () => showCompletedBattles || showMyBattlesOnly || showUnvotedOnly || isMoreMenuOpen,
    [showCompletedBattles, showMyBattlesOnly, showUnvotedOnly, isMoreMenuOpen]
  );

  const normalizedDefaultSort = defaultSortBy ?? 'trending';
  const currentSort = sortBy ?? 'trending';
  const currentSortLabel = useMemo(() => {
    const match = sortOptions.find((option) => option.value === currentSort);
  return match ? match.label : t('battleFilters.sortOptions.popular', 'Sort by Popularity');
  }, [currentSort, sortOptions, t]);
  const isSortMenuActive = isSortMenuOpen || currentSort !== normalizedDefaultSort;

  const handleSortSelect = (value: BattleSortKey) => {
    setSortBy(value);
    setIsSortMenuOpen(false);
  };

  const isResetDisabled =
    searchQuery.trim() === '' &&
    sortBy === defaultSortBy &&
    !showMyBattlesOnly &&
    !showUnvotedOnly &&
    !showCompletedBattles &&
    battleFormat === 'ALL';

  const renderResetButton = (variant: 'mobile' | 'desktop') => (
    <button
      type="button"
      onClick={handleReset}
      disabled={isResetDisabled}
      className={`rounded-2xl border px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-all ${
        variant === 'mobile' ? 'w-full sm:w-auto' : 'flex-shrink-0 min-w-[120px]'
      } ${
        isResetDisabled
          ? 'cursor-not-allowed border-white/5 bg-gray-900/60 text-gray-500'
          : 'border-cyan-400/60 bg-cyan-400/20 text-cyan-200 hover:border-cyan-300 hover:bg-cyan-400/30 hover:text-white'
      }`}
    >
      {t('battleFilters.reset', 'Reset')}
    </button>
  );

  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-gray-950/95 via-gray-900/90 to-gray-950/95 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative" ref={sortMenuRef}>
          <button
            type="button"
            onClick={toggleSortMenu}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-all duration-300 sm:text-sm ${
              isSortMenuActive
                ? 'border-cyan-300/60 bg-cyan-400/20 text-cyan-100 shadow-[0_6px_20px_-10px_rgba(6,182,212,0.8)]'
                : 'border-white/10 bg-gray-900/80 text-gray-300 hover:border-cyan-400/50 hover:text-white'
            }`}
            aria-haspopup="listbox"
            aria-expanded={isSortMenuOpen}
            aria-label={t('battleFilters.sortAriaLabel', 'Sort battles')}
          >
            <ArrowDownAZ className="h-4 w-4" />
            <span>{currentSortLabel}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isSortMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isSortMenuOpen && (
            <div className="absolute left-0 z-20 mt-3 w-64 rounded-2xl border border-white/10 bg-gray-950/95 p-3 shadow-[0_18px_40px_rgba(6,182,212,0.25)]">
              <div className="space-y-2">
                {sortOptions.map((option) => {
                  const isActive = currentSort === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSortSelect(option.value)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition-all ${
                        isActive
                          ? 'border-cyan-300/60 bg-cyan-400/20 text-cyan-100'
                          : 'border-white/10 bg-gray-900/70 text-gray-200 hover:border-cyan-400/40'
                      }`}
                      role="option"
                      aria-selected={isActive}
                    >
                      <span>{option.label}</span>
                      <Check className={`h-4 w-4 transition-opacity ${isActive ? 'opacity-100' : 'opacity-30'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={moreMenuRef}>
          <button
            type="button"
            onClick={toggleMoreMenu}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-all duration-300 sm:text-sm ${
              isMoreActive
                ? 'border-cyan-300/60 bg-cyan-400/20 text-cyan-200 shadow-[0_6px_20px_-10px_rgba(6,182,212,0.8)]'
                : 'border-white/10 bg-gray-900/80 text-gray-300 hover:border-cyan-400/50 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>{tabLabels.more}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isMoreMenuOpen && (
            <div className="absolute right-0 z-20 mt-3 w-60 rounded-2xl border border-white/10 bg-gray-950/95 p-3 shadow-[0_18px_40px_rgba(14,165,233,0.25)]">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleActiveSelect}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition-all ${
                    isActiveSelected
                      ? 'border-violet-300/60 bg-violet-400/20 text-violet-100'
                      : 'border-white/10 bg-gray-900/70 text-gray-200 hover:border-cyan-400/40'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    {tabLabels.active}
                  </span>
                  <Check className={`h-4 w-4 transition-opacity ${isActiveSelected ? 'opacity-100' : 'opacity-30'}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowCompletedBattles(!showCompletedBattles)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition-all ${
                    showCompletedBattles
                      ? 'border-emerald-300/60 bg-emerald-400/20 text-emerald-100'
                      : 'border-white/10 bg-gray-900/70 text-gray-200 hover:border-cyan-400/40'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {t('battleFilters.pastBattles', 'Completed Battles')}
                  </span>
                  <Check className={`h-4 w-4 transition-opacity ${showCompletedBattles ? 'opacity-100' : 'opacity-30'}`} />
                </button>

                {isLoggedIn && (
                  <button
                    type="button"
                    onClick={() => setShowMyBattlesOnly(!showMyBattlesOnly)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition-all ${
                      showMyBattlesOnly
                        ? 'border-pink-300/60 bg-pink-400/20 text-pink-100'
                        : 'border-white/10 bg-gray-900/70 text-gray-200 hover:border-cyan-400/40'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t('battleFilters.myBattlesOnly', 'My Battles')}
                    </span>
                    <Check className={`h-4 w-4 transition-opacity ${showMyBattlesOnly ? 'opacity-100' : 'opacity-30'}`} />
                  </button>
                )}

                {isLoggedIn && !showCompletedBattles && (
                  <button
                    type="button"
                    onClick={() => setShowUnvotedOnly(!showUnvotedOnly)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition-all ${
                      showUnvotedOnly
                        ? 'border-amber-300/60 bg-amber-400/20 text-amber-100'
                        : 'border-white/10 bg-gray-900/70 text-gray-200 hover:border-cyan-400/40'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      {t('battleFilters.unvotedOnly', 'Unvoted Only')}
                    </span>
                    <Check className={`h-4 w-4 transition-opacity ${showUnvotedOnly ? 'opacity-100' : 'opacity-30'}`} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {renderFormatSelect(isMobileLayout ? 'mobile' : 'desktop')}
      </div>

      <div className="mt-5 flex w-full items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('battleFilters.searchPlaceholder', 'Search battlers, crews, or tags...')}
            className="w-full rounded-2xl border border-white/10 bg-gray-900/80 pl-10 pr-4 py-2.5 text-sm text-white transition-all placeholder:text-gray-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            aria-label={t('battleFilters.searchAriaLabel', 'Search battles')}
          />
        </div>

        <div className="flex-shrink-0">
          {renderResetButton('desktop')}
        </div>
      </div>

      {stats.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={`${stat.label}-${index}`}
              className="rounded-2xl border border-white/10 bg-gray-900/70 p-4 text-center shadow-[0_12px_30px_rgba(14,116,144,0.12)]"
            >
              <div
                className={`text-2xl font-bold text-white sm:text-3xl ${
                  stat.accent === 'fire'
                    ? 'text-orange-300'
                    : stat.accent === 'violet'
                    ? 'text-purple-300'
                    : stat.accent === 'emerald'
                    ? 'text-emerald-300'
                    : 'text-cyan-300'
                }`}
              >
                {stat.value}
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-400 sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};