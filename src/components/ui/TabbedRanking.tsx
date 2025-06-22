import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Star, Vote, ArrowRight, Users } from 'lucide-react';
import { useRankingStore } from '../../store/rankingStore';
import { useTranslation } from 'react-i18next';
import { RankingEntry, VoterRankingEntry } from '../../types';

type RankingType = 'player' | 'voter';

interface TabbedRankingProps {
  maxItems?: number;
  showViewAllButton?: boolean;
  className?: string;
}

export const TabbedRanking: React.FC<TabbedRankingProps> = ({ 
  maxItems = 10, 
  showViewAllButton = true,
  className = ""
}) => {
  const { t } = useTranslation();
  const { 
    rankings, 
    voterRankings, 
    loading: rankingsLoading, 
    voterLoading,
    fetchRankings, 
    fetchVoterRankings 
  } = useRankingStore();
  
  const [activeTab, setActiveTab] = useState<RankingType>('player');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    fetchRankings();
    fetchVoterRankings();
  }, [fetchRankings, fetchVoterRankings]);

  const handleTabChange = (tab: RankingType) => {
    if (tab === activeTab || isAnimating) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      setActiveTab(tab);
      setTimeout(() => setIsAnimating(false), 150);
    }, 150);
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <img src="/images/1st-place.png" alt="1st Place" className="h-6 w-6 object-contain" />;
      case 2:
        return <img src="/images/2nd-place.png" alt="2nd Place" className="h-6 w-6 object-contain" />;
      case 3:
        return <img src="/images/3rd-place.png" alt="3rd Place" className="h-6 w-6 object-contain" />;
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

  const getVoteCountColor = (voteCount: number) => {
    if (voteCount >= 100) return 'text-purple-400';
    if (voteCount >= 50) return 'text-blue-400';
    if (voteCount >= 25) return 'text-green-400';
    if (voteCount >= 10) return 'text-yellow-400';
    if (voteCount >= 5) return 'text-gray-400';
    return 'text-gray-500';
  };

  const currentData = activeTab === 'player' ? rankings.slice(0, maxItems) : voterRankings.slice(0, maxItems);
  const currentLoading = activeTab === 'player' ? rankingsLoading : voterLoading;

  const renderPlayerRanking = (entry: RankingEntry) => (
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

  const renderVoterRanking = (entry: VoterRankingEntry) => (
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
        className="w-10 h-10 rounded-lg object-cover border border-gray-600/50 group-hover:border-purple-500/50 transition-colors"
      />
      
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate text-sm group-hover:text-purple-400 transition-colors">
          {entry.username}
        </div>
        <div className={`text-sm font-bold ${getVoteCountColor(entry.vote_count)}`}>
          {entry.vote_count} {t('rankingPage.table.voteCount')}
        </div>
      </div>
    </Link>
  );

  return (
    <div className={className}>
      {/* Header with Title */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img
            src="/images/ranking-title-badge.png"
            alt={t('battlesPage.rankings.titleCompact')}
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

      {/* Tab Buttons */}
      <div className="flex bg-gray-800/30 p-1 rounded-xl mb-4 backdrop-blur-sm border border-gray-700/50">
        <button
          onClick={() => handleTabChange('player')}
          className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 min-w-0 ${
            activeTab === 'player'
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
              : 'text-gray-400 hover:text-cyan-300 hover:bg-gray-700/30'
          }`}
          disabled={isAnimating}
          title={t('rankingPage.tabs.playerRankings')}
        >
          <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">{t('rankingPage.tabs.player')}</span>
        </button>
        
        <button
          onClick={() => handleTabChange('voter')}
          className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 min-w-0 ${
            activeTab === 'voter'
              ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/10'
              : 'text-gray-400 hover:text-purple-300 hover:bg-gray-700/30'
          }`}
          disabled={isAnimating}
          title={t('rankingPage.tabs.voterRankings')}
        >
          <Vote className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">{t('rankingPage.tabs.voter')}</span>
        </button>
      </div>

      {/* Rankings Content */}
      <div className={`transition-all duration-300 ${isAnimating ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'}`}>
        {currentLoading ? (
          <div className="text-center text-gray-400 py-8">
            <div className={`animate-spin w-8 h-8 border-2 ${activeTab === 'player' ? 'border-cyan-500' : 'border-purple-500'} border-t-transparent rounded-full mx-auto mb-3`}></div>
            <p className="text-sm">{t('battleFilters.loading')}</p>
          </div>
        ) : currentData.length > 0 ? (
          <div className="space-y-1">
            {activeTab === 'player'
              ? (currentData as RankingEntry[]).map(renderPlayerRanking)
              : (currentData as VoterRankingEntry[]).map(renderVoterRanking)
            }
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-8 w-8 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">{t('battleFilters.noRankings')}</p>
          </div>
        )}
      </div>

      {/* View All Button */}
      {showViewAllButton && currentData.length > 0 && (
        <div className="text-center mt-4">
          <Link 
            to="/ranking"
            className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${
              activeTab === 'player' 
                ? 'from-cyan-500/10 to-blue-500/10 border-cyan-500/30 text-cyan-400 hover:text-cyan-300 hover:from-cyan-500/20 hover:to-blue-500/20'
                : 'from-purple-500/10 to-pink-500/10 border-purple-500/30 text-purple-400 hover:text-purple-300 hover:from-purple-500/20 hover:to-pink-500/20'
            } border rounded-lg transition-all duration-300 text-sm font-medium`}
          >
            <span>{t('battlesPage.rankings.viewFullButton')}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}; 