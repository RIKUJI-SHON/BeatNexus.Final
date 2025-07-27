import { create } from 'zustand';
import { RankingEntry, VoterRankingEntry, SeasonRankingEntry, SeasonVoterRankingEntry, Season, HistoricalSeasonRanking, HistoricalSeasonVoterRanking, RankingType, VoterRankingType } from '../types';
import { supabase } from '../lib/supabase';
import { getRankFromRating } from '../utils/rankUtils';

interface RankingState {
  rankings: RankingEntry[];
  voterRankings: VoterRankingEntry[];
  loading: boolean;
  voterLoading: boolean;
  error: string | null;
  voterError: string | null;
  
  seasonRankings: SeasonRankingEntry[];
  seasonVoterRankings: SeasonVoterRankingEntry[];
  seasonLoading: boolean;
  seasonVoterLoading: boolean;
  seasonError: string | null;
  seasonVoterError: string | null;
  
  seasons: Season[];
  currentSeason: Season | null;
  selectedSeasonId: string | null;
  
  historicalSeasonRankings: HistoricalSeasonRanking[];
  historicalSeasonVoterRankings: HistoricalSeasonVoterRanking[];
  historicalLoading: boolean;
  historicalVoterLoading: boolean;
  historicalError: string | null;
  historicalVoterError: string | null;
  
  activeRankingType: RankingType;
  activeVoterRankingType: VoterRankingType;
  
  fetchRankings: () => Promise<void>;
  fetchVoterRankings: () => Promise<void>;
  
  fetchSeasons: () => Promise<void>;
  fetchSeasonRankings: () => Promise<void>;
  fetchSeasonVoterRankings: () => Promise<void>;
  fetchHistoricalSeasonRankings: (seasonId: string) => Promise<void>;
  fetchHistoricalSeasonVoterRankings: (seasonId: string) => Promise<void>;
  setActiveRankingType: (type: RankingType) => void;
  setActiveVoterRankingType: (type: VoterRankingType) => void;
  setSelectedSeasonId: (seasonId: string | null) => void;
}

