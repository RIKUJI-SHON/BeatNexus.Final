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

  const getRatingWithRankColor = (rating: number, rankColor: string) => {
    console.log('Rating:', rating, 'Rank Color:', rankColor);
    
    // 直接的な色指定でランクカラーをマッピング
    let colorClass = '';
    switch (rankColor) {
      case 'rainbow':
        colorClass = 'text-purple-400';
        break;
      case 'purple':
        colorClass = 'text-purple-400';
        break;
      case 'blue':
        colorClass = 'text-blue-400';
        break;
      case 'green':
        colorClass = 'text-green-400';
        break;
      case 'yellow':
        colorClass = 'text-yellow-400';
        break;
      case 'gray':
        colorClass = 'text-gray-400';
        break;
      default:
        colorClass = 'text-white';
    }
    
    return (
      <span className={`text-sm font-bold ${colorClass}`}>
        {rating}
      </span>
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

          {/* Rankings Sidebar - BattleCard統一デザイン */}
          <div className="lg:col-span-1">
            <Card className="group relative bg-gradient-to-br from-gray-900 via-gray-850 to-gray-950 border border-gray-700/50 shadow-xl hover:shadow-2xl hover:shadow-yellow-500/10 transition-all duration-500 rounded-xl overflow-hidden backdrop-blur-sm sticky top-24">
              
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
              </div>

              <div className="relative p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30 backdrop-blur-sm">
                      <Trophy className="h-5 w-5 text-yellow-400" />
                    </div>
                    <h2 className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                      {t('latestBattles.ranking.title')}
                    </h2>
                  </div>
                  <Link 
                    to="/ranking"
                    className="group/link flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 transition-all duration-300 backdrop-blur-sm"
                  >
                    <span className="text-xs font-medium">{t('latestBattles.ranking.viewAll')}</span>
                    <ArrowRight className="h-3 w-3 group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* Rankings Content */}
                {topRankings.length > 0 ? (
                  <div className="space-y-3">
                    {topRankings.map((entry, index) => {
                      const getPositionBadge = (position: number) => {
                        switch (position) {
                          case 1:
                            return (
                              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl border border-yellow-500/40">
                                <Crown className="h-5 w-5 text-yellow-400" />
                              </div>
                            );
                          case 2:
                            return (
                              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-gray-400/20 to-gray-300/20 rounded-xl border border-gray-400/40">
                                <Medal className="h-5 w-5 text-gray-300" />
                              </div>
                            );
                          case 3:
                            return (
                              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-xl border border-amber-600/40">
                                <Medal className="h-5 w-5 text-amber-500" />
                              </div>
                            );
                          default:
                            return (
                              <div className="flex items-center justify-center w-10 h-10 bg-gray-800/80 rounded-xl border border-gray-700/50">
                                <span className="text-sm font-bold text-gray-400">{position}</span>
                              </div>
                            );
                        }
                      };

                      return (
                        <Link 
                          key={entry.user_id}
                          to={`/profile/${entry.user_id}`}
                          className="group/player flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-800/60 to-gray-700/60 border border-gray-700/50 hover:border-cyan-500/50 hover:bg-gradient-to-r hover:from-gray-800/80 hover:to-gray-700/80 transition-all duration-300 backdrop-blur-sm"
                        >
                          {getPositionBadge(entry.position)}
                          
                          <div className="relative">
                            <img
                              src={entry.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user_id}`}
                              alt={entry.username}
                              className="w-12 h-12 rounded-xl object-cover border-2 border-gray-600/50 group-hover/player:border-cyan-500/70 transition-all duration-300"
                            />
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/0 to-purple-500/0 group-hover/player:from-cyan-500/20 group-hover/player:to-purple-500/20 transition-all duration-300"></div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white group-hover/player:text-transparent group-hover/player:bg-clip-text group-hover/player:bg-gradient-to-r group-hover/player:from-cyan-400 group-hover/player:to-purple-400 transition-all duration-300 truncate text-sm">
                              {entry.username}
                            </div>
                            <div className="mt-1.5">
                              {getRatingWithRankColor(entry.season_points, entry.rank_color)}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-r from-gray-800/60 to-gray-700/60 border border-gray-700/50 flex items-center justify-center">
                      <Users className="h-8 w-8 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{t('latestBattles.ranking.noRankings.title')}</h3>
                    <p className="text-gray-400 text-sm">{t('latestBattles.ranking.noRankings.description')}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LatestBattles;