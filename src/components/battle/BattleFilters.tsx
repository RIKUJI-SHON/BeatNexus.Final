import React from 'react';
import { Search, SortDesc, Clock, User, Filter, TrendingUp, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';

export interface BattleFiltersProps {
  sortBy: 'recent' | 'trending' | 'ending' | null;
  setSortBy: (sort: 'recent' | 'trending' | 'ending' | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showMyBattlesOnly: boolean;
  setShowMyBattlesOnly: (show: boolean) => void;
  showUnvotedOnly: boolean; // 新規: 未投票のみ
  setShowUnvotedOnly: (show: boolean) => void; // 新規 setter
  showCompletedBattles: boolean; // 新規: 完了済み表示
  setShowCompletedBattles: (show: boolean) => void; // 新規 setter
  isLoggedIn: boolean;
}

interface BattleFilterControlsProps extends BattleFiltersProps {
  className?: string;
  isMobile?: boolean; // モバイル版でのレイアウト変更用
  radioName?: string; // ラジオボタンのname属性（PC/モバイルで区別）
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

export const BattleFilterControls: React.FC<BattleFilterControlsProps> = ({
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
  className,
  isMobile = false,
  radioName = 'battle-range',
}) => {
  const { t } = useTranslation();

  const sortButtons = [
    {
      key: 'ending',
      icon: <Clock className="h-3 w-3" />,
      label: t('battleFilters.endingSoon'),
      colors: 'from-red-500 to-orange-500',
    },
    {
      key: 'recent',
      icon: <SortDesc className="h-3 w-3" />,
      label: t('battleFilters.recent'),
      colors: 'from-cyan-500 to-blue-500',
    },
    {
      key: 'trending',
      icon: <TrendingUp className="h-3 w-3" />,
      label: t('battleFilters.trending'),
      colors: 'from-purple-500 to-pink-500',
    },
  ];

  const handleSortClick = (sortKey: 'recent' | 'trending' | 'ending') => {
    setSortBy(sortBy === sortKey ? null : sortKey);
  };

  const containerClasses = `battle-card-simple mb-3 sm:mb-6 group cursor-default ${className ?? ''}`;

  return (
    <div className={containerClasses.trim()}>
      <div className="battle-card-simple__content">
        <div className="p-3 sm:p-4">
          <div className="space-y-4">
            {/* Active/Past battles toggle */}
            <div>
              <label className="radio-label">
                <input
                  type="radio"
                  className="radio-input"
                  name={radioName}
                  checked={!showCompletedBattles}
                  onChange={() => setShowCompletedBattles(false)}
                />
                <span className="radio-custom" aria-hidden="true"></span>
                <span className="radio-text">{t('battleFilters.activeBattles')}</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  className="radio-input"
                  name={radioName}
                  checked={showCompletedBattles}
                  onChange={() => setShowCompletedBattles(true)}
                />
                <span className="radio-custom" aria-hidden="true"></span>
                <span className="radio-text">{t('battleFilters.pastBattles')}</span>
              </label>
            </div>

            {/* Username Search */}
            <div>
              <div className="flex items-center gap-2 mb-2">
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

            {/* Filters & Sort */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-purple-400">{t('battleFilters.filtersTitle')}</h3>
              </div>

              <div className={isMobile ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
                {isLoggedIn && (
                  <button
                    onClick={() => setShowMyBattlesOnly(!showMyBattlesOnly)}
                    className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 border flex items-center justify-center gap-2 ${
                      showMyBattlesOnly
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-pink-500/50'
                        : 'bg-gray-800/60 text-gray-300 border-gray-600/50 hover:border-pink-500/50 hover:text-white'
                    }`}
                  >
                    <User className="h-4 w-4" />
                    <span>{t('battleFilters.myBattlesOnly')}</span>
                  </button>
                )}
                {isLoggedIn && !showCompletedBattles && (
                  <button
                    onClick={() => setShowUnvotedOnly(!showUnvotedOnly)}
                    className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 border flex items-center justify-center gap-2 ${
                      showUnvotedOnly
                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-emerald-500/50'
                        : 'bg-gray-800/60 text-gray-300 border-gray-600/50 hover:border-emerald-500/50 hover:text-white'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    <span>{t('battleFilters.unvotedOnly')}</span>
                  </button>
                )}

                {(showCompletedBattles ? sortButtons.filter((b) => b.key !== 'ending') : sortButtons).map((button) => (
                  <button
                    key={button.key}
                    onClick={() => handleSortClick(button.key as 'recent' | 'trending' | 'ending')}
                    className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 border flex items-center justify-center gap-2 ${
                      sortBy === button.key
                        ? `bg-gradient-to-r ${button.colors} text-white border-transparent`
                        : 'bg-gray-800/60 text-gray-300 border-gray-600/50 hover:border-gray-500/50 hover:text-white'
                    }`}
                    title={button.label}
                  >
                    {button.icon}
                    <span>{button.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BattleFilters: React.FC<BattleFilterControlsProps> = (props) => (
  <div className="grid grid-cols-12 gap-4 sm:gap-6">
    <div className="col-span-12">
      <div className="space-y-3">
        <BattleFilterActions />
        <BattleFilterControls {...props} isMobile={true} />
      </div>
    </div>
  </div>
);