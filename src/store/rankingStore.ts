import { create } from 'zustand';
import { RankingEntry } from '../types';
import { supabase } from '../lib/supabase';

interface RankingState {
  rankings: RankingEntry[];
  loading: boolean;
  error: string | null;
  fetchRankings: () => Promise<void>;
}

export const useRankingStore = create<RankingState>((set) => ({
  rankings: [],
  loading: false,
  error: null,

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
  }
}));