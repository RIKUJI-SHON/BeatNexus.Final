import React from 'react';
import { Search, SortAsc, SortDesc, TrendingUp, Clock, Archive, User, Filter } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { BattleFormat } from '../../types';
import { useTranslation } from 'react-i18next';

interface BattleFiltersProps {
  sortBy: 'recent' | 'trending' | 'ending' | 'completed';
  setSortBy: (sort: 'recent' | 'trending' | 'ending' | 'completed') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showMyBattlesOnly: boolean;
  setShowMyBattlesOnly: (show: boolean) => void;
  selectedBattleFormat: BattleFormat | 'ALL';
  setSelectedBattleFormat: (format: BattleFormat | 'ALL') => void;
  isLoggedIn: boolean;
}

export const BattleFilters: React.FC<BattleFiltersProps> = ({
  sortBy,
  setSortBy,
  searchQuery,
  setSearchQuery,
  showMyBattlesOnly,
  setShowMyBattlesOnly,
  selectedBattleFormat,
  setSelectedBattleFormat,
  isLoggedIn,
}) => {
  const { t } = useTranslation();

  return (
    <Card className="bg-gray-900 border border-gray-800 p-4 mb-6">
      <div className="space-y-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('battleFilters.searchPlaceholder')}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/50"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Battle Format Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={selectedBattleFormat}
              onChange={(e) => setSelectedBattleFormat(e.target.value as BattleFormat | 'ALL')}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
            >
              <option value="ALL">{t('battleFilters.allFormats')}</option>
              <option value="MAIN_BATTLE">{t('battleCard.battleFormats.MAIN_BATTLE')}</option>
              <option value="MINI_BATTLE">{t('battleCard.battleFormats.MINI_BATTLE')}</option>
            </select>
          </div>

          {/* My Battles Filter (only show if logged in) */}
          {isLoggedIn && (
            <div className="flex items-center gap-2">
              <Button
                variant={showMyBattlesOnly ? 'primary' : 'outline'}
                size="sm"
                leftIcon={<User className="h-4 w-4" />}
                onClick={() => setShowMyBattlesOnly(!showMyBattlesOnly)}
                className={showMyBattlesOnly 
                  ? 'bg-cyan-500 text-white' 
                  : 'border-gray-700 text-gray-400 hover:text-white hover:border-cyan-500/50'
                }
              >
                {t('battleFilters.myBattles')}
              </Button>
            </div>
          )}

          {/* Sort Buttons */}
          <div className="flex gap-2 flex-wrap lg:flex-nowrap ml-auto">
            <Button
              variant={sortBy === 'recent' ? 'primary' : 'outline'}
              size="sm"
              leftIcon={sortBy === 'recent' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
              onClick={() => setSortBy('recent')}
              className={sortBy === 'recent' 
                ? 'bg-cyan-500 text-white' 
                : 'border-gray-700 text-gray-400 hover:text-white hover:border-cyan-500/50'
              }
            >
              {t('battleFilters.recent')}
            </Button>
            <Button
              variant={sortBy === 'trending' ? 'primary' : 'outline'}
              size="sm"
              leftIcon={<TrendingUp className="h-4 w-4" />}
              onClick={() => setSortBy('trending')}
              className={sortBy === 'trending' 
                ? 'bg-purple-500 text-white' 
                : 'border-gray-700 text-gray-400 hover:text-white hover:border-purple-500/50'
              }
            >
              {t('battleFilters.trending')}
            </Button>
            <Button
              variant={sortBy === 'ending' ? 'primary' : 'outline'}
              size="sm"
              leftIcon={<Clock className="h-4 w-4" />}
              onClick={() => setSortBy('ending')}
              className={sortBy === 'ending' 
                ? 'bg-yellow-500 text-white' 
                : 'border-gray-700 text-gray-400 hover:text-white hover:border-yellow-500/50'
              }
            >
              {t('battleFilters.endingSoon')}
            </Button>
            <Button
              variant={sortBy === 'completed' ? 'primary' : 'outline'}
              size="sm"
              leftIcon={<Archive className="h-4 w-4" />}
              onClick={() => setSortBy('completed')}
              className={sortBy === 'completed' 
                ? 'bg-green-500 text-white' 
                : 'border-gray-700 text-gray-400 hover:text-white hover:border-green-500/50'
              }
            >
              {t('battleFilters.completed')}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};