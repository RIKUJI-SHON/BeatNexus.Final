import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Crown, Search, Users, Star, Vote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useRankingStore } from '../store/rankingStore';
import { useTranslation } from 'react-i18next';
import { getRankColorClasses } from '../utils/rankUtils';
import { trackBeatNexusEvents } from '../utils/analytics';
import { VoterRankingEntry } from '../types';

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

  useEffect(() => {
    fetchRankings();
    fetchVoterRankings();
    
    // Track initial ranking view
    trackBeatNexusEvents.rankingView('rating');
  }, [fetchRankings, fetchVoterRankings]);

  const handleTabChange = (isChecked: boolean) => {
    const newTab = isChecked ? 'voter' : 'player';
    setActiveTab(newTab);
    setSearchQuery(''); // Reset search when switching tabs
    
    // Track tab switch
    trackBeatNexusEvents.rankingView(newTab === 'voter' ? 'voter' : 'rating');
  };

  // フィルタリング
  const currentData = activeTab === 'player' ? rankings : voterRankings;
  const currentLoading = activeTab === 'player' ? loading : voterLoading;
  const currentError = activeTab === 'player' ? error : voterError;
  
  const filteredData = currentData.filter(entry => 
    entry.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Type-safe helper functions
  const isVoterEntry = (entry: any): entry is VoterRankingEntry => {
    return 'vote_count' in entry;
  };

  const getVoteCount = (entry: any): number => {
    return isVoterEntry(entry) ? entry.vote_count : 0;
  };

  const getPositionDisplay = (position: number) => {
    switch (position) {
      case 1:
        return (
          <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20">
            <img 
              src="/images/1st-place.png" 
              alt="1st Place"
              className="h-12 w-12 sm:h-16 sm:w-16 object-contain"
            />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20">
            <img 
              src="/images/2nd-place.png" 
              alt="2nd Place"
              className="h-12 w-12 sm:h-16 sm:w-16 object-contain"
            />
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20">
            <img 
              src="/images/3rd-place.png" 
              alt="3rd Place"
              className="h-12 w-12 sm:h-16 sm:w-16 object-contain"
            />
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

  const getContributionLevel = (voteCount: number) => {
    if (voteCount > 100) return 'Expert';
    if (voteCount > 50) return 'Advanced';
    if (voteCount > 25) return 'Regular';
    if (voteCount > 10) return 'Active';
    return 'Beginner';
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
      <div className="container mx-auto px-4 max-w-4xl">
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

        {/* Custom Switch */}
        <div className="flex justify-center mb-8">
          <style dangerouslySetInnerHTML={{
            __html: `
              .switch {
                --_switch-bg-clr: linear-gradient(135deg, rgba(30, 64, 175, 0.3), rgba(136, 19, 55, 0.3));
                --_switch-padding: 4px;
                --_slider-bg-clr: rgba(30, 64, 175, 0.4);
                --_slider-bg-clr-on: linear-gradient(135deg, rgba(6, 95, 70, 0.7), rgba(157, 23, 77, 0.7));
                --_slider-txt-clr: #ffffff;
                --_label-padding: 1rem 2rem;
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
                backdrop-filter: blur(8px);
                background: rgba(17, 24, 39, 0.2);
                border: 1px solid rgba(75, 85, 99, 0.3);
                box-shadow: 
                  0 0 15px rgba(30, 64, 175, 0.15),
                  0 0 30px rgba(136, 19, 55, 0.1),
                  inset 0 1px 0 rgba(255, 255, 255, 0.05);
              }
              
              .switch input[type="checkbox"] {
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
              
              .switch > span {
                display: grid;
                place-content: center;
                transition: opacity 300ms ease-in-out 150ms;
                padding: var(--_label-padding);
                font-weight: 600;
                text-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
              }
              
              .switch::before,
              .switch::after {
                content: "";
                position: absolute;
                border-radius: inherit;
                transition: inset 150ms ease-in-out;
              }
              
              .switch::before {
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
              
              .switch::after {
                background: var(--_switch-bg-clr);
                inset: 0;
                z-index: -2;
                border: 1px solid rgba(75, 85, 99, 0.2);
                backdrop-filter: blur(8px);
              }
              
              .switch:focus-within::after {
                inset: -0.25rem;
                box-shadow: 
                  0 0 0 2px rgba(30, 64, 175, 0.2),
                  0 0 15px rgba(136, 19, 55, 0.2);
              }
              
              .switch:hover {
                background: rgba(17, 24, 39, 0.3);
                border-color: rgba(75, 85, 99, 0.4);
                box-shadow: 
                  0 0 20px rgba(30, 64, 175, 0.2),
                  0 0 40px rgba(136, 19, 55, 0.15),
                  inset 0 1px 0 rgba(255, 255, 255, 0.08);
                transform: translateY(-1px);
              }
              
              .switch:has(input:checked):hover > span:first-of-type,
              .switch:has(input:not(:checked)):hover > span:last-of-type {
                opacity: 1;
                transition-delay: 0ms;
                transition-duration: 100ms;
                text-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
              }
              
              .switch:has(input:checked):hover::before {
                inset: var(--_switch-padding) var(--_switch-padding) var(--_switch-padding) 45%;
                box-shadow: 
                  inset 0 2px 4px rgba(0, 0, 0, 0.3),
                  0 0 15px rgba(136, 19, 55, 0.3),
                  0 0 25px rgba(30, 64, 175, 0.2);
              }
              
              .switch:has(input:not(:checked)):hover::before {
                inset: var(--_switch-padding) 45% var(--_switch-padding) var(--_switch-padding);
                box-shadow: 
                  inset 0 2px 4px rgba(0, 0, 0, 0.3),
                  0 0 15px rgba(30, 64, 175, 0.3),
                  0 0 25px rgba(136, 19, 55, 0.2);
              }
              
              .switch:has(input:checked)::before {
                background: var(--_slider-bg-clr-on);
                inset: var(--_switch-padding) var(--_switch-padding) var(--_switch-padding) 50%;
                box-shadow: 
                  inset 0 2px 4px rgba(0, 0, 0, 0.3),
                  0 0 12px rgba(157, 23, 77, 0.3),
                  0 0 25px rgba(6, 95, 70, 0.2);
              }
              
              .switch > span:last-of-type,
              .switch > input:checked + span:first-of-type {
                opacity: 0.7;
              }
              
              .switch > input:checked ~ span:last-of-type {
                opacity: 1;
                text-shadow: 0 0 10px rgba(157, 23, 77, 0.5);
              }
              
              .switch > input:not(:checked) + span:first-of-type {
                text-shadow: 0 0 10px rgba(30, 64, 175, 0.5);
              }
            `
          }} />
          
          <label className="switch">
            <input 
              type="checkbox" 
              checked={activeTab === 'voter'}
              onChange={(e) => handleTabChange(e.target.checked)}
            />
            <span>{t('rankingPage.tabs.player')}</span>
            <span>{t('rankingPage.tabs.voter')}</span>
          </label>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {/* ヘッダー */}
          <div className="text-center">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-sm mb-4 ${
              activeTab === 'player' 
                ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/20' 
                : 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20'
            }`}>
              {activeTab === 'player' ? (
                <Star className="h-5 w-5 text-cyan-400" />
              ) : (
                <Vote className="h-5 w-5 text-purple-400" />
              )}
              <h2 className={`text-lg font-bold ${activeTab === 'player' ? 'text-cyan-100' : 'text-purple-100'}`}>
                {activeTab === 'player' ? t('rankingPage.tabs.playerRankings') : t('rankingPage.tabs.voterRankings')}
              </h2>
            </div>
            
            {/* 検索欄 */}
            <div className="relative max-w-sm mx-auto mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('rankingPage.searchPlaceholder')}
                className={`w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none transition-all backdrop-blur-sm text-sm ${
                  activeTab === 'player' 
                    ? 'focus:border-cyan-500/50 focus:bg-gray-800' 
                    : 'focus:border-purple-500/50 focus:bg-gray-800'
                }`}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* ランキングリスト */}
          {currentLoading ? (
            <div className="text-center py-12">
              <div className={`animate-spin w-12 h-12 border-4 border-t-transparent rounded-full mx-auto mb-4 ${
                activeTab === 'player' ? 'border-cyan-500' : 'border-purple-500'
              }`}></div>
              <p className="text-gray-400">{t('rankingPage.loading')}</p>
            </div>
          ) : filteredData.length > 0 ? (
            <div className={`bg-gray-900/50 border rounded-xl backdrop-blur-sm overflow-hidden ${
              activeTab === 'player' ? 'border-cyan-500/20' : 'border-purple-500/20'
            }`}>
              {/* ヘッダー */}
              <div className={`px-4 py-3 border-b ${
                activeTab === 'player' 
                  ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/20' 
                  : 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20'
              }`}>
                <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-300 uppercase tracking-wider">
                  <div className="col-span-2 text-center">Rank</div>
                  <div className="col-span-6">{activeTab === 'player' ? 'Player' : 'Voter'}</div>
                  <div className="col-span-2 text-center">{activeTab === 'player' ? 'Rating' : 'Votes'}</div>
                  <div className="col-span-2 text-center">{activeTab === 'player' ? 'Tier' : 'Level'}</div>
                </div>
              </div>
              
              {/* リスト */}
              <div className="divide-y divide-gray-700/50">
                {filteredData.slice(0, 15).map((entry) => {
                  const isTopThree = entry.position <= 3;
                  const contributionLevel = activeTab === 'voter' ? getContributionLevel(getVoteCount(entry)) : '';
                  
                  return (
                    <Link 
                      key={entry.user_id} 
                      to={`/profile/${entry.user_id}`}
                      className={`block px-4 py-3 transition-colors group ${
                        activeTab === 'player' 
                          ? 'hover:bg-cyan-500/5' 
                          : 'hover:bg-purple-500/5'
                      } ${
                        isTopThree 
                          ? activeTab === 'player' 
                            ? 'bg-gradient-to-r from-cyan-500/5 to-blue-500/5' 
                            : 'bg-gradient-to-r from-purple-500/5 to-pink-500/5'
                          : ''
                      }`}
                    >
                      <div className="grid grid-cols-12 gap-4 items-center">
                        {/* ランク */}
                        <div className="col-span-2 text-center">
                          {getPositionDisplay(entry.position)}
                        </div>
                        
                        {/* ユーザー情報 */}
                        <div className="col-span-6 flex items-center gap-3 min-w-0">
                          <img
                            src={entry.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user_id}`}
                            alt={entry.username}
                            className={`w-8 h-8 rounded-full object-cover border border-gray-600 transition-colors ${
                              activeTab === 'player' 
                                ? 'group-hover:border-cyan-500/50' 
                                : 'group-hover:border-purple-500/50'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className={`font-medium text-white text-sm truncate transition-colors ${
                              activeTab === 'player' 
                                ? 'group-hover:text-cyan-400' 
                                : 'group-hover:text-purple-400'
                            }`}>
                              {entry.username}
                            </div>
                          </div>
                        </div>

                        {/* レーティング/投票数 */}
                        <div className="col-span-2 text-center">
                          <span className={`font-bold text-sm ${
                            activeTab === 'player' 
                              ? getRatingColor(entry.rating || 0)
                              : getVoteCountColor(getVoteCount(entry))
                          }`}>
                            {activeTab === 'player' ? (entry.rating || 0) : (getVoteCount(entry))}
                          </span>
                        </div>
                        
                        {/* ティア/レベル */}
                        <div className="col-span-2 text-center">
                          {activeTab === 'player' ? (
                            getTierBadge(entry.rank_name || 'Unranked', entry.rank_color || 'gray')
                          ) : (
                            <span className="text-xs font-medium text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md">
                              {contributionLevel}
                            </span>
                          )}
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
                {searchQuery ? t('rankingPage.noSearchResults') : t('rankingPage.noData')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RankingPage;