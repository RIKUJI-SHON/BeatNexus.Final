import React, { useEffect, useState } from 'react';
import { Trophy, Search, Users, Calendar, ChevronDown, X, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { TopThreePodium } from '../components/ui/TopThreePodium';
import { useRankingStore } from '../store/rankingStore';
import { useTranslation } from 'react-i18next';
import { trackBeatNexusEvents } from '../utils/analytics';
import { getDefaultAvatarUrl } from '../utils';
import { VoterRankingEntry, SeasonRankingEntry, SeasonVoterRankingEntry, RankingType, VoterRankingType } from '../types';
import { AdSlot } from '../components/ads/AdSlot';

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

  // 翻訳の安全なフォールバック
  const tt = (key: string, fallback: string) => {
    const translated = t(key as unknown as TemplateStringsArray & string);
    return translated === key ? fallback : translated;
  };

  useEffect(() => {
    // 初期データ取得（シーズン情報を最初に取得してから他のデータを取得）
    const initializeData = async () => {
      await fetchSeasons(); // シーズン情報を最初に取得
      await Promise.all([
        fetchRankings(),
        fetchVoterRankings(),
        fetchSeasonRankings(),
        fetchSeasonVoterRankings()
      ]);
    };
    
    initializeData();
    
    // Track initial ranking view
    trackBeatNexusEvents.rankingView('rating');
  }, [fetchSeasons, fetchRankings, fetchVoterRankings, fetchSeasonRankings, fetchSeasonVoterRankings]); // 初期化に必要な関数のみ

  // アクティブなシーズンがない場合の処理を別のuseEffectで管理
  useEffect(() => {
    if (seasons.length > 0 && !currentSeason && !selectedSeasonId) {
      const latestEndedSeason = seasons
        .filter(s => s.status === 'ended')
        .sort((a, b) => new Date(b.end_at).getTime() - new Date(a.end_at).getTime())[0];
      
      if (latestEndedSeason) {
        console.log('[DEBUG] No active season, selecting latest ended season:', latestEndedSeason.name);
        setSelectedSeasonId(latestEndedSeason.id);
        setActiveRankingType('current_season');
        setActiveVoterRankingType('current_season');
        fetchHistoricalSeasonRankings(latestEndedSeason.id);
        fetchHistoricalSeasonVoterRankings(latestEndedSeason.id);
      }
    }
  }, [seasons, currentSeason, selectedSeasonId, setSelectedSeasonId, setActiveRankingType, setActiveVoterRankingType, fetchHistoricalSeasonRankings, fetchHistoricalSeasonVoterRankings]);

  const handleTabChange = (isChecked: boolean) => {
    const newTab = isChecked ? 'voter' : 'player';
    setActiveTab(newTab);
    setSearchQuery(''); // Reset search when switching tabs
    
    // Track tab switch
    trackBeatNexusEvents.rankingView(newTab === 'voter' ? 'voter' : 'rating');
  };

  const handleRankingTypeChange = (type: RankingType) => {
    setActiveRankingType(type);
    // ランキング種別に応じてより詳細な追跡
    trackBeatNexusEvents.rankingView('rating', type);
  };

  const handleVoterRankingTypeChange = (type: VoterRankingType) => {
    setActiveVoterRankingType(type);
    // 投票者ランキング種別に応じてより詳細な追跡
    trackBeatNexusEvents.rankingView('voter', type);
  };

  const handleSeasonSelect = (seasonId: string | 'all_time') => {
    console.log('[DEBUG] Season selected:', { seasonId, currentSeasonId: currentSeason?.id });
    
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
        console.log('[DEBUG] Fetching historical data for season:', seasonId);
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
        if (selectedSeasonId === currentSeason?.id || !selectedSeasonId) {
          return seasonRankings;
        } else {
          return historicalSeasonRankings.map(entry => ({
            user_id: entry.user_id,
            username: entry.username,
            avatar_url: entry.avatar_url,
            season_points: entry.points,
            position: entry.rank,
            rating: 0, // 履歴データには通算レーティングは含まれないためダミーを設定
            rank_name: 'Historical',
            rank_color: 'gray',
          }));
        }
      } else {
        return rankings;
      }
    } else {
      const voterRankingType = activeVoterRankingType;
      console.log('[DEBUG] Voter ranking logic:', {
        voterRankingType,
        isCurrentSeason: voterRankingType === 'current_season',
        seasonMatch: selectedSeasonId === currentSeason?.id,
        noSelectedSeason: !selectedSeasonId
      });
      
      if (voterRankingType === 'current_season') {
        if (selectedSeasonId === currentSeason?.id || !selectedSeasonId) {
          return seasonVoterRankings;
        } else {
          return historicalSeasonVoterRankings.map(entry => ({
            user_id: entry.user_id,
            username: entry.username,
            avatar_url: entry.avatar_url,
            vote_count: entry.votes,
            position: entry.rank,
            rating: 0, // 履歴データには通算レーティングは含まれないためダミーを設定
            rank_name: 'Historical',
            rank_color: 'gray',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
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

  // Type guards and utility functions
  const isVoterEntry = (entry: unknown): entry is VoterRankingEntry => {
    return typeof entry === 'object' && entry !== null && 'vote_count' in entry && typeof (entry as VoterRankingEntry).vote_count === 'number';
  };

  const isSeasonVoterEntry = (entry: unknown): entry is SeasonVoterRankingEntry => {
    return typeof entry === 'object' && entry !== null && 'season_vote_points' in entry && typeof (entry as SeasonVoterRankingEntry).season_vote_points === 'number';
  };

  const isSeasonRankingEntry = (entry: unknown): entry is SeasonRankingEntry => {
    return typeof entry === 'object' && entry !== null && 'season_points' in entry && typeof (entry as SeasonRankingEntry).season_points === 'number';
  };

  const getWeightedVoteSharePercent = (entry: unknown): number => {
    if (isSeasonRankingEntry(entry) && typeof entry.weighted_vote_share === 'number') {
      return Math.round(entry.weighted_vote_share * 1000) / 10;
    }
    return 0;
  };

  const getVoteCount = (entry: unknown): number => {
    if (isVoterEntry(entry)) return entry.vote_count;
    if (isSeasonVoterEntry(entry)) return entry.season_vote_points;
    return 0;
  };

  const getPosition = (entry: unknown): number => {
    if (typeof entry === 'object' && entry !== null) {
      if ('position' in entry) return (entry as { position: number }).position;
      if ('rank' in entry) return (entry as { rank: number }).rank;
    }
    return 0;
  };

  const getUserId = (entry: unknown): string => {
    if (typeof entry === 'object' && entry !== null) {
      if ('user_id' in entry) return (entry as { user_id: string }).user_id;
      if ('id' in entry) return (entry as { id: string }).id;
    }
    return '';
  };

  // 型安全にユーザー名を取得
  const getUsername = (entry: unknown): string => {
    if (typeof entry === 'object' && entry !== null && 'username' in entry) {
      const val = (entry as { username?: unknown }).username;
      return typeof val === 'string' ? val : '';
    }
    return '';
  };

  // 検索/件数用の補助値（20位までの対象総数とフィルタ後件数）
  const totalTop20Count = currentData.filter(entry => getPosition(entry) <= 20).length;
  const filteredCount = (() => {
    try {
      return currentData
        .filter(entry => entry.username.toLowerCase().includes(searchQuery.toLowerCase()))
        .filter(entry => getPosition(entry) <= 20).length;
    } catch {
      return 0;
    }
  })();


  // フィルター済みデータ（20位まで）
  const filteredData = currentData
    .filter(entry => entry.username.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(entry => getPosition(entry) <= 20);

  // 🏆 Top 3 extraction for highlight display (最大3人制限)
  const allTopThreeEntries = filteredData.filter(entry => getPosition(entry) <= 3);
  
  // TOP3ポディウム表示用（最大3人まで）
  const topThreeForDisplay = allTopThreeEntries.slice(0, 3);
  
  // 溢れた分（4人目以降の同率含む）
  const overflowEntries = allTopThreeEntries.slice(3);
  
  // ポディウムに表示されなかった人も含めて、リスト表示対象を作成（20位まで）
  const listEntries = [
    ...overflowEntries, // 溢れたTOP3候補
    ...filteredData.filter(entry => getPosition(entry) > 3 && getPosition(entry) <= 20) // 4位以降20位まで
  ];

  const getRatingOrSeasonPoints = (entry: unknown): number => {
    if (activeTab === 'player') {
      if (activeRankingType === 'current_season') {
        return isSeasonRankingEntry(entry) ? entry.season_points : 0;
      } else {
        return typeof entry === 'object' && entry !== null && 'rating' in entry ? (entry as { rating: number }).rating : 0;
      }
    } else {
      return getVoteCount(entry);
    }
  };

  // 表示用: バッジアイコンと数字の組み合わせ表示（リスト用）  
  const getPositionDisplay = (position: number) => {
    switch (position) {
      case 1:
        return (
          <div className="flex items-center justify-center w-full h-8">
            <img src="/images/1st-place.png" alt="1st Place" className="h-6 w-6 object-contain" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-full h-8">
            <img src="/images/2nd-place.png" alt="2nd Place" className="h-6 w-6 object-contain" />
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center w-full h-8">
            <img src="/images/3rd-place.png" alt="3rd Place" className="h-6 w-6 object-contain" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-full h-8">
            <span className="text-lg font-extrabold text-gray-400">#{position}</span>
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
    if (voteCount >= 5) return 'text-blue-400';
    return 'text-slate-300';
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
    const pastSeasons = seasons.filter(s => s.status === 'completed' || s.status === 'ended');
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
      <div className="container mx-auto px-4 max-w-4xl relative">
        {/* 背景デコレーション */}
        <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full blur-3xl opacity-25 hidden sm:block 
          bg-gradient-to-br from-cyan-500/30 to-blue-500/30"></div>
        <div className="pointer-events-none absolute top-1/3 -right-24 h-72 w-72 rounded-full blur-3xl opacity-25 hidden sm:block 
          bg-gradient-to-br from-purple-500/30 to-pink-500/30"></div>
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
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-3 sm:mb-4">
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
              aria-label={t('rankingPage.searchPlaceholder')}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-700/50 text-gray-300"
                aria-label={tt('common.clear', 'Clear search')}
              >
                <X className="h-4 w-4" />
              </button>
            )}
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

        {/* 件数チップ（検索結果 / 対象） */}
        <div className="flex justify-center mb-6">
          <span className={`inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border bg-gray-800/60 text-gray-200 ${
            activeTab === 'player' ? 'border-cyan-500/30' : 'border-purple-500/30'
          }`}>
            {tt('rankingPage.results', 'Results')}: {filteredCount} / {totalTop20Count}
          </span>
        </div>

        {/* Content Area */}
        <div className="space-y-6">

          {/* 🏆 Top 3 Podium Section */}
          {!currentLoading && topThreeForDisplay.length > 0 && (
            <div className={`rounded-2xl p-[1px] shadow-lg ${
              activeTab === 'player'
                ? 'bg-gradient-to-r from-cyan-500/40 via-blue-500/20 to-indigo-500/40'
                : 'bg-gradient-to-r from-purple-500/40 via-pink-500/20 to-rose-500/40'
            }`}>
              <div className="rounded-2xl bg-gray-900/70">
                <TopThreePodium
                  topThree={topThreeForDisplay as unknown as Array<{
                    username: string;
                    avatar_url?: string | null;
                    [key: string]: unknown;
                  } & Record<string, unknown>>}
                  activeTab={activeTab}
                  getRatingOrSeasonPoints={getRatingOrSeasonPoints}
                  getVoteCount={getVoteCount}
                  getRatingColor={getRatingColor}
                  getVoteCountColor={getVoteCountColor}
                  getPosition={getPosition}
                  getUserId={getUserId}
                />
              </div>
            </div>
          )}

          {/* ranking.top.banner */}
          <div className="my-6">
            <AdSlot
              placementKey="ranking.top.banner"
              variant="banner"
              className="w-full max-w-3xl mx-auto"
            />
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
              <div className={`px-4 py-3 border-b sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-gray-900/70 ${
                activeTab === 'player' 
                  ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/20' 
                  : 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20'
              }`}>
                <div className="grid grid-cols-10 gap-4 text-xs font-semibold text-gray-200 uppercase tracking-wider">
                  <div className="col-span-2 text-center flex items-center justify-center gap-1">
                    <Trophy className="h-4 w-4 opacity-80" />
                    <span>Rank</span>
                  </div>
                  <div className="col-span-6 flex items-center gap-2">
                    <Users className="h-4 w-4 opacity-80" />
                    <span>{activeTab === 'player' ? 'Player' : 'Voter'}</span>
                  </div>
                  <div className="col-span-2 text-center flex items-center justify-center gap-1">
                    <Star className="h-4 w-4 opacity-80" />
                    <span>
                      {activeTab === 'player' 
                        ? (activeRankingType === 'current_season' ? t('rankingPage.table.seasonPoints') : t('rankingPage.table.rating'))
                        : t('rankingPage.table.voteCount')
                      }
                    </span>
                  </div>
                </div>
              </div>
              
              {/* リスト */}
              <div className="divide-y divide-gray-700/50">
                {filteredData.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p>{t('rankingPage.noData')}</p>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="mt-3 inline-flex items-center gap-2 text-xs px-3 py-1 rounded-md border border-gray-600 text-gray-200 hover:bg-gray-700/50"
                      >
                        <X className="h-3 w-3" /> {tt('common.clear', 'Clear search')}
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {listEntries
                      .flatMap((entry, idx) => {
                      // 溢れたTOP3エントリかどうかをチェック
                      const isOverflowTopThree = overflowEntries.includes(entry);
                      const isTopThree = getPosition(entry) <= 3;
                      const row = (
                        <Link 
                          key={getUserId(entry)} 
                          to={`/profile/${getUserId(entry)}`}
                          aria-label={`Open profile of ${getUsername(entry)}`}
                          className={`block rounded-xl p-[1px] transition-all duration-300 group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ${
                            activeTab === 'player'
                              ? 'bg-gradient-to-r from-cyan-500/20 via-blue-500/10 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 focus-visible:ring-cyan-400/50'
                              : 'bg-gradient-to-r from-purple-500/20 via-pink-500/10 to-rose-500/20 hover:from-purple-500/30 hover:to-rose-500/30 focus-visible:ring-purple-400/50'
                          } ${
                            isTopThree 
                              ? activeTab === 'player' 
                                ? isOverflowTopThree
                                  ? 'border-l-2 border-cyan-400/40'
                                  : ''
                                : isOverflowTopThree
                                  ? 'border-l-2 border-purple-400/40'
                                  : ''
                              : ''
                          }`}
                        >
                          <div className="rounded-[11px] bg-gray-900/70 px-4 py-4">
                            <div className="grid grid-cols-10 gap-4 items-center">
                            {/* ランク */}
                              <div className="col-span-2 text-center">
                                {getPositionDisplay(getPosition(entry))}
                              </div>
                            {/* ユーザー情報 */}
                              <div className="col-span-6 flex items-center gap-3 min-w-0 py-1">
                                <div className={`relative w-11 h-11 rounded-full p-0.5 transition-all duration-300 flex-shrink-0 ${
                                  activeTab === 'player' 
                                    ? 'bg-gradient-to-r from-cyan-500/50 to-blue-500/50 group-hover:from-cyan-400 group-hover:to-blue-400' 
                                    : 'bg-gradient-to-r from-purple-500/50 to-pink-500/50 group-hover:from-purple-400 group-hover:to-pink-400'
                                }`}>
                                  <img
                                    src={entry.avatar_url || getDefaultAvatarUrl()}
                                    alt={entry.username}
                                    className="w-full h-full rounded-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      if (target.src !== getDefaultAvatarUrl()) {
                                        target.src = getDefaultAvatarUrl();
                                      }
                                    }}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className={`font-semibold text-white text-sm truncate transition-colors ${
                                    activeTab === 'player' 
                                      ? 'group-hover:text-cyan-300' 
                                      : 'group-hover:text-pink-300'
                                  }`}>
                                    {entry.username}
                                  </div>
                                  {activeTab === 'player' && activeRankingType === 'current_season' && (
                                    <div className="mt-1 text-[11px] text-gray-300">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-800/70 border border-gray-700/60">
                                        {t('rankingPage.voteShare')}: {getWeightedVoteSharePercent(entry)}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            {/* レーティング/シーズンポイント/投票数 */}
                              <div className="col-span-2 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                  activeTab === 'player' 
                                    ? `${getRatingColor(getRatingOrSeasonPoints(entry))} border-cyan-500/30 bg-cyan-400/10`
                                    : `${getVoteCountColor(getVoteCount(entry))} border-purple-500/30 bg-purple-400/10`
                                }`}>
                                  {activeTab === 'player' 
                                    ? getRatingOrSeasonPoints(entry)
                                    : `${getVoteCount(entry) * 100} VP`
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                      // after 5th entry (index 4) に infeed 広告
                      if (idx === 4) {
                        return [
                          row,
                          <div key="ranking.after-5.ad" className="px-4 py-4">
                            <AdSlot
                              placementKey="ranking.list.after-5.infeed"
                              variant="infeed"
                              className="bnx-ad-infeed w-full bnx-ad--ranking-context"
                            />
                          </div>
                        ];
                      }
                      return [row];
                    })}
                </>
                )}
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