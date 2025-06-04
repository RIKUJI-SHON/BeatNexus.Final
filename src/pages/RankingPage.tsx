import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Crown, Search, Users, ArrowUp, ArrowDown, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useRankingStore } from '../store/rankingStore';
import { useTranslation } from 'react-i18next';
import { getRankColorClasses, getWinRateColorClass } from '../utils/rankUtils';

const RankingPage: React.FC = () => {
  const { t } = useTranslation();
  const { rankings, loading, error, fetchRankings } = useRankingStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'rating' | 'season_points' | 'win_rate'>('rating');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const handleSort = (field: 'rating' | 'season_points' | 'win_rate') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedRankings = rankings
    .filter(entry => 
      entry.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      return (a[sortField] - b[sortField]) * multiplier;
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

  const getTierBadge = (rankName: string, rankColor: string) => {
    const { bgColor, textColor } = getRankColorClasses(rankColor);

    return (
      <Badge variant="secondary" className={`${bgColor} ${textColor} text-xs px-2 py-1 font-medium`}>
        {rankName}
      </Badge>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 py-10">
        <div className="container mx-auto px-4">
          <Card className="bg-gray-900 border border-red-500/20 p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <Trophy className="h-10 w-10 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">{t('rankingPage.error.title')}</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => fetchRankings()}
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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            {t('rankingPage.title')}
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            {t('rankingPage.description')}
          </p>
        </div>

        {/* Search and Stats */}
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
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">{t('rankingPage.loading')}</p>
            </div>
          ) : filteredAndSortedRankings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">{t('rankingPage.table.rank')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">{t('rankingPage.table.user')}</th>
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
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedRankings.map((entry) => {
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
                              <div className="flex gap-2 mt-1">
                                {getTierBadge(entry.rank_name, entry.rank_color)}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${getRatingColor(entry.rating)}`}>
                              {entry.rating}
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
                              {entry.season_points}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {t('rankingPage.table.seasonPoints')}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-center">
                            <div className={`text-xl font-bold ${getWinRateColorClass(entry.win_rate)}`}>
                              {entry.win_rate}%
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {t('rankingPage.winLossRecord', { wins: entry.battles_won, losses: entry.battles_lost })}
                            </div>
                          </div>
                        </td>
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