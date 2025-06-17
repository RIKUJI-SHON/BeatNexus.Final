import React from 'react';
import { Search, SortAsc, SortDesc, Clock, Archive, User, Filter, Flame, Zap, Trophy, Star, Play, UserCircle, Award } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
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
    // 同じボタンをクリックした場合はトグル（null）、違うボタンの場合は選択
    setSortBy(sortBy === sortKey ? null : sortKey);
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* メインコンテンツエリア */}
      <div className="col-span-12">
        <div className="space-y-6">
          {/* アクションボタン群 */}
          <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto">
        
        {/* プロフィールボタン */}
        <button
          onClick={handleProfileClick}
          className="group flex flex-col items-center justify-end p-4 h-32 transition-all duration-300 hover:scale-105"
        >
          <div className="w-16 h-16 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform duration-300">
            <img 
              src="/images/Profile.png" 
              alt="Profile"
              className="h-8 w-8 object-contain filter brightness-110 group-hover:brightness-150 group-hover:drop-shadow-lg transition-all duration-300"
            />
          </div>
          <span className="text-sm font-medium text-gray-300 group-hover:text-white group-hover:drop-shadow-lg transition-colors">
            {t('battleFilters.buttons.profile')}
          </span>
        </button>

        {/* バトルスタートボタン（中央・メイン） */}
        <button
          onClick={handleBattleStartClick}
          className="group flex flex-col items-center justify-end p-8 h-40 transition-all duration-300 hover:scale-110 hover:drop-shadow-2xl"
        >
          <div className="w-28 h-28 flex items-center justify-center mb-2 group-hover:scale-110 transition-all duration-300">
            <img 
              src="/images/VS.png" 
              alt="Battle Start"
              className="w-16 h-16 object-contain filter brightness-110 group-hover:brightness-200 group-hover:drop-shadow-2xl transition-all duration-300"
            />
          </div>
          <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 group-hover:from-cyan-200 group-hover:to-purple-200 group-hover:drop-shadow-xl transition-all duration-300">
            {t('battleFilters.buttons.battleStart')}
          </span>
        </button>

        {/* トーナメントボタン */}
        <button
          onClick={handleTournamentClick}
          className="group flex flex-col items-center justify-end p-4 h-32 transition-all duration-300 hover:scale-105"
        >
          <div className="w-16 h-16 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform duration-300">
            <Award className="h-8 w-8 text-yellow-400 group-hover:text-yellow-300 group-hover:drop-shadow-lg transition-all duration-300" />
          </div>
          <span className="text-sm font-medium text-gray-300 group-hover:text-white group-hover:drop-shadow-lg transition-colors">
            {t('battleFilters.buttons.tournament')}
          </span>
        </button>

      </div>

      {/* 既存のBattleFiltersコンテンツ */}
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl backdrop-blur-sm">
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
            
            {/* 検索セクション - より小さく制限 */}
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

            {/* フィルターセクション - 残りのスペースを使用 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-purple-400">{t('battleFilters.filtersTitle')}</h3>
              </div>
              
              {/* マイバトル & ソートボタン - 強制的に一行配置 */}
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

                {/* Sort Options - コンパクトサイズ */}
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
      </div>
        </div>
      </div>
    </div>
  );
};