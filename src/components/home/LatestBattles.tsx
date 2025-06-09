import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trophy, Crown, ArrowRight, Users, Mic, Medal, Star } from 'lucide-react';
import { BattleCard } from '../battle/BattleCard';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useRankingStore } from '../../store/rankingStore';
import { useBattleStore } from '../../store/battleStore';
import { useTranslation } from 'react-i18next';
import { getRankColorClasses } from '../../utils/rankUtils';

const LatestBattles: React.FC = () => {
  const { t } = useTranslation();
  const { rankings, fetchRankings } = useRankingStore();
  const { battles, loading, error, fetchBattles } = useBattleStore();
  
  React.useEffect(() => {
    const initializeData = async () => {
      try {
        await fetchBattles();
        await fetchRankings(); // ランキングデータも明示的に取得
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    initializeData();
  }, [fetchBattles, fetchRankings]);
  
  // Get top 3 rankings for sidebar
  const topRankings = rankings.slice(0, 3);
  
  // Only show first 10 battles on home page
  const displayedBattles = battles.slice(0, 10);

  const getPositionBadge = (position: number) => {
    switch (position) {
      case 1:
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-yellow-500/20 rounded-full">
            <Crown className="h-4 w-4 text-yellow-500" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-gray-300/20 rounded-full">
            <Medal className="h-4 w-4 text-gray-300" />
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-amber-600/20 rounded-full">
            <Medal className="h-4 w-4 text-amber-600" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-gray-800 rounded-full">
            <span className="text-sm font-bold text-gray-400">{position}</span>
          </div>
        );
    }
  };

  const getTierBadge = (rankName: string, rankColor: string) => {
    const { bgColor, textColor } = getRankColorClasses(rankColor);

    return (
      <Badge variant="secondary" className={`${bgColor} ${textColor} text-xs px-2 py-1 font-medium`}>
        {rankName}
      </Badge>
    );
  };

  return (
    <section className="py-16 bg-gray-950">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">{t('latestBattles.title')}</h2>
            <p className="text-gray-400 mt-2">{t('latestBattles.description')}</p>
          </div>
          
          <Link 
            to="/post"
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="h-5 w-5" />
            {t('latestBattles.createBattle')}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Battles List */}
          <div className="lg:col-span-3 space-y-6">
            {loading ? (
              <Card className="bg-gray-900 border border-gray-800 p-8 text-center">
                <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">{t('latestBattles.loading')}</p>
              </Card>
            ) : error ? (
              <Card className="bg-gray-900 border border-red-500/20 p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Trophy className="h-10 w-10 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">{t('latestBattles.error.title')}</h3>
                <p className="text-gray-400 mb-6">{error}</p>
                <Button
                  variant="primary"
                  onClick={() => fetchBattles()}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {t('latestBattles.error.tryAgain')}
                </Button>
              </Card>
            ) : displayedBattles.length > 0 ? (
              <>
                {displayedBattles.map(battle => (
                  <BattleCard key={battle.id} battle={battle} />
                ))}
                
                <div className="text-center mt-8">
                  <Link 
                    to="/battles"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-white font-bold hover:opacity-90 transition-opacity"
                  >
                    {t('latestBattles.viewMore')}
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </div>
              </>
            ) : (
              <Card className="bg-gray-900 border border-gray-800 p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center">
                  <Mic className="h-10 w-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">{t('latestBattles.noBattles.title')}</h3>
                <p className="text-gray-400 mb-6">
                  {t('latestBattles.noBattles.description')}
                </p>
                <Link to="/post">
                  <Button
                    variant="primary"
                    className="bg-gradient-to-r from-cyan-500 to-purple-500"
                    leftIcon={<Plus className="h-5 w-5" />}
                  >
                    {t('latestBattles.noBattles.createFirst')}
                  </Button>
                </Link>
              </Card>
            )}
          </div>

          {/* Rankings Sidebar - Updated to match RankingPage style */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <h2 className="text-base font-bold text-white whitespace-nowrap">{t('latestBattles.ranking.title')}</h2>
                </div>
                <Link 
                  to="/ranking"
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-sm"
                >
                  {t('latestBattles.ranking.viewAll')}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {topRankings.length > 0 ? (
                <div className="space-y-4">
                  {topRankings.map((entry, index) => (
                    <Link 
                      key={entry.user_id}
                      to={`/profile/${entry.user_id}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors group"
                    >
                      <div className="flex items-center justify-center">
                        {getPositionBadge(entry.position)}
                      </div>
                      
                      <img
                        src={entry.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user_id}`}
                        alt={entry.username}
                        className="w-10 h-10 rounded-lg object-cover border border-gray-700 group-hover:border-cyan-500/50 transition-colors"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white group-hover:text-cyan-400 transition-colors truncate">
                          {entry.username}
                        </div>
                        <div className="flex gap-2 mt-1">
                          {getTierBadge(entry.rank_name, entry.rank_color)}
                          <Badge
                            variant="secondary"
                            className="bg-cyan-500/20 text-cyan-300 text-xs"
                          >
                            {entry.season_points}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                    <Users className="h-8 w-8 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{t('latestBattles.ranking.noRankings.title')}</h3>
                  <p className="text-gray-400 text-sm">
                    {t('latestBattles.ranking.noRankings.description')}
                  </p>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-800">
                <div className="text-center text-sm text-gray-400">
                  {t('latestBattles.ranking.seasonEnds', { days: 14 })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LatestBattles;