export const useRankingStore = create<RankingState>((set, get) => ({
  rankings: [],
  voterRankings: [],
  loading: false,
  voterLoading: false,
  error: null,
  voterError: null,
  
  seasonRankings: [],
  seasonVoterRankings: [],
  seasonLoading: false,
  seasonVoterLoading: false,
  seasonError: null,
  seasonVoterError: null,
  
  seasons: [],
  currentSeason: null,
  selectedSeasonId: null,
  
  historicalSeasonRankings: [],
  historicalSeasonVoterRankings: [],
  historicalLoading: false,
  historicalVoterLoading: false,
  historicalError: null,
  historicalVoterError: null,
  
  activeRankingType: 'all_time',
  activeVoterRankingType: 'all_time',

  fetchRankings: async () => {
    set({ loading: true, error: null });
    try {
      console.log('[DEBUG] fetchRankings: Starting fetch...');
      const { data, error } = await supabase
        .from('rankings_view')
        .select('*')
        .order('rating', { ascending: false });

      console.log('[DEBUG] fetchRankings: Raw data:', data);
      console.log('[DEBUG] fetchRankings: Error:', error);

      if (error) throw error;

      const rankingsWithPosition = (data || []).map((entry: any, index: number) => {
        const rankInfo = getRankFromRating(entry.rating);
        const totalBattles = entry.battles_won + entry.battles_lost;
        const winRate = totalBattles > 0 ? (entry.battles_won / totalBattles) * 100 : 0;
        
        return {
          user_id: entry.user_id,
          username: entry.username,
          avatar_url: entry.avatar_url,
          rating: entry.rating,
          season_points: entry.season_points,
          rank_name: rankInfo.name,
          rank_color: rankInfo.color,
          battles_won: entry.battles_won,
          battles_lost: entry.battles_lost,
          win_rate: winRate,
          position: index + 1
        } as RankingEntry;
      });

      console.log('[DEBUG] fetchRankings: Processed rankings:', rankingsWithPosition);
      set({ rankings: rankingsWithPosition });
    } catch (error) {
      console.error('[ERROR] fetchRankings:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch rankings' });
    } finally {
      set({ loading: false });
    }
  },

  fetchVoterRankings: async () => {
    set({ voterLoading: true, voterError: null });
    try {
      const { data, error } = await supabase
        .from('voter_rankings_view')
        .select('*')
        .order('vote_count', { ascending: false });

      if (error) throw error;

      const voterRankingsWithPosition = (data || []).map((entry: any, index: number) => {
        // voter_rankings_viewのidをuser_idにマッピング
        const rankInfo = getRankFromRating(1200); // 投票者にはデフォルトランクを設定
        
        return {
          user_id: entry.id,
          username: entry.username,
          avatar_url: entry.avatar_url,
          vote_count: entry.vote_count,
          rating: 1200, // デフォルト値
          rank_name: rankInfo.name,
          rank_color: rankInfo.color,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          position: index + 1
        } as VoterRankingEntry;
      });

      set({ voterRankings: voterRankingsWithPosition });
    } catch (error) {
      set({ voterError: error instanceof Error ? error.message : 'Failed to fetch voter rankings' });
    } finally {
      set({ voterLoading: false });
    }
  },

  fetchSeasons: async () => {
    try {
      console.log('[DEBUG] fetchSeasons: Starting season fetch...');
      const { data, error } = await supabase.rpc('get_all_seasons');

      console.log('[DEBUG] fetchSeasons: Raw response:', { data, error });

      if (error) throw error;

      const currentSeason = data?.find((season: Season) => season.status === 'active') || null;
      console.log('[DEBUG] fetchSeasons: Current season found:', currentSeason);
      
      set({ 
        seasons: data || [], 
        currentSeason,
        selectedSeasonId: get().selectedSeasonId || currentSeason?.id || null,
        activeRankingType: currentSeason ? 'current_season' : 'all_time',
        activeVoterRankingType: currentSeason ? 'current_season' : 'all_time'
      });
      
      console.log('[DEBUG] fetchSeasons: Final state set:', {
        seasonsCount: data?.length || 0,
        currentSeason: currentSeason?.name,
        activeRankingType: currentSeason ? 'current_season' : 'all_time'
      });
    } catch (error) {
      console.error('Failed to fetch seasons:', error);
    }
  },

  fetchSeasonRankings: async () => {
    set({ seasonLoading: true, seasonError: null });
    try {
      const { data, error } = await supabase
        .from('season_rankings_view')
        .select('*')
        .order('season_points', { ascending: false });

      if (error) throw error;

      const seasonRankingsWithPosition = (data || []).map((entry, index) => ({
        ...entry,
        position: index + 1
      }));

      set({ seasonRankings: seasonRankingsWithPosition });
    } catch (error) {
      set({ seasonError: error instanceof Error ? error.message : 'Failed to fetch season rankings' });
    } finally {
      set({ seasonLoading: false });
    }
  },

  fetchSeasonVoterRankings: async () => {
    set({ seasonVoterLoading: true, seasonVoterError: null });
    try {
      const { data, error } = await supabase
        .from('season_voter_rankings_view')
        .select('*')
        .order('season_vote_points', { ascending: false });

      if (error) throw error;

      // ビューが既にrankを含んでいるため、そのまま使用
      set({ seasonVoterRankings: data || [] });
    } catch (error) {
      set({ seasonVoterError: error instanceof Error ? error.message : 'Failed to fetch season voter rankings' });
    } finally {
      set({ seasonVoterLoading: false });
    }
  },

  fetchHistoricalSeasonRankings: async (seasonId: string) => {
    set({ historicalLoading: true, historicalError: null });
    try {
      const { data, error } = await supabase.rpc('get_season_rankings_by_id', {
        p_season_id: seasonId
      });

      if (error) throw error;

      const historicalRankings = (data || []).map((entry: any) => ({
        id: `${entry.user_id}-${seasonId}`,
        season_id: seasonId,
        user_id: entry.user_id,
        rank: entry.rank,
        points: entry.points,
        username: entry.username,
        avatar_url: entry.avatar_url,
        created_at: new Date().toISOString()
      }));

      set({ historicalSeasonRankings: historicalRankings });
    } catch (error) {
      set({ historicalError: error instanceof Error ? error.message : 'Failed to fetch historical season rankings' });
    } finally {
      set({ historicalLoading: false });
    }
  },

  fetchHistoricalSeasonVoterRankings: async (seasonId: string) => {
    console.log('[DEBUG] fetchHistoricalSeasonVoterRankings called with:', seasonId);
    set({ historicalVoterLoading: true, historicalVoterError: null });
    try {
      const { data, error } = await supabase.rpc('get_season_voter_rankings_by_id', {
        p_season_id: seasonId
      });

      console.log('[DEBUG] fetchHistoricalSeasonVoterRankings response:', { data, error });

      if (error) throw error;

      set({ historicalSeasonVoterRankings: data || [] });
    } catch (error) {
      console.error('[ERROR] fetchHistoricalSeasonVoterRankings:', error);
      set({ historicalVoterError: error instanceof Error ? error.message : 'Failed to fetch historical season voter rankings' });
    } finally {
      set({ historicalVoterLoading: false });
    }
  },

  setActiveRankingType: (type: RankingType) => {
    set({ activeRankingType: type });
  },

  setActiveVoterRankingType: (type: VoterRankingType) => {
    set({ activeVoterRankingType: type });
  },

  setSelectedSeasonId: (seasonId: string | null) => {
    set({ selectedSeasonId: seasonId });
  }
}));