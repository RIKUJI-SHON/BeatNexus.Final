import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Crown, Search, Users, Star, Vote, Calendar, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { useRankingStore } from '../store/rankingStore';
import { useTranslation } from 'react-i18next';
import { trackBeatNexusEvents } from '../utils/analytics';
import { VoterRankingEntry, SeasonRankingEntry, SeasonVoterRankingEntry, RankingType, VoterRankingType } from '../types';

type TabType = 'player' | 'voter';

const RankingPage: React.FC = () => {
  const { t } = useTranslation();
  const { 
    // 通算ランキング
    rankings, 
    voterRankings, 
    loading, 
    voterLoading, 
    error, 
    voterError, 
    fetchRankings, 
    fetchVoterRankings,
    
    // シーズンランキング
    seasonRankings,
    seasonVoterRankings,
    seasonLoading,
    seasonVoterLoading,
    seasonError,
    seasonVoterError,
    fetchSeasonRankings,
    fetchSeasonVoterRankings,
    
    // シーズン情報
    seasons,
    currentSeason,
    selectedSeasonId,
    fetchSeasons,
    
    // 過去のシーズンランキング
    historicalSeasonRankings,
    historicalSeasonVoterRankings,
    historicalLoading,
    historicalVoterLoading,
    historicalError,
    historicalVoterError,
    fetchHistoricalSeasonRankings,
    fetchHistoricalSeasonVoterRankings,
    
    // タブ状態
    activeRankingType,
    activeVoterRankingType,
    setActiveRankingType,
    setActiveVoterRankingType,
    setSelectedSeasonId
  } = useRankingStore();
  
  const [activeTab, setActiveTab] = useState<TabType>('player');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);

  useEffect(() => {
    // 初期データ取得
    fetchSeasons();
    fetchRankings();
    fetchVoterRankings();
    fetchSeasonRankings();
    fetchSeasonVoterRankings();
    
    // Track initial ranking view
    trackBeatNexusEvents.rankingView('rating');
  }, [fetchRankings, fetchVoterRankings, fetchSeasonRankings, fetchSeasonVoterRankings, fetchSeasons]);

  const handleTabChange = (isChecked: boolean) => {
    const newTab = isChecked ? 'voter' : 'player';
    setActiveTab(newTab);
    setSearchQuery(''); // Reset search when switching tabs
    
    // Track tab switch
    trackBeatNexusEvents.rankingView(newTab === 'voter' ? 'voter' : 'rating');
  };

  const handleRankingTypeChange = (type: RankingType) => {
    setActiveRankingType(type);
    if (type === 'current_season') {
      trackBeatNexusEvents.rankingView('rating');
    } else {
      trackBeatNexusEvents.rankingView('rating');
    }
  };

  const handleVoterRankingTypeChange = (type: VoterRankingType) => {
    setActiveVoterRankingType(type);
    if (type === 'current_season') {
      trackBeatNexusEvents.rankingView('voter');
    } else {
      trackBeatNexusEvents.rankingView('voter');
    }
  };

  const handleSeasonSelect = (seasonId: string | 'all_time') => {
    if (seasonId === 'all_time') {
      // All Time選択時
      handleRankingTypeChange('all_time');
      handleVoterRankingTypeChange('all_time');
    } else {
      // シーズン選択時
      handleRankingTypeChange('current_season');
      handleVoterRankingTypeChange('current_season');
      setSelectedSeasonId(seasonId);
      
      // 過去のシーズンを選択した場合、履歴データを取得
      if (seasonId !== currentSeason?.id) {
        fetchHistoricalSeasonRankings(seasonId);
        fetchHistoricalSeasonVoterRankings(seasonId);
      }
    }
    setShowSeasonDropdown(false);
  };

  // 現在表示するデータを決定
  const getCurrentData = () => {
    if (activeTab === 'player') {
      const rankingType = activeRankingType;
      if (rankingType === 'current_season') {
        if (selectedSeasonId === currentSeason?.id) {
          return seasonRankings;
        } else {
          // 過去のシーズンの場合は変換が必要
          return historicalSeasonRankings.map((entry, index) => ({
            ...entry,
            season_points: entry.final_season_points,
            rating: 0, // 履歴には含まれないため
            rank_name: 'Historical',
            rank_color: 'gray',
            position: entry.final_rank
          }));
        }
      } else {
        return rankings;
      }
    } else {
      const voterRankingType = activeVoterRankingType;
      if (voterRankingType === 'current_season') {
        if (selectedSeasonId === currentSeason?.id) {
          return seasonVoterRankings;
        } else {
          // 過去のシーズンの場合は変換が必要
          return historicalSeasonVoterRankings.map((entry, index) => ({
            ...entry,
            vote_count: entry.final_season_vote_points,
            rating: 0,
            rank_name: 'Historical',
            rank_color: 'gray',
            created_at: entry.created_at,
            updated_at: entry.created_at,
            position: entry.final_rank
          }));
        }
      } else {
        return voterRankings;
      }
    }
  };

  // 現在の読み込み状態を決定
  const getCurrentLoading = () => {
    if (activeTab === 'player') {
      const rankingType = activeRankingType;
      if (rankingType === 'current_season') {
        if (selectedSeasonId === currentSeason?.id) {
          return seasonLoading;
        } else {
          return historicalLoading;
        }
      } else {
        return loading;
      }
    } else {
      const voterRankingType = activeVoterRankingType;
      if (voterRankingType === 'current_season') {
        if (selectedSeasonId === currentSeason?.id) {
          return seasonVoterLoading;
        } else {
          return historicalVoterLoading;
        }
      } else {
        return voterLoading;
      }
    }
  };

  // 現在のエラー状態を決定
  const getCurrentError = () => {
    if (activeTab === 'player') {
      const rankingType = activeRankingType;
      if (rankingType === 'current_season') {
        if (selectedSeasonId === currentSeason?.id) {
          return seasonError;
        } else {
          return historicalError;
        }
      } else {
        return error;
      }
    } else {
      const voterRankingType = activeVoterRankingType;
      if (voterRankingType === 'current_season') {
        if (selectedSeasonId === currentSeason?.id) {
          return seasonVoterError;
        } else {
          return historicalVoterError;
        }
      } else {
        return voterError;
      }
    }
  };

  const currentData = getCurrentData();
  const currentLoading = getCurrentLoading();
  const currentError = getCurrentError();

  // フィルター済みデータ
  const filteredData = currentData.filter(entry =>
    entry.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Type guards and utility functions
  const isVoterEntry = (entry: any): entry is VoterRankingEntry => {
    return 'vote_count' in entry && typeof entry.vote_count === 'number';
  };

  const isSeasonRankingEntry = (entry: any): entry is SeasonRankingEntry => {
    return 'season_points' in entry && typeof entry.season_points === 'number';
  };

  const getVoteCount = (entry: any): number => {
    return isVoterEntry(entry) ? entry.vote_count : 0;
  };

  const getRatingOrSeasonPoints = (entry: any): number => {
    if (activeTab === 'player') {
      if (activeRankingType === 'current_season') {
        return isSeasonRankingEntry(entry) ? entry.season_points : 0;
      } else {
        return entry.rating || 0;
      }
    } else {
      return getVoteCount(entry);
    }
  };

  const getPositionDisplay = (position: number) => {
    if (position === 1) {
      return (
        <div className="flex items-center justify-center">
          <div className="relative">
            <Crown className="h-6 w-6 text-yellow-400" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      );
    } else if (position === 2) {
      return (
        <div className="flex items-center justify-center">
          <div className="relative">
            <Medal className="h-5 w-5 text-gray-300" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>
          </div>
        </div>
      );
    } else if (position === 3) {
      return (
        <div className="flex items-center justify-center">
          <div className="relative">
            <Trophy className="h-5 w-5 text-amber-600" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-center">
          <span className="text-lg font-bold text-gray-400">#{position}</span>
        </div>
      );
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 1800) return 'text-red-400';
    if (rating >= 1600) return 'text-purple-400';
    if (rating >= 1400) return 'text-blue-400';
    if (rating >= 1300) return 'text-green-400';
    if (rating >= 1200) return 'text-yellow-400';
    if (rating >= 1100) return 'text-gray-400';
    return 'text-gray-500';
  };

  const getVoteCountColor = (voteCount: number) => {
    if (voteCount >= 50) return 'text-red-400';
    if (voteCount >= 25) return 'text-green-400';
    if (voteCount >= 10) return 'text-yellow-400';
    if (voteCount >= 5) return 'text-gray-400';
    return 'text-gray-500';
  };

  // ドロップダウンの選択肢を生成
  const getDropdownOptions = () => {
    const options = [];
    
    // Current Season / All Time options
    options.push({
      type: 'all_time',
      label: t('rankingPage.seasonTabs.allTime'),
      isActive: activeRankingType === 'all_time',
      isSelected: activeRankingType === 'all_time',
    });
    
    if (currentSeason) {
      options.push({
        type: 'current_season',
        label: `${currentSeason.name} (${t('rankingPage.seasonSelector.currentSeasonLabel')})`,
        isActive: activeRankingType === 'current_season' && selectedSeasonId === currentSeason.id,
        isSelected: activeRankingType === 'current_season' && selectedSeasonId === currentSeason.id,
        seasonId: currentSeason.id,
      });
    }
    
    // Past seasons
    const pastSeasons = seasons.filter(s => s.status === 'completed');
    pastSeasons.forEach(season => {
      options.push({
        type: 'historical_season',
        label: `${season.name} (${t('rankingPage.seasonSelector.completedSeasonLabel')})`,
        isActive: activeRankingType === 'current_season' && selectedSeasonId === season.id,
        isSelected: activeRankingType === 'current_season' && selectedSeasonId === season.id,
        seasonId: season.id,
      });
    });
    
    return options;
  };

  const dropdownOptions = getDropdownOptions();
  const selectedOption = dropdownOptions.find(opt => opt.isSelected);

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
                fetchSeasonRankings();
                fetchSeasonVoterRankings();
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

        {/* Player/Voter Switch */}
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

        {/* Search and Season Selector */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
          {/* 検索欄 */}
          <div className="relative w-full sm:w-80">
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

          {/* Season/All-time Selector */}
          <div className="relative w-full sm:w-auto">
            <button
              onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border backdrop-blur-sm transition-colors w-full sm:w-auto ${
                activeTab === 'player'
                  ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-100 hover:bg-cyan-500/20'
                  : 'bg-purple-500/10 border-purple-500/20 text-purple-100 hover:bg-purple-500/20'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span className="flex-1 text-left sm:text-center">
                {selectedOption?.label || t('rankingPage.seasonSelector.selectSeason')}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showSeasonDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showSeasonDropdown && (
              <div className={`absolute top-full left-0 mt-2 w-full sm:w-80 rounded-lg border backdrop-blur-sm z-50 ${
                activeTab === 'player'
                  ? 'bg-gray-800/90 border-cyan-500/20'
                  : 'bg-gray-800/90 border-purple-500/20'
              }`}>
                <div className="py-2">
                  {dropdownOptions.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleSeasonSelect(option.seasonId || option.type)}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-700/50 transition-colors ${
                        option.isSelected
                          ? activeTab === 'player'
                            ? 'bg-cyan-500/20 text-cyan-100'
                            : 'bg-purple-500/20 text-purple-100'
                          : 'text-gray-300'
                      }`}
                    >
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6">

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
                <div className="grid grid-cols-10 gap-4 text-xs font-medium text-gray-300 uppercase tracking-wider">
                  <div className="col-span-2 text-center">Rank</div>
                  <div className="col-span-6">{activeTab === 'player' ? 'Player' : 'Voter'}</div>
                  <div className="col-span-2 text-center">
                    {activeTab === 'player' 
                      ? (activeRankingType === 'current_season' ? t('rankingPage.table.seasonPoints') : t('rankingPage.table.rating'))
                      : t('rankingPage.table.voteCount')
                    }
                  </div>
                </div>
              </div>
              
              {/* リスト */}
              <div className="divide-y divide-gray-700/50">
                {filteredData.slice(0, 15).map((entry) => {
                  const isTopThree = entry.position <= 3;
                  
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
                      <div className="grid grid-cols-10 gap-4 items-center">
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

                        {/* レーティング/シーズンポイント/投票数 */}
                        <div className="col-span-2 text-center">
                          <span className={`font-bold text-sm ${
                            activeTab === 'player' 
                              ? getRatingColor(getRatingOrSeasonPoints(entry))
                              : getVoteCountColor(getVoteCount(entry))
                          }`}>
                            {activeTab === 'player' 
                              ? getRatingOrSeasonPoints(entry)
                              : `${getVoteCount(entry) * 100} VP`
                            }
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
                {searchQuery ? t('rankingPage.noUsersFound') : t('rankingPage.noRankingsYet')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RankingPage;