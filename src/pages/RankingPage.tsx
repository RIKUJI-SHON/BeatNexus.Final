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
  
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [voterSearchQuery, setVoterSearchQuery] = useState('');

  useEffect(() => {
    fetchRankings();
    fetchVoterRankings();
    
    // Track initial ranking view
    trackBeatNexusEvents.rankingView('rating');
  }, [fetchRankings, fetchVoterRankings]);

  // フィルタリング
  const filteredPlayerData = rankings.filter(entry => 
    entry.username.toLowerCase().includes(playerSearchQuery.toLowerCase())
  );
  
  const filteredVoterData = voterRankings.filter(entry => 
    entry.username.toLowerCase().includes(voterSearchQuery.toLowerCase())
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

  if (error || voterError) {
    return (
      <div className="min-h-screen bg-gray-950 py-10">
        <div className="container mx-auto px-4">
          <Card className="bg-gray-900 border border-red-500/20 p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <Trophy className="h-10 w-10 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">{t('rankingPage.error.title')}</h3>
            <p className="text-gray-400 mb-6">{error || voterError}</p>
            <button
              onClick={() => {
                fetchRankings();
                fetchVoterRankings();
              }}
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
              <div className="mb-4 sm:mb-6">
                <img 
                  src="/images/ranking-title-badge.png" 
                  alt="Ranking"
                  className="mx-auto max-w-xs sm:max-w-sm md:max-w-md h-auto"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2カラムレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

          {/* プレイヤーランキング（左カラム） */}
          <div className="space-y-6">
            {/* ヘッダー */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20 backdrop-blur-sm mb-4">
                <Star className="h-5 w-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-cyan-100">{t('rankingPage.tabs.playerRankings')}</h2>
              </div>
              
              {/* 検索欄 */}
              <div className="relative max-w-sm mx-auto mb-6">
                <input
                  type="text"
                  value={playerSearchQuery}
                  onChange={(e) => setPlayerSearchQuery(e.target.value)}
                  placeholder={t('rankingPage.searchPlaceholder')}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 focus:bg-gray-800 transition-all backdrop-blur-sm text-sm"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* プレイヤーランキングリスト */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">{t('rankingPage.loading')}</p>
              </div>
            ) : filteredPlayerData.length > 0 ? (
              <div className="bg-gray-900/50 border border-cyan-500/20 rounded-xl backdrop-blur-sm overflow-hidden">
                {/* ヘッダー */}
                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 px-4 py-3 border-b border-cyan-500/20">
                  <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-300 uppercase tracking-wider">
                    <div className="col-span-2 text-center">Rank</div>
                    <div className="col-span-6">Player</div>
                    <div className="col-span-2 text-center">Rating</div>
                    <div className="col-span-2 text-center">Tier</div>
                  </div>
                </div>
                
                {/* リスト */}
                <div className="divide-y divide-gray-700/50">
                  {filteredPlayerData.slice(0, 15).map((entry) => {
                    const isTopThree = entry.position <= 3;
                    return (
                      <Link 
                        key={entry.user_id} 
                        to={`/profile/${entry.user_id}`}
                        className={`block px-4 py-3 hover:bg-cyan-500/5 transition-colors group ${
                          isTopThree ? 'bg-gradient-to-r from-cyan-500/5 to-blue-500/5' : ''
                        }`}
                      >
                        <div className="grid grid-cols-12 gap-4 items-center">
                          {/* ランク */}
                          <div className="col-span-2 text-center">
                            {getPositionDisplay(entry.position)}
                          </div>
                          
                          {/* プレイヤー情報 */}
                          <div className="col-span-6 flex items-center gap-3 min-w-0">
                            <img
                              src={entry.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user_id}`}
                              alt={entry.username}
                              className="w-8 h-8 rounded-full object-cover border border-gray-600 group-hover:border-cyan-500/50 transition-colors"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-white text-sm truncate group-hover:text-cyan-400 transition-colors">
                                {entry.username}
                              </div>
                            </div>
                          </div>
                          
                          {/* レーティング */}
                          <div className="col-span-2 text-center">
                            <span className={`font-bold text-sm ${getRatingColor(entry.rating || 0)}`}>
                              {entry.rating || 0}
                            </span>
                          </div>
                          
                          {/* ティア */}
                          <div className="col-span-2 text-center">
                            {getTierBadge(entry.rank_name || 'Unranked', entry.rank_color || 'gray')}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">
                  {playerSearchQuery ? t('rankingPage.noSearchResults') : t('rankingPage.noData')}
                </p>
              </div>
            )}
          </div>

          {/* 投票者ランキング（右カラム） */}
          <div className="space-y-6">
            {/* ヘッダー */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20 backdrop-blur-sm mb-4">
                <Vote className="h-5 w-5 text-purple-400" />
                <h2 className="text-lg font-bold text-purple-100">{t('rankingPage.tabs.voterRankings')}</h2>
              </div>
              
              {/* 検索欄 */}
              <div className="relative max-w-sm mx-auto mb-6">
                <input
                  type="text"
                  value={voterSearchQuery}
                  onChange={(e) => setVoterSearchQuery(e.target.value)}
                  placeholder={t('rankingPage.searchPlaceholder')}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:bg-gray-800 transition-all backdrop-blur-sm text-sm"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* 投票者ランキングリスト */}
            {voterLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">{t('rankingPage.loading')}</p>
              </div>
            ) : filteredVoterData.length > 0 ? (
              <div className="bg-gray-900/50 border border-purple-500/20 rounded-xl backdrop-blur-sm overflow-hidden">
                {/* ヘッダー */}
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 px-4 py-3 border-b border-purple-500/20">
                  <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-300 uppercase tracking-wider">
                    <div className="col-span-2 text-center">Rank</div>
                    <div className="col-span-6">Voter</div>
                    <div className="col-span-2 text-center">Votes</div>
                    <div className="col-span-2 text-center">Level</div>
                  </div>
                </div>
                
                {/* リスト */}
                <div className="divide-y divide-gray-700/50">
                  {filteredVoterData.slice(0, 15).map((entry) => {
                    const isTopThree = entry.position <= 3;
                    const contributionLevel = (entry.vote_count || 0) > 100 ? 'Expert' : 
                      (entry.vote_count || 0) > 50 ? 'Advanced' : 
                      (entry.vote_count || 0) > 25 ? 'Regular' : 
                      (entry.vote_count || 0) > 10 ? 'Active' : 'Beginner';
                    
                    return (
                      <Link 
                        key={entry.user_id} 
                        to={`/profile/${entry.user_id}`}
                        className={`block px-4 py-3 hover:bg-purple-500/5 transition-colors group ${
                          isTopThree ? 'bg-gradient-to-r from-purple-500/5 to-pink-500/5' : ''
                        }`}
                      >
                        <div className="grid grid-cols-12 gap-4 items-center">
                          {/* ランク */}
                          <div className="col-span-2 text-center">
                            {getPositionDisplay(entry.position)}
                          </div>
                          
                          {/* 投票者情報 */}
                          <div className="col-span-6 flex items-center gap-3 min-w-0">
                            <img
                              src={entry.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user_id}`}
                              alt={entry.username}
                              className="w-8 h-8 rounded-full object-cover border border-gray-600 group-hover:border-purple-500/50 transition-colors"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-white text-sm truncate group-hover:text-purple-400 transition-colors">
                                {entry.username}
                              </div>
                            </div>
                          </div>
                          
                          {/* 投票数 */}
                          <div className="col-span-2 text-center">
                            <span className={`font-bold text-sm ${getVoteCountColor(entry.vote_count || 0)}`}>
                              {entry.vote_count || 0}
                            </span>
                          </div>
                          
                          {/* 貢献レベル */}
                          <div className="col-span-2 text-center">
                            <span className="text-xs font-medium text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md">
                              {contributionLevel}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">
                  {voterSearchQuery ? t('rankingPage.noSearchResults') : t('rankingPage.noData')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RankingPage;