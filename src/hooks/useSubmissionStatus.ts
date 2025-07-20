import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SubmissionStatus {
  canSubmit: boolean;
  reason: 'SEASON_OFF' | 'ENDING_SOON' | null;
  message: string;
  nextSeasonStartDate: string | null;
  activeSeason: {
    id: string;
    name: string;
    end_at: string;
  } | null;
}

interface UseSubmissionStatusReturn {
  submissionStatus: SubmissionStatus | null;
  isLoading: boolean;
  error: string | null;
  refreshStatus: () => Promise<void>;
}

export const useSubmissionStatus = (): UseSubmissionStatusReturn => {
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmissionStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_submission_status');

      if (rpcError) {
        throw rpcError;
      }

      const generateMessage = (reason: string | null, nextSeasonStartDate: string | null): string => {
        if (reason === 'SEASON_OFF') {
          if (nextSeasonStartDate) {
            const startDate = new Date(nextSeasonStartDate);
            return `シーズンが終了しています。次のシーズンは ${startDate.toLocaleDateString('ja-JP')} に開始予定です。`;
          }
          return 'シーズンが終了しています。次のシーズンの開始をお待ちください。';
        }
        if (reason === 'ENDING_SOON') {
          return 'シーズン終了の5日前のため、新しい動画の投稿はできません。';
        }
        return '';
      };

      const statusData: SubmissionStatus = {
        canSubmit: data.can_submit,
        reason: data.reason,
        message: generateMessage(data.reason, data.next_season_start_date),
        nextSeasonStartDate: data.next_season_start_date,
        activeSeason: data.active_season
      };

      setSubmissionStatus(statusData);
    } catch (err) {
      console.error('Failed to fetch submission status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch submission status');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStatus = async () => {
    await fetchSubmissionStatus();
  };

  useEffect(() => {
    fetchSubmissionStatus();
  }, []);

  return {
    submissionStatus,
    isLoading,
    error,
    refreshStatus
  };
};
