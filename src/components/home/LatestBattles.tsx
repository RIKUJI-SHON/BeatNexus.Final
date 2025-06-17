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

          {/* Rankings Sidebar - BattlesPageと統一デザイン */}
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-20 lg:h-fit z-10">
            
            {/* Top Rankings - Direct Display */}
            <div>
              {/* Header - Centered Title */}
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <img
                    src="/images/ranking-title-badge.png"
                    alt={t('latestBattles.ranking.title')}
                    className="w-[320px] h-[60px] object-contain"
                    onError={(e) => {
                      // フォールバックとしてテキストとアイコンを表示
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.fallback-title')) {
                        const fallbackContainer = document.createElement('div');
                        fallbackContainer.className = 'fallback-title flex items-center gap-2';
                        
                        const trophyIcon = document.createElement('div');
                        trophyIcon.innerHTML = '<svg class="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>';
                        
                        const fallbackText = document.createElement('h2');
                        fallbackText.className = 'text-lg font-bold text-yellow-400';
                        fallbackText.textContent = 'トップランキング';
                        
                        fallbackContainer.appendChild(trophyIcon);
                        fallbackContainer.appendChild(fallbackText);
                        parent.appendChild(fallbackContainer);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Rankings Content */}
              {rankings.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p className="text-sm">{t('battleFilters.loading')}</p>
                </div>
              ) : topRankings.length > 0 ? (
                <div className="space-y-3">
                  {topRankings.map((entry, index) => {
                    const getPositionIcon = (position: number) => {
                      switch (position) {
                        case 1:
                          return <Crown className="h-4 w-4 text-yellow-400" />;
                        case 2:
                          return <Medal className="h-4 w-4 text-gray-300" />;
                        case 3:
                          return <Medal className="h-4 w-4 text-amber-500" />;
                        default:
                          return <span className="text-sm font-bold text-gray-400">#{position}</span>;
                      }
                    };

                    const getRatingColor = (rankColor: string) => {
                      switch (rankColor) {
                        case 'rainbow':
                        case 'purple':
                          return 'text-purple-400';
                        case 'blue':
                          return 'text-blue-400';
                        case 'green':
                          return 'text-green-400';
                        case 'yellow':
                          return 'text-yellow-400';
                        case 'gray':
                          return 'text-gray-400';
                        default:
                          return 'text-white';
                      }
                    };

                    return (
                      <Link 
                        key={entry.user_id}
                        to={`/profile/${entry.user_id}`}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/30 transition-all duration-300 group"
                      >
                        <div className="flex items-center justify-center w-8 h-8">
                          {getPositionIcon(entry.position)}
                        </div>
                        
                        <img
                          src={entry.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user_id}`}
                          alt={entry.username}
                          className="w-10 h-10 rounded-lg object-cover border border-gray-600/50 group-hover:border-cyan-500/50 transition-colors"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate text-sm group-hover:text-cyan-400 transition-colors">
                            {entry.username}
                          </div>
                          <div className={`text-sm font-bold ${getRatingColor(entry.rank_color)}`}>
                            {entry.season_points} BP
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">{t('battleFilters.noRankings')}</p>
                </div>
              )}
              
              {/* View All Button - Below Rankings */}
              {topRankings.length > 0 && (
                <div className="text-center mt-4">
                  <Link 
                    to="/ranking"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 transition-all duration-300 text-sm font-medium"
                  >
                    <span>{t('latestBattles.ranking.viewAll')}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default LatestBattles;