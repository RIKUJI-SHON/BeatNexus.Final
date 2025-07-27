import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trophy, ArrowRight, Mic } from 'lucide-react';
import { BattleCard } from '../battle/BattleCard';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TabbedRanking } from '../ui/TabbedRanking';
import { useRankingStore } from '../../store/rankingStore';
import { useBattleStore } from '../../store/battleStore';
import { useTranslation } from 'react-i18next';

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

          {/* Rankings Sidebar with Tabs */}
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-20 lg:h-fit z-10">
            
            {/* Top Rankings with Tabs */}
            <TabbedRanking 
              maxItems={3}
              showViewAllButton={true}
            />
            
          </div>
        </div>
      </div>
    </section>
  );
};

export default LatestBattles;