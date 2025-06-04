import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Submission {
  id: string;
  created_at: string;
  user_id: string;
  video_url: string;
  battle_format: 'MAIN_BATTLE' | 'MINI_BATTLE' | 'THEME_CHALLENGE';
  status: 'WAITING_OPPONENT' | 'MATCHED_IN_BATTLE' | 'BATTLE_ENDED' | 'WITHDRAWN';
  rank_at_submission?: number;
  active_battle_id?: string;
}

interface SubmissionState {
  submissions: Submission[];
  loading: boolean;
  error: string | null;
  fetchSubmissions: () => Promise<void>;
  withdrawSubmission: (id: string) => Promise<void>;
}

export const useSubmissionStore = create<SubmissionState>((set) => ({
  submissions: [],
  loading: false,
  error: null,

  fetchSubmissions: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ submissions: data || [] });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch submissions' });
    } finally {
      set({ loading: false });
    }
  },

  withdrawSubmission: async (id: string) => {
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ status: 'WITHDRAWN' })
        .eq('id', id)
        .eq('status', 'WAITING_OPPONENT'); // Only allow withdrawal if still waiting

      if (error) throw error;

      set(state => ({
        submissions: state.submissions.map(sub =>
          sub.id === id ? { ...sub, status: 'WITHDRAWN' } : sub
        )
      }));
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to withdraw submission');
    }
  }
}));