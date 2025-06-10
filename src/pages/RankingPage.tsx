import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Crown, Search, Users, ArrowUp, ArrowDown, Star, Vote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useRankingStore } from '../store/rankingStore';
import { useTranslation } from 'react-i18next';
import { getRankColorClasses, getWinRateColorClass } from '../utils/rankUtils';

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
  const [sortField, setSortField] = useState<'rating' | 'season_points' | 'win_rate' | 'vote_count'>('rating');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchRankings();
    fetchVoterRankings();
  }, [fetchRankings, fetchVoterRankings]);

  // アクティブタブが切り替わったときにソートフィールドをリセット
  useEffect(() => {
    if (activeTab === 'player') {
      setSortField('rating');
    } else {
      setSortField('vote_count');
    }
    setSortDirection('desc');
  }, [activeTab]);

  const handleSort = (field: 'rating' | 'season_points' | 'win_rate' | 'vote_count') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // データとローディング状態を取得
  const currentData = activeTab === 'player' ? rankings : voterRankings;
  const currentLoading = activeTab === 'player' ? loading : voterLoading;
  const currentError = activeTab === 'player' ? error : voterError;

  // フィルタリングとソート
  const filteredAndSortedData = currentData
    .filter(entry => 
      entry.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      
      if (activeTab === 'player') {
        const aEntry = a as any;
        const bEntry = b as any;
        return (aEntry[sortField] - bEntry[sortField]) * multiplier;
      } else {
        const aEntry = a as any;
        const bEntry = b as any;
        return (aEntry[sortField] - bEntry[sortField]) * multiplier;
      }
    });

  const getPositionBadge = (position: number) => {
    switch (position) {
      case 1:
        return (
          <div className="flex items-center justify-center w-12 h-12 bg-yellow-500/20 rounded-full">
            <Crown className="h-6 w-6 text-yellow-500" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-12 h-12 bg-gray-300/20 rounded-full">
            <Medal className="h-6 w-6 text-gray-300" />
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center w-12 h-12 bg-amber-600/20 rounded-full">
            <Medal className="h-6 w-6 text-amber-600" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-12 h-12 bg-gray-800 rounded-full">
            <span className="text-xl font-bold text-gray-400">{position}</span>
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
      <Badge variant="secondary" className={`${bgColor} ${textColor} text-xs px-2 py-1 font-medium`}>
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
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('rankingPage.searchPlaceholder')}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/50"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Rankings Table */}
        <Card className="bg-gray-900 border border-gray-800 overflow-hidden">
          {currentLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">{t('rankingPage.loading')}</p>
            </div>
          ) : filteredAndSortedData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">{t('rankingPage.table.rank')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">{t('rankingPage.table.user')}</th>
                    
                    {activeTab === 'player' ? (
                      <>
                    <th 
                      className="px-6 py-4 text-center text-sm font-semibold text-gray-400 cursor-pointer"
                      onClick={() => handleSort('rating')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Star className="h-4 w-4" />
                        {t('rankingPage.table.rating')}
                        {sortField === 'rating' && (
                          sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-center text-sm font-semibold text-gray-400 cursor-pointer"
                      onClick={() => handleSort('season_points')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {t('rankingPage.table.seasonPoints')}
                        {sortField === 'season_points' && (
                          sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-center text-sm font-semibold text-gray-400 cursor-pointer"
                      onClick={() => handleSort('win_rate')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {t('rankingPage.table.winRate')}
                        {sortField === 'win_rate' && (
                          sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                      </>
                    ) : (
                      <th 
                        className="px-6 py-4 text-center text-sm font-semibold text-gray-400 cursor-pointer"
                        onClick={() => handleSort('vote_count')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Vote className="h-4 w-4" />
                          {t('rankingPage.table.voteCount')}
                          {sortField === 'vote_count' && (
                            sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedData.map((entry) => {
                    return (
                      <tr 
                        key={entry.user_id}
                        className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            {getPositionBadge(entry.position)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Link to={`/profile/${entry.user_id}`} className="flex items-center gap-3 group">
                            <img
                              src={entry.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user_id}`}
                              alt={entry.username}
                              className="w-12 h-12 rounded-lg object-cover border border-gray-700 group-hover:border-cyan-500/50 transition-colors"
                            />
                            <div>
                              <div className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                                {entry.username}
                              </div>
                            </div>
                          </Link>
                        </td>

                        {activeTab === 'player' ? (
                          <>
                        <td className="px-6 py-4">
                          <div className="text-center">
                                <div className={`text-2xl font-bold ${getRatingColor((entry as any).rating)}`}>
                                  {(entry as any).rating}
                            </div>
                            <div className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                              <Star className="h-3 w-3" />
                              {t('rankingPage.eloRating')}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-center">
                            <div className="text-xl font-bold text-white">
                                  {(entry as any).season_points}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {t('rankingPage.table.seasonPoints')}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-center">
                                <div className={`text-xl font-bold ${getWinRateColorClass((entry as any).win_rate)}`}>
                                  {(entry as any).win_rate}%
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                                  {t('rankingPage.winLossRecord', { wins: (entry as any).battles_won, losses: (entry as any).battles_lost })}
                            </div>
                          </div>
                        </td>
                          </>
                        ) : (
                          <td className="px-6 py-4">
                            <div className="text-center">
                              <div className={`text-2xl font-bold ${getVoteCountColor((entry as any).vote_count)}`}>
                                {(entry as any).vote_count}
                              </div>
                              <div className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                                <Vote className="h-3 w-3" />
                                {t('rankingPage.table.voteCount')}
                              </div>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center">
                <Users className="h-10 w-10 text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">
                {searchQuery ? t('rankingPage.noUsersFound') : t('rankingPage.noRankingsYet')}
              </h3>
              <p className="text-gray-400">
                {searchQuery 
                  ? t('rankingPage.tryDifferentSearch')
                  : t('rankingPage.rankingsWillAppear')
                }
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default RankingPage;