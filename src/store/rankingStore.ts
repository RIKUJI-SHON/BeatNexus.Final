import { create } from 'zustand';
import { RankingEntry, VoterRankingEntry } from '../types';
import { supabase } from '../lib/supabase';

interface RankingState {
  rankings: RankingEntry[];
  voterRankings: VoterRankingEntry[];
  loading: boolean;
  voterLoading: boolean;
  error: string | null;
  voterError: string | null;
  fetchRankings: () => Promise<void>;
  fetchVoterRankings: () => Promise<void>;
}

export const useRankingStore = create<RankingState>((set) => ({
  rankings: [],
  voterRankings: [],
  loading: false,
  voterLoading: false,
  error: null,
  voterError: null,

  fetchRankings: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('rankings_view')
        .select('*')
        .order('rating', { ascending: false });

      if (error) throw error;

      const rankingsWithPosition = (data || []).map((entry, index) => ({
        ...entry,
        position: index + 1
      }));

      set({ rankings: rankingsWithPosition });
    } catch (error) {
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

      const voterRankingsWithPosition = (data || []).map((entry, index) => ({
        ...entry,
        position: index + 1
      }));

      set({ voterRankings: voterRankingsWithPosition });
    } catch (error) {
      set({ voterError: error instanceof Error ? error.message : 'Failed to fetch voter rankings' });
    } finally {
      set({ voterLoading: false });
    }
  }
}));