import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Star, Vote, ArrowRight, Users } from 'lucide-react';
import { useRankingStore } from '../../store/rankingStore';
import { useTranslation } from 'react-i18next';
import { RankingEntry, VoterRankingEntry, SeasonVoterRankingEntry } from '../../types';
import { getRankFromRating } from '../../utils/rankUtils';

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
    seasonVoterRankings,
    loading: rankingsLoading, 
    seasonVoterLoading,
    fetchRankings, 
    fetchSeasonVoterRankings 
  } = useRankingStore();
  
  const [activeTab, setActiveTab] = useState<RankingType>('player');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    fetchRankings();
    fetchSeasonVoterRankings();
  }, [fetchRankings, fetchSeasonVoterRankings]);

  const handleTabChange = (isChecked: boolean) => {
    const newTab = isChecked ? 'voter' : 'player';
    if (newTab === activeTab || isAnimating) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      setActiveTab(newTab);
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

  const currentData = activeTab === 'player' ? rankings.slice(0, maxItems) : seasonVoterRankings.slice(0, maxItems);
  const currentLoading = activeTab === 'player' ? rankingsLoading : seasonVoterLoading;

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
        <div 
          className="font-medium text-white truncate text-sm group-hover:text-cyan-400 transition-colors max-w-[100px] md:max-w-[120px]" 
          title={entry.username}
        >
          {entry.username}
        </div>
        <div className={`text-sm font-bold ${getRatingColor(entry.rank_color)}`}>
          {entry.season_points} SP
        </div>
      </div>
    </Link>
  );

  const renderVoterRanking = (entry: SeasonVoterRankingEntry) => {
    
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
          className="w-10 h-10 rounded-lg object-cover border border-gray-600/50 group-hover:border-purple-500/50 transition-colors"
        />
        
        <div className="flex-1 min-w-0">
          <div 
            className="font-medium text-white truncate text-sm group-hover:text-purple-400 transition-colors max-w-[100px] md:max-w-[120px]" 
            title={entry.username}
          >
            {entry.username}
          </div>
          <div className={`text-sm font-bold ${getVoteCountColor(entry.vote_count)}`}>
            {`${entry.vote_count * 100} VP`}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className={className}>
      {/* Header with Title */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img
            src="/images/ranking-title-badge.png"
            alt={t('battlesPage.rankings.titleCompact')}
            className="w-[280px] h-[50px] object-contain"
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

      {/* Custom Switch with Neon Effect */}
      <div className="flex justify-center mb-4">
        <style dangerouslySetInnerHTML={{
          __html: `
            .ranking-switch {
              --_switch-bg-clr: linear-gradient(135deg, rgba(30, 64, 175, 0.3), rgba(136, 19, 55, 0.3));
              --_switch-padding: 3px;
              --_slider-bg-clr: rgba(30, 64, 175, 0.4);
              --_slider-bg-clr-on: linear-gradient(135deg, rgba(6, 95, 70, 0.7), rgba(157, 23, 77, 0.7));
              --_slider-txt-clr: #ffffff;
              --_label-padding: 0.6rem 1.2rem;
              --_switch-easing: cubic-bezier(0.47, 1.64, 0.41, 0.8);
              color: white;
              width: fit-content;
              display: flex;
              justify-content: center;
              position: relative;
              border-radius: 9999px;
              cursor: pointer;
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              position: relative;
              isolation: isolate;
              font-size: 0.875rem;
              backdrop-filter: blur(8px);
              background: rgba(17, 24, 39, 0.2);
              border: 1px solid rgba(75, 85, 99, 0.3);
              box-shadow: 
                0 0 15px rgba(30, 64, 175, 0.15),
                0 0 30px rgba(136, 19, 55, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.05);
            }
            
            .ranking-switch input[type="checkbox"] {
              position: absolute;
              width: 1px;
              height: 1px;
              padding: 0;
              margin: -1px;
              overflow: hidden;
              clip: rect(0, 0, 0, 0);
              white-space: nowrap;
              border-width: 0;
            }
            
            .ranking-switch > span {
              display: grid;
              place-content: center;
              transition: opacity 300ms ease-in-out 150ms;
              padding: var(--_label-padding);
              font-weight: 600;
              text-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
            }
            
            .ranking-switch::before,
            .ranking-switch::after {
              content: "";
              position: absolute;
              border-radius: inherit;
              transition: inset 150ms ease-in-out;
            }
            
            .ranking-switch::before {
              background: var(--_slider-bg-clr);
              inset: var(--_switch-padding) 50% var(--_switch-padding) var(--_switch-padding);
              transition: 
                inset 500ms var(--_switch-easing), 
                background 500ms ease-in-out,
                box-shadow 500ms ease-in-out;
              z-index: -1;
              backdrop-filter: blur(4px);
              box-shadow: 
                inset 0 2px 4px rgba(0, 0, 0, 0.3),
                0 0 10px rgba(30, 64, 175, 0.2),
                0 0 20px rgba(136, 19, 55, 0.1);
            }
            
            .ranking-switch::after {
              background: var(--_switch-bg-clr);
              inset: 0;
              z-index: -2;
              border: 1px solid rgba(75, 85, 99, 0.2);
              backdrop-filter: blur(8px);
            }
            
            .ranking-switch:focus-within::after {
              inset: -0.25rem;
              box-shadow: 
                0 0 0 2px rgba(30, 64, 175, 0.2),
                0 0 15px rgba(136, 19, 55, 0.2);
            }
            
            .ranking-switch:hover {
              background: rgba(17, 24, 39, 0.3);
              border-color: rgba(75, 85, 99, 0.4);
              box-shadow: 
                0 0 20px rgba(30, 64, 175, 0.2),
                0 0 40px rgba(136, 19, 55, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.08);
              transform: translateY(-1px);
            }
            
            .ranking-switch:has(input:checked):hover > span:first-of-type,
            .ranking-switch:has(input:not(:checked)):hover > span:last-of-type {
              opacity: 1;
              transition-delay: 0ms;
              transition-duration: 100ms;
              text-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
            }
            
            .ranking-switch:has(input:checked):hover::before {
              inset: var(--_switch-padding) var(--_switch-padding) var(--_switch-padding) 45%;
              box-shadow: 
                inset 0 2px 4px rgba(0, 0, 0, 0.3),
                0 0 15px rgba(136, 19, 55, 0.3),
                0 0 25px rgba(30, 64, 175, 0.2);
            }
            
            .ranking-switch:has(input:not(:checked)):hover::before {
              inset: var(--_switch-padding) 45% var(--_switch-padding) var(--_switch-padding);
              box-shadow: 
                inset 0 2px 4px rgba(0, 0, 0, 0.3),
                0 0 15px rgba(30, 64, 175, 0.3),
                0 0 25px rgba(136, 19, 55, 0.2);
            }
            
            .ranking-switch:has(input:checked)::before {
              background: var(--_slider-bg-clr-on);
              inset: var(--_switch-padding) var(--_switch-padding) var(--_switch-padding) 50%;
              box-shadow: 
                inset 0 2px 4px rgba(0, 0, 0, 0.3),
                0 0 12px rgba(157, 23, 77, 0.3),
                0 0 25px rgba(6, 95, 70, 0.2);
            }
            
            .ranking-switch > span:last-of-type,
            .ranking-switch > input:checked + span:first-of-type {
              opacity: 0.7;
            }
            
            .ranking-switch > input:checked ~ span:last-of-type {
              opacity: 1;
              text-shadow: 0 0 10px rgba(157, 23, 77, 0.5);
            }
            
            .ranking-switch > input:not(:checked) + span:first-of-type {
              text-shadow: 0 0 10px rgba(30, 64, 175, 0.5);
            }
          `
        }} />
        
        <label className="ranking-switch">
          <input 
            type="checkbox" 
            checked={activeTab === 'voter'}
            onChange={(e) => handleTabChange(e.target.checked)}
            disabled={isAnimating}
          />
          <span>{t('rankingPage.tabs.player')}</span>
          <span>{t('rankingPage.tabs.voter')}</span>
        </label>
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
              : (currentData as SeasonVoterRankingEntry[]).map(renderVoterRanking)
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