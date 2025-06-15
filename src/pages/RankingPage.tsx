import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Crown, Search, Users, Star, Vote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useRankingStore } from '../store/rankingStore';
import { useTranslation } from 'react-i18next';
import { getRankColorClasses } from '../utils/rankUtils';
import { trackBeatNexusEvents } from '../utils/analytics';

type TabType = 'player' | 'voter';

const RankingPage: React.FC = () => {
  const { t } = useTranslation();
  const { 
    rankings, 
    voterRankings, 
    loading, 
    voterLoading, 
    error, 
    voterError, 
    fetchRankings, 
    fetchVoterRankings 
  } = useRankingStore();
  
  const [activeTab, setActiveTab] = useState<TabType>('player');
  const [searchQuery, setSearchQuery] = useState('');

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Track ranking view event
    trackBeatNexusEvents.rankingView(tab === 'player' ? 'rating' : 'voter');
  };

  useEffect(() => {
    fetchRankings();
    fetchVoterRankings();
    
    // Track initial ranking view
    trackBeatNexusEvents.rankingView('rating');
  }, [fetchRankings, fetchVoterRankings]);

  // データとローディング状態を取得
  const currentData = activeTab === 'player' ? rankings : voterRankings;
  const currentLoading = activeTab === 'player' ? loading : voterLoading;
  const currentError = activeTab === 'player' ? error : voterError;

  // フィルタリング
  const filteredData = currentData.filter(entry => 
    entry.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPositionDisplay = (position: number) => {
    switch (position) {
      case 1:
        return (
          <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg shadow-yellow-500/30">
            <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full shadow-lg shadow-gray-400/30">
            <Medal className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-500 to-amber-700 rounded-full shadow-lg shadow-amber-500/30">
            <Medal className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full shadow-lg border border-gray-600">
            <span className="text-sm sm:text-xl font-bold text-white">#{position}</span>
          </div>
        );
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 1800) return 'text-purple-400';
    if (rating >= 1600) return 'text-purple-400';
    if (rating >= 1400) return 'text-blue-400';
    if (rating >= 1300) return 'text-green-400';
    if (rating >= 1200) return 'text-yellow-400';
    if (rating >= 1100) return 'text-gray-400';
    return 'text-gray-500';
  };

  const getVoteCountColor = (voteCount: number) => {
    if (voteCount >= 100) return 'text-purple-400';
    if (voteCount >= 50) return 'text-blue-400';
    if (voteCount >= 25) return 'text-green-400';
    if (voteCount >= 10) return 'text-yellow-400';
    if (voteCount >= 5) return 'text-gray-400';
    return 'text-gray-500';
  };

  const getTierBadge = (rankName: string, rankColor: string) => {
    const { bgColor, textColor } = getRankColorClasses(rankColor);

    return (
      <Badge variant="secondary" className={`${bgColor} ${textColor} text-xs px-2 sm:px-3 py-1 font-medium`}>
        {rankName}
      </Badge>
    );
  };

  const getEntryGradient = (position: number) => {
    if (position === 1) return 'from-yellow-500/20 via-yellow-600/10 to-transparent';
    if (position === 2) return 'from-gray-400/20 via-gray-500/10 to-transparent';
    if (position === 3) return 'from-amber-500/20 via-amber-600/10 to-transparent';
    if (position <= 10) return 'from-cyan-500/10 via-blue-500/5 to-transparent';
    return 'from-gray-800/30 via-gray-900/20 to-transparent';
  };

  if (currentError) {
    return (
      <div className="min-h-screen bg-gray-950 py-10">
        <div className="container mx-auto px-4">
          <Card className="bg-gray-900 border border-red-500/20 p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <Trophy className="h-10 w-10 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">{t('rankingPage.error.title')}</h3>
            <p className="text-gray-400 mb-6">{currentError}</p>
            <button
              onClick={() => activeTab === 'player' ? fetchRankings() : fetchVoterRankings()}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              {t('rankingPage.error.tryAgain')}
            </button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-6 sm:py-10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="relative">
            {/* 背景のグラデーション効果 */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 blur-3xl transform -translate-y-4"></div>
            
            <div className="relative">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
                <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {t('rankingPage.title')}
                </span>
              </h1>
              
              <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-12 sm:w-16 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                <div className="p-2 sm:p-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl border border-yellow-500/30 backdrop-blur-sm">
                  <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
                </div>
                <div className="w-12 sm:w-16 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
              </div>
              
              <p className="text-gray-300 max-w-3xl mx-auto text-base sm:text-lg leading-relaxed px-4">
                {t('rankingPage.description')}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 sm:mb-8">
          <div className="flex justify-center">
            <div className="relative bg-gray-900/50 backdrop-blur-sm p-1 sm:p-2 rounded-xl sm:rounded-2xl border border-gray-700/50 shadow-2xl w-full max-w-md sm:max-w-none">
              {/* アクティブタブの背景アニメーション */}
              <div 
                className={`absolute top-1 bottom-1 left-1 sm:top-2 sm:bottom-2 sm:left-2 rounded-lg sm:rounded-xl transition-all duration-300 ease-out ${
                  activeTab === 'player' 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/25' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25'
                }`}
                style={{ 
                  width: 'calc(50% - 4px)',
                  transform: activeTab === 'player' ? 'translateX(0)' : 'translateX(calc(100% + 4px))'
                }}
              />
              
              <div className="relative flex">
                <button
                  onClick={() => handleTabChange('player')}
                  className={`px-4 py-3 sm:px-8 sm:py-4 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 sm:gap-3 relative z-10 flex-1 justify-center ${
                    activeTab === 'player'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <div className={`p-1 sm:p-2 rounded-md sm:rounded-lg transition-all duration-300 ${
                    activeTab === 'player' 
                      ? 'bg-white/20 backdrop-blur-sm' 
                      : 'bg-gray-800/50'
                  }`}>
                    <Star className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold tracking-wide">
                    {t('rankingPage.tabs.playerRankings')}
                  </span>
                </button>
                
                <button
                  onClick={() => handleTabChange('voter')}
                  className={`px-4 py-3 sm:px-8 sm:py-4 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 sm:gap-3 relative z-10 flex-1 justify-center ${
                    activeTab === 'voter'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <div className={`p-1 sm:p-2 rounded-md sm:rounded-lg transition-all duration-300 ${
                    activeTab === 'voter' 
                      ? 'bg-white/20 backdrop-blur-sm' 
                      : 'bg-gray-800/50'
                  }`}>
                    <Vote className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold tracking-wide">
                    {t('rankingPage.tabs.voterRankings')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Description */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="relative overflow-hidden">
            <div 
              className={`transition-all duration-500 ease-in-out ${
                activeTab === 'player' ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-4'
              }`}
              style={{ display: activeTab === 'player' ? 'block' : 'none' }}
            >
              <div className="inline-flex items-center gap-2 sm:gap-3 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl sm:rounded-2xl border border-cyan-500/20 backdrop-blur-sm">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <p className="text-cyan-100 font-medium text-xs sm:text-sm">
                  {t('rankingPage.playerDescription')}
                </p>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              </div>
            </div>
            
            <div 
              className={`transition-all duration-500 ease-in-out ${
                activeTab === 'voter' ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-4'
              }`}
              style={{ display: activeTab === 'voter' ? 'block' : 'none' }}
            >
              <div className="inline-flex items-center gap-2 sm:gap-3 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl sm:rounded-2xl border border-purple-500/20 backdrop-blur-sm">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <p className="text-purple-100 font-medium text-xs sm:text-sm">
                  {t('rankingPage.voterDescription')}
                </p>
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 sm:mb-8">
          <div className="relative max-w-sm sm:max-w-md mx-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('rankingPage.searchPlaceholder')}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-10 sm:pl-12 pr-4 py-3 sm:py-4 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 focus:bg-gray-800 transition-all backdrop-blur-sm text-sm sm:text-base"
            />
            <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </div>
        </div>

        {/* Rankings List */}
        {currentLoading ? (
          <div className="text-center py-12 sm:py-16">
            <div className="animate-spin w-12 h-12 sm:w-16 sm:h-16 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4 sm:mb-6"></div>
            <p className="text-gray-400 text-base sm:text-lg">{t('rankingPage.loading')}</p>
          </div>
        ) : filteredData.length > 0 ? (
          <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
            {filteredData.map((entry, index) => {
              const isTopThree = entry.position <= 3;
              const isTopTen = entry.position <= 10;
              return (
                <div 
                  key={entry.user_id}
                  className={`relative group cursor-pointer transform hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 ${
                    isTopThree ? 'hover:shadow-2xl hover:shadow-yellow-500/20' : 'hover:shadow-xl hover:shadow-cyan-500/10'
                  }`}
                >
                  {/* Background Card */}
                  <div className={`relative bg-gradient-to-r ${getEntryGradient(entry.position)} backdrop-blur-sm rounded-xl sm:rounded-2xl border ${
                    isTopThree 
                      ? 'border-yellow-500/30 shadow-lg shadow-yellow-500/10' 
                      : isTopTen 
                        ? 'border-cyan-500/20 shadow-md shadow-cyan-500/5'
                        : 'border-gray-700/50'
                  } overflow-hidden`}>
                    
                    {/* Animated Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
                    </div>

                    <Link to={`/profile/${entry.user_id}`} className="block p-4 sm:p-6">
                      <div className="flex items-center gap-3 sm:gap-6">
                        {/* Position */}
                        <div className="flex-shrink-0">
                          {getPositionDisplay(entry.position)}
                        </div>

                        {/* User Avatar & Info */}
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <img
                            src={entry.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user_id}`}
                            alt={entry.username}
                            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 sm:border-4 border-gray-700 group-hover:border-cyan-500/50 transition-colors shadow-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-xl font-bold text-white group-hover:text-cyan-400 transition-colors truncate">
                              {entry.username}
                            </h3>
                            <div className="mt-1">
                              {getTierBadge((entry as any).rank_name, (entry as any).rank_color)}
                            </div>
                          </div>
                        </div>

                        {/* Rating/Vote Count */}
                        <div className="flex-shrink-0 text-right">
                          {activeTab === 'player' ? (
                            <div>
                              <div className={`text-xl sm:text-3xl font-bold mb-1 ${getRatingColor((entry as any).rating)}`}>
                                {(entry as any).rating}
                              </div>
                              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-400">
                                <Star className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline">{t('profilePage.seasonRating')}</span>
                                <span className="sm:hidden">レート</span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className={`text-xl sm:text-3xl font-bold mb-1 ${getVoteCountColor((entry as any).vote_count)}`}>
                                {(entry as any).vote_count}
                              </div>
                              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-400">
                                <Vote className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline">{t('rankingPage.table.voteCount')}</span>
                                <span className="sm:hidden">投票</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 sm:py-16">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 sm:mb-8 rounded-full bg-gray-800 flex items-center justify-center">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 text-gray-600" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4">
              {searchQuery ? t('rankingPage.noUsersFound') : t('rankingPage.noRankingsYet')}
            </h3>
            <p className="text-gray-400 text-base sm:text-lg">
              {searchQuery 
                ? t('rankingPage.tryDifferentSearch')
                : t('rankingPage.rankingsWillAppear')
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RankingPage;