import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { generateSubmissionMessage } from '../utils/dateUtils';

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
  const { i18n } = useTranslation();

  const fetchSubmissionStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_submission_status');

      if (rpcError) {
        throw rpcError;
      }

      const generateMessage = (reason: string | null, nextSeasonStartDate: string | null): string => {
        const currentLanguage = i18n.language.startsWith('en') ? 'en' : 'ja';
        return generateSubmissionMessage(reason, nextSeasonStartDate, currentLanguage);
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
  }, [i18n.language]);

  const refreshStatus = async () => {
    await fetchSubmissionStatus();
  };

  useEffect(() => {
    fetchSubmissionStatus();
  }, [fetchSubmissionStatus]);

  return {
    submissionStatus,
    isLoading,
    error,
    refreshStatus
  };
};
