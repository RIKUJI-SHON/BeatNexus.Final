import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Crown, Search, Users, Star, Vote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useRankingStore } from '../store/rankingStore';
import { useTranslation } from 'react-i18next';
import { getRankColorClasses } from '../utils/rankUtils';

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

  useEffect(() => {
    fetchRankings();
    fetchVoterRankings();
  }, [fetchRankings, fetchVoterRankings]);

  // データとローディング状態を取得
  const currentData = activeTab === 'player' ? rankings : voterRankings;
  const currentLoading = activeTab === 'player' ? loading : voterLoading;
  const currentError = activeTab === 'player' ? error : voterError;

  // フィルタリング
  const filteredData = currentData.filter(entry => 
    entry.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPositionBadge = (position: number) => {
    switch (position) {
      case 1:
        return (
          <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg">
            <Crown className="h-8 w-8 text-white" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full shadow-lg">
            <Medal className="h-8 w-8 text-white" />
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-700 rounded-full shadow-lg">
            <Medal className="h-8 w-8 text-white" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full shadow-lg border border-gray-600">
            <span className="text-2xl font-bold text-white">{position}</span>
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
      <Badge variant="secondary" className={`${bgColor} ${textColor} text-xs px-3 py-1 font-medium`}>
        {rankName}
      </Badge>
    );
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
    <div className="min-h-screen bg-gray-950 py-10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="relative">
            {/* 背景のグラデーション効果 */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 blur-3xl transform -translate-y-4"></div>
            
            <div className="relative">
              <h1 className="text-5xl lg:text-6xl font-bold mb-6">
                <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {t('rankingPage.title')}
                </span>
              </h1>
              
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="w-16 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                <div className="p-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl border border-yellow-500/30 backdrop-blur-sm">
                  <Trophy className="h-8 w-8 text-yellow-400" />
                </div>
                <div className="w-16 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
              </div>
              
              <p className="text-gray-300 max-w-3xl mx-auto text-lg leading-relaxed">
                {t('rankingPage.description')}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex justify-center">
            <div className="relative bg-gray-900/50 backdrop-blur-sm p-2 rounded-2xl border border-gray-700/50 shadow-2xl">
              {/* アクティブタブの背景アニメーション */}
              <div 
                className={`absolute top-2 bottom-2 left-2 rounded-xl transition-all duration-300 ease-out ${
                  activeTab === 'player' 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/25' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25'
                }`}
                style={{ 
                  width: 'calc(50% - 8px)',
                  transform: activeTab === 'player' ? 'translateX(0)' : 'translateX(calc(100% + 8px))'
                }}
              />
              
              <div className="relative flex">
                <button
                  onClick={() => setActiveTab('player')}
                  className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center gap-3 relative z-10 min-w-[180px] justify-center ${
                    activeTab === 'player'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-all duration-300 ${
                    activeTab === 'player' 
                      ? 'bg-white/20 backdrop-blur-sm' 
                      : 'bg-gray-800/50'
                  }`}>
                    <Star className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold tracking-wide">
                    {t('rankingPage.tabs.playerRankings')}
                  </span>
                </button>
                
                <button
                  onClick={() => setActiveTab('voter')}
                  className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center gap-3 relative z-10 min-w-[180px] justify-center ${
                    activeTab === 'voter'
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-all duration-300 ${
                    activeTab === 'voter' 
                      ? 'bg-white/20 backdrop-blur-sm' 
                      : 'bg-gray-800/50'
                  }`}>
                    <Vote className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold tracking-wide">
                    {t('rankingPage.tabs.voterRankings')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Description */}
        <div className="text-center mb-10">
          <div className="relative overflow-hidden">
            <div 
              className={`transition-all duration-500 ease-in-out ${
                activeTab === 'player' ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-4'
              }`}
              style={{ display: activeTab === 'player' ? 'block' : 'none' }}
            >
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-2xl border border-cyan-500/20 backdrop-blur-sm">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <p className="text-cyan-100 font-medium text-sm">
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
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/20 backdrop-blur-sm">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <p className="text-purple-100 font-medium text-sm">
                  {t('rankingPage.voterDescription')}
                </p>
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('rankingPage.searchPlaceholder')}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 focus:bg-gray-800 transition-all backdrop-blur-sm"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Rankings Cards */}
        {currentLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-6"></div>
            <p className="text-gray-400 text-lg">{t('rankingPage.loading')}</p>
          </div>
        ) : filteredData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredData.map((entry) => {
              const isTopThree = entry.position <= 3;
              return (
                <Card 
                  key={entry.user_id}
                  className={`relative bg-gradient-to-br from-gray-900 to-gray-950 text-white hover:shadow-2xl transform hover:-translate-y-1 hover:scale-[1.02] transition-all duration-500 overflow-hidden border ${
                    isTopThree 
                      ? 'border-yellow-500/30 shadow-lg shadow-yellow-500/10' 
                      : 'border-gray-700/50'
                  } backdrop-blur-sm group`}
                >
                  {/* Animated Background Pattern */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
                  </div>

                  <div className="relative p-6">
                    {/* Position Badge */}
                    <div className="flex justify-center mb-6">
                      {getPositionBadge(entry.position)}
                    </div>

                    {/* User Info */}
                    <Link to={`/profile/${entry.user_id}`} className="block group/link">
                      <div className="flex flex-col items-center text-center mb-6">
                        <img
                          src={entry.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user_id}`}
                          alt={entry.username}
                          className="w-20 h-20 rounded-full object-cover border-4 border-gray-700 group-hover/link:border-cyan-500/50 transition-colors mb-4 shadow-lg"
                        />
                        <h3 className="text-xl font-bold text-white group-hover/link:text-cyan-400 transition-colors mb-2 truncate max-w-full">
                          {entry.username}
                        </h3>
                        {getTierBadge((entry as any).rank_name, (entry as any).rank_color)}
                      </div>
                    </Link>

                    {/* Rating/Vote Count */}
                    <div className="text-center">
                      {activeTab === 'player' ? (
                        <div>
                          <div className={`text-4xl font-bold mb-2 ${getRatingColor((entry as any).rating)}`}>
                            {(entry as any).rating}
                          </div>
                          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                            <Star className="h-4 w-4" />
                            <span>{t('profilePage.seasonRating')}</span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className={`text-4xl font-bold mb-2 ${getVoteCountColor((entry as any).vote_count)}`}>
                            {(entry as any).vote_count}
                          </div>
                          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                            <Vote className="h-4 w-4" />
                            <span>{t('rankingPage.table.voteCount')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gray-800 flex items-center justify-center">
              <Users className="h-12 w-12 text-gray-600" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-4">
              {searchQuery ? t('rankingPage.noUsersFound') : t('rankingPage.noRankingsYet')}
            </h3>
            <p className="text-gray-400 text-lg">
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