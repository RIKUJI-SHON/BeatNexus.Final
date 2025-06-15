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
      icon: <SortDesc className="h-4 w-4" />,
      label: t('battleFilters.recent'),
      colors: 'from-cyan-500 to-blue-500',
      hoverColors: 'hover:from-cyan-400 hover:to-blue-400',
      shadowColor: 'hover:shadow-cyan-500/25'
    },
    {
      key: 'trending',
      icon: <TrendingUp className="h-4 w-4" />,
      label: t('battleFilters.trending'),
      colors: 'from-purple-500 to-pink-500',
      hoverColors: 'hover:from-purple-400 hover:to-pink-400',
      shadowColor: 'hover:shadow-purple-500/25'
    },
    {
      key: 'ending',
      icon: <Clock className="h-4 w-4" />,
      label: t('battleFilters.endingSoon'),
      colors: 'from-yellow-500 to-orange-500',
      hoverColors: 'hover:from-yellow-400 hover:to-orange-400',
      shadowColor: 'hover:shadow-yellow-500/25'
    },
    {
      key: 'completed',
      icon: <Archive className="h-4 w-4" />,
      label: t('battleFilters.completed'),
      colors: 'from-green-500 to-emerald-500',
      hoverColors: 'hover:from-green-400 hover:to-emerald-400',
      shadowColor: 'hover:shadow-green-500/25'
    }
  ];

  return (
    <Card className="group relative bg-gradient-to-br from-gray-900 via-gray-850 to-gray-950 border border-gray-700/50 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-500 rounded-xl overflow-hidden mb-6 backdrop-blur-sm">
      
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
      </div>

      <div className="relative p-6 space-y-6">
        
        {/* Search Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg">
              <Search className="h-5 w-5 text-cyan-400" />
            </div>
            <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              {t('battleFilters.searchPlaceholder').split(' ')[0]} & Filters
            </h3>
          </div>
          
          <div className="relative group">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('battleFilters.searchPlaceholder')}
              className="w-full bg-gradient-to-r from-gray-800/80 to-gray-750/80 border border-gray-600/50 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/70 focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-300 backdrop-blur-sm font-medium"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-cyan-400 transition-colors duration-300" />
            
            {/* Search input glow effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-purple-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* My Battles Filter */}
          {isLoggedIn && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <User className="h-4 w-4 text-pink-400" />
                <span>Personal Filter</span>
              </div>
              <button
                onClick={() => setShowMyBattlesOnly(!showMyBattlesOnly)}
                className={`group relative w-full overflow-hidden px-4 py-3 rounded-xl font-bold text-sm transition-all duration-300 backdrop-blur-sm border ${
                  showMyBattlesOnly
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-pink-500/50 shadow-lg shadow-pink-500/25'
                    : 'bg-gray-800/60 text-gray-300 border-gray-600/50 hover:border-pink-500/50 hover:text-white hover:shadow-lg hover:shadow-pink-500/10'
                }`}
              >
                <div className="relative flex items-center justify-center gap-2">
                  <User className="h-4 w-4" />
                  {t('battleFilters.myBattles')}
                </div>
                
                {/* Button glow effect */}
                {!showMyBattlesOnly && (
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}
              </button>
            </div>
          )}

          {/* Sort Options - Simple Horizontal Layout */}
          <div className="space-y-3 lg:col-span-1">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <Star className="h-4 w-4 text-yellow-400" />
              <span>Sort Options</span>
            </div>
            <div className="flex gap-1">
              {sortButtons.map((button) => (
                <button
                  key={button.key}
                  onClick={() => setSortBy(button.key as any)}
                  className={`group relative overflow-hidden px-2 py-2 rounded-lg font-bold text-xs transition-all duration-300 backdrop-blur-sm border flex-1 ${
                    sortBy === button.key
                      ? `bg-gradient-to-r ${button.colors} text-white border-transparent shadow-lg ${button.shadowColor}`
                      : `bg-gray-800/60 text-gray-300 border-gray-600/50 hover:border-gray-500/50 hover:text-white hover:shadow-lg ${button.shadowColor}`
                  }`}
                >
                  <div className="relative flex items-center justify-center gap-1">
                    {button.icon}
                    <span className="hidden xl:inline text-xs">{button.label}</span>
                  </div>
                  
                  {/* Button glow effect */}
                  {sortBy !== button.key && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${button.colors} opacity-0 group-hover:opacity-20 transition-opacity duration-300`}></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(searchQuery || showMyBattlesOnly) && (
          <div className="pt-4 border-t border-gray-800/50">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-400 font-medium">Active filters:</span>
              
              {searchQuery && (
                <div className="flex items-center gap-1 px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs font-medium border border-cyan-500/30">
                  <Search className="h-3 w-3" />
                  "{searchQuery}"
                </div>
              )}
              
              {showMyBattlesOnly && (
                <div className="flex items-center gap-1 px-3 py-1 bg-pink-500/20 text-pink-400 rounded-full text-xs font-medium border border-pink-500/30">
                  <User className="h-3 w-3" />
                  My Battles
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};