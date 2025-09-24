import React from 'react';
import { Search, SortDesc, Clock, User, Filter, TrendingUp, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';

interface BattleFiltersProps {
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
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Sort button configurations with enhanced styling - ending first as default
  const sortButtons = [
    {
      key: 'ending',
      icon: <Clock className="h-3 w-3" />,
      label: t('battleFilters.endingSoon'),
      colors: 'from-red-500 to-orange-500', // 緊急性を表現する赤オレンジ
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
      colors: 'from-purple-500 to-pink-500', // 人気を表現する紫ピンク
    },
  ];

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

  const handleSortClick = (sortKey: 'recent' | 'trending' | 'ending') => {
    setSortBy(sortBy === sortKey ? null : sortKey);
  };

  return (
  <div className="grid grid-cols-12 gap-4 sm:gap-6">
      <div className="col-span-12">
        <div className="space-y-3">
          {/* アクションボタン群 */}
          <div className="flex items-center justify-center gap-3 sm:gap-6 max-w-4xl mx-auto px-4">
            {/* ランキングボタン */}
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
          <div className="battle-card-simple mb-3 sm:mb-6 group cursor-default">
            <div className="battle-card-simple__content">
              <div className="p-3 sm:p-4">
                {/* タイトル削除（要望により非表示） */}

                {/* 2カラムレイアウト：左=ラジオスイッチ / 右=検索+フィルタ+ソート */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-12 items-start">
                  {/* 左：開催中/過去 ラジオスイッチ */}
                  <div className="xl:col-span-4">
                    {/* 背景なしでスイッチのみ表示（少し右に寄せる） */}
                    <div className="pl-4 sm:pl-6 md:pl-8">
                      <label className="radio-label">
                        <input
                          type="radio"
                          className="radio-input"
                          name="battle-range"
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
                          name="battle-range"
                          checked={showCompletedBattles}
                          onChange={() => setShowCompletedBattles(true)}
                        />
                        <span className="radio-custom" aria-hidden="true"></span>
                        <span className="radio-text">{t('battleFilters.pastBattles')}</span>
                      </label>
                    </div>
                  </div>

                  {/* 右：ユーザー検索 + フィルタ/ソート */}
                  <div className="xl:col-span-8">
                    {/* ユーザー検索 */}
                    <div className="w-full mb-4">
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

                    {/* フィルタ/ソート */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Filter className="h-4 w-4 text-purple-400" />
                        <h3 className="text-sm font-semibold text-purple-400">{t('battleFilters.filtersTitle')}</h3>
                      </div>

                      <div className="space-y-2">
                        {/* モバイル: 折返し, デスクトップ: 横並び */}
                        <div className="flex flex-wrap gap-1.5 sm:flex-nowrap sm:items-center sm:overflow-x-auto sm:scrollbar-hide sm:pb-1">
                          {/* My Battles Filter */}
                          {isLoggedIn && (
                            <button
                              onClick={() => setShowMyBattlesOnly(!showMyBattlesOnly)}
                              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-300 border flex items-center justify-center gap-1 flex-shrink-0 ${
                                showMyBattlesOnly
                                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-pink-500/50'
                                  : 'bg-gray-800/60 text-gray-300 border-gray-600/50 hover:border-pink-500/50 hover:text-white'
                              }`}
                            >
                              <User className="h-3 w-3" />
                              <span className="text-xs">{t('battleFilters.myBattlesOnly')}</span>
                            </button>
                          )}
                          {isLoggedIn && !showCompletedBattles && (
                            <button
                              onClick={() => setShowUnvotedOnly(!showUnvotedOnly)}
                              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-300 border flex items-center justify-center gap-1 flex-shrink-0 ${
                                showUnvotedOnly
                                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-emerald-500/50'
                                  : 'bg-gray-800/60 text-gray-300 border-gray-600/50 hover:border-emerald-500/50 hover:text-white'
                              }`}
                            >
                              <Check className="h-3 w-3" />
                              <span className="text-xs">{t('battleFilters.unvotedOnly')}</span>
                            </button>
                          )}

                          {/* Sort Options */}
                          {(showCompletedBattles ? sortButtons.filter((b) => b.key !== 'ending') : sortButtons).map((button) => (
                            <button
                              key={button.key}
                              onClick={() => handleSortClick(button.key as 'recent' | 'trending' | 'ending')}
                              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-300 border flex items-center justify-center gap-1 flex-shrink-0 ${
                                sortBy === button.key
                                  ? `bg-gradient-to-r ${button.colors} text-white border-transparent`
                                  : `bg-gray-800/60 text-gray-300 border-gray-600/50 hover:border-gray-500/50 hover:text-white`
                              }`}
                              title={button.label}
                            >
                              {button.icon}
                              <span className="text-xs">{button.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* アクティブフィルター表示は削除（ユーザー要望） */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};