import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Submission {
  id: string;
  created_at: string;
  user_id: string;
  video_url: string | null;
  // Cloudflare Stream 対応フィールド（後方互換のためオプショナル）
  stream_video_id?: string | null;
  stream_status?: 'uploading' | 'processing' | 'ready' | 'error' | null;
  stream_thumbnail_url?: string | null;
  stream_preview_url?: string | null;
  stream_error_message?: string | null;
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

// 取得行の軽量型（DBのsubmissionsテーブル想定）
type SubmissionRow = {
  id: string;
  created_at: string;
  user_id: string;
  video_url: string | null;
  battle_format: 'MAIN_BATTLE' | 'MINI_BATTLE' | 'THEME_CHALLENGE';
  status: 'WAITING_OPPONENT' | 'MATCHED_IN_BATTLE' | 'BATTLE_ENDED' | 'WITHDRAWN';
  rank_at_submission?: number | null;
  active_battle_id?: string | null;
  updated_at?: string | null;
  stream_video_id?: string | null;
  stream_status?: 'uploading' | 'processing' | 'ready' | 'error' | null;
  stream_thumbnail_url?: string | null;
  stream_preview_url?: string | null;
  stream_error_message?: string | null;
};

export const useSubmissionStore = create<SubmissionState>((set) => ({
  submissions: [],
  loading: false,
  error: null,

  fetchSubmissions: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('id, created_at, user_id, video_url, battle_format, status, rank_at_submission, active_battle_id, updated_at, stream_video_id, stream_status, stream_thumbnail_url, stream_preview_url, stream_error_message')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // 型整形（後方互換: video_url が null の場合に備える）
  const normalized = (data as SubmissionRow[] | null || []).map((row) => ({
        id: row.id,
        created_at: row.created_at,
        user_id: row.user_id,
        video_url: row.video_url ?? null,
        battle_format: row.battle_format,
        status: row.status,
        rank_at_submission: row.rank_at_submission,
        active_battle_id: row.active_battle_id,
        // Stream fields (optional)
        stream_video_id: row.stream_video_id ?? null,
        stream_status: row.stream_status ?? null,
        stream_thumbnail_url: row.stream_thumbnail_url ?? null,
        stream_preview_url: row.stream_preview_url ?? null,
        stream_error_message: row.stream_error_message ?? null,
      })) as Submission[];

      set({ submissions: normalized });
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