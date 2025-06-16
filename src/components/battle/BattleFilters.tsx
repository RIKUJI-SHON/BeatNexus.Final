import React from 'react';
import { Search, SortAsc, SortDesc, TrendingUp, Clock, Archive, User, Filter, Flame, Zap, Trophy, Star } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

import { useTranslation } from 'react-i18next';

interface BattleFiltersProps {
  sortBy: 'recent' | 'trending' | 'ending' | 'completed';
  setSortBy: (sort: 'recent' | 'trending' | 'ending' | 'completed') => void;
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

  // Color pairs for consistent theming (same as BattleCard)
  const colorPairs = [
    { colorA: 'cyan', colorB: 'purple' },
    { colorA: 'purple', colorB: 'pink' },
    { colorA: 'cyan', colorB: 'blue' },
    { colorA: 'pink', colorB: 'purple' },
    { colorA: 'blue', colorB: 'cyan' }
  ];
  
  const defaultColorPair = colorPairs[0]; // Use consistent colors

  // Sort button configurations with enhanced styling
  const sortButtons = [
    {
      key: 'recent',
      icon: <SortDesc className="h-3 w-3" />,
      label: t('battleFilters.recent'),
      colors: 'from-cyan-500 to-blue-500',
      hoverColors: 'hover:from-cyan-400 hover:to-blue-400',
      shadowColor: 'hover:shadow-cyan-500/25'
    },
    {
      key: 'trending',
      icon: <TrendingUp className="h-3 w-3" />,
      label: t('battleFilters.trending'),
      colors: 'from-purple-500 to-pink-500',
      hoverColors: 'hover:from-purple-400 hover:to-pink-400',
      shadowColor: 'hover:shadow-purple-500/25'
    },
    {
      key: 'ending',
      icon: <Clock className="h-3 w-3" />,
      label: t('battleFilters.endingSoon'),
      colors: 'from-yellow-500 to-orange-500',
      hoverColors: 'hover:from-yellow-400 hover:to-orange-400',
      shadowColor: 'hover:shadow-yellow-500/25'
    },
    {
      key: 'completed',
      icon: <Archive className="h-3 w-3" />,
      label: t('battleFilters.completed'),
      colors: 'from-green-500 to-emerald-500',
      hoverColors: 'hover:from-green-400 hover:to-emerald-400',
      shadowColor: 'hover:shadow-green-500/25'
    }
  ];

  return (
    <Card className="bg-gray-900/50 border border-gray-700/50 rounded-xl mb-6 backdrop-blur-sm">
      <div className="p-4">
        {/* 2列レイアウト */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 検索セクション */}
          <div>
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
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-purple-400">{t('battleFilters.filtersTitle')}</h3>
            </div>
            
            <div className="space-y-2">
              {/* My Battles Filter */}
              {isLoggedIn && (
                <div className="flex justify-start">
                  <button
                    onClick={() => setShowMyBattlesOnly(!showMyBattlesOnly)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 border flex items-center gap-1 ${
                      showMyBattlesOnly
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-pink-500/50'
                        : 'bg-gray-800/60 text-gray-300 border-gray-600/50 hover:border-pink-500/50 hover:text-white'
                    }`}
                  >
                    <User className="h-3 w-3" />
                    <span className="whitespace-nowrap">{t('battleFilters.myBattlesOnly')}</span>
                  </button>
                </div>
              )}

              {/* Sort Options */}
              <div className="flex gap-1 flex-wrap">
                {sortButtons.map((button) => (
                  <button
                    key={button.key}
                    onClick={() => setSortBy(button.key as any)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium transition-all duration-300 border flex items-center gap-1 flex-shrink-0 ${
                      sortBy === button.key
                        ? `bg-gradient-to-r ${button.colors} text-white border-transparent`
                        : `bg-gray-800/60 text-gray-300 border-gray-600/50 hover:border-gray-500/50 hover:text-white`
                    }`}
                    title={button.label}
                  >
                    {button.icon}
                    <span className="hidden xl:inline text-xs whitespace-nowrap">{button.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Active Filters Summary - Compact */}
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
    </Card>
  );
};