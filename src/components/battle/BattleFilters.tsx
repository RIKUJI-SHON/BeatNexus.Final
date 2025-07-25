import React from 'react';
import { Search, SortDesc, Clock, Archive, User, Filter, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';

interface BattleFiltersProps {
  sortBy: 'recent' | 'trending' | 'ending' | 'completed' | null;
  setSortBy: (sort: 'recent' | 'trending' | 'ending' | 'completed' | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showMyBattlesOnly: boolean;
  setShowMyBattlesOnly: (show: boolean) => void;
  isLoggedIn: boolean;
}

export const BattleFilters: React.FC<BattleFiltersProps> = ({
  sortBy,
  setSortBy,
  searchQuery,
  setSearchQuery,
  showMyBattlesOnly,
  setShowMyBattlesOnly,
  isLoggedIn,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Sort button configurations with enhanced styling
  const sortButtons = [
    {
      key: 'recent',
      icon: <SortDesc className="h-3 w-3" />,
      label: t('battleFilters.recent'),
      colors: 'from-cyan-500 to-blue-500',
    },
    {
      key: 'ending',
      icon: <Clock className="h-3 w-3" />,
      label: t('battleFilters.endingSoon'),
      colors: 'from-yellow-500 to-orange-500',
    },
    {
      key: 'completed',
      icon: <Archive className="h-3 w-3" />,
      label: t('battleFilters.completed'),
      colors: 'from-green-500 to-emerald-500',
    }
  ];

  const handleProfileClick = () => {
    if (user) {
      navigate(`/profile/${user.id}`);
    } else {
      navigate('/auth');
    }
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

  const handleSortClick = (sortKey: 'recent' | 'trending' | 'ending' | 'completed') => {
    setSortBy(sortBy === sortKey ? null : sortKey);
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <div className="space-y-3">
          {/* アクションボタン群 */}
          <div className="flex items-center justify-center gap-3 sm:gap-6 max-w-4xl mx-auto px-4">
            {/* プロフィールボタン */}
            <button
              onClick={handleProfileClick}
              className="group flex flex-col items-center justify-end p-3 sm:p-6 h-28 sm:h-40 transition-all duration-300 hover:scale-105"
            >
              <div className="w-12 sm:w-20 h-12 sm:h-20 flex items-center justify-center mb-1 sm:mb-2 group-hover:scale-110 transition-transform duration-300">
                <img 
                  src="/images/Profile.png" 
                  alt="Profile"
                  className="h-8 sm:h-12 w-8 sm:w-12 object-contain filter brightness-110 group-hover:brightness-150 group-hover:drop-shadow-lg transition-all duration-300"
                />
              </div>
              <span className="text-xs sm:text-base font-medium text-gray-300 group-hover:text-white group-hover:drop-shadow-lg transition-colors text-center whitespace-nowrap">
                {t('battleFilters.buttons.profile')}
              </span>
            </button>

            {/* バトルスタートボタン（中央・メイン） */}
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

            {/* トーナメントボタン */}
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

          {/* フィルターカード - SimpleBattleCardと同じデザイン */}
          <div className="battle-card-simple mb-6 group cursor-default">
            <div className="battle-card-simple__content">
        <div className="p-4">
          {/* 開催中のバトル タイトル */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl border border-cyan-500/30">
              <Play className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                {t('battlesPage.activeBattles.title')}
              </h2>
              <div className="w-16 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full mt-1"></div>
            </div>
          </div>
          
          {/* 1行レイアウト：検索欄とフィルター */}
          <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-end">
                  {/* 検索セクション */}
            <div className="w-full xl:w-64 flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <Search className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-cyan-400">{t('battleFilters.searchTitle')}</h3>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('battleFilters.searchPlaceholder')}
                  className="w-full bg-gray-800/60 border border-gray-600/50 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/70 focus:shadow-md focus:shadow-cyan-500/20 transition-all duration-300"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

                  {/* フィルターセクション */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-purple-400">{t('battleFilters.filtersTitle')}</h3>
              </div>
              
                    {/* マイバトル & ソートボタン */}
              <div className="flex gap-1.5 items-center overflow-x-auto scrollbar-hide pb-1">
                {/* My Battles Filter */}
                {isLoggedIn && (
                  <button
                    onClick={() => setShowMyBattlesOnly(!showMyBattlesOnly)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-300 border flex items-center gap-1 flex-shrink-0 ${
                      showMyBattlesOnly
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-pink-500/50'
                        : 'bg-gray-800/60 text-gray-300 border-gray-600/50 hover:border-pink-500/50 hover:text-white'
                    }`}
                  >
                    <User className="h-3 w-3" />
                    <span className="whitespace-nowrap text-xs">{t('battleFilters.myBattlesOnly')}</span>
                  </button>
                )}

                      {/* Sort Options */}
                {sortButtons.map((button) => (
                  <button
                    key={button.key}
                    onClick={() => handleSortClick(button.key as any)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-300 border flex items-center gap-1 flex-shrink-0 ${
                      sortBy === button.key
                        ? `bg-gradient-to-r ${button.colors} text-white border-transparent`
                        : `bg-gray-800/60 text-gray-300 border-gray-600/50 hover:border-gray-500/50 hover:text-white`
                    }`}
                    title={button.label}
                  >
                    {button.icon}
                    <span className="whitespace-nowrap text-xs">{button.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

                {/* Active Filters Summary */}
        {(searchQuery || showMyBattlesOnly) && (
            <div className="mt-4 pt-3 border-t border-gray-800/50">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-400">{t('battleFilters.activeFilters')}</span>
              
              {searchQuery && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-md text-xs border border-cyan-500/30">
                  <Search className="h-3 w-3" />
                  "{searchQuery}"
                </div>
              )}
              
              {showMyBattlesOnly && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-pink-500/20 text-pink-400 rounded-md text-xs border border-pink-500/30">
                  <User className="h-3 w-3" />
                    {t('battleFilters.myBattles')}
                </div>
              )}
            </div>
          </div>
        )}
              </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
};