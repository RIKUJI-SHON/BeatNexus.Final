import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface SubmissionCooldownResult {
  can_submit: boolean;
  last_submission_time: string | null;
  hours_since_last: number | null;
  cooldown_remaining_minutes: number;
  message: string;
}

interface SubmissionCooldownState {
  cooldownInfo: SubmissionCooldownResult | null;
  isLoading: boolean;
  error: string | null;
  canSubmit: boolean;
  remainingTime: string;
}

export const useSubmissionCooldown = () => {
  const { user } = useAuthStore();
  const [state, setState] = useState<SubmissionCooldownState>({
    cooldownInfo: null,
    isLoading: false,
    error: null,
    canSubmit: true,
    remainingTime: '',
  });

  const checkCooldown = async () => {
    if (!user) {
      setState(prev => ({
        ...prev,
        cooldownInfo: null,
        canSubmit: false,
        error: 'User not authenticated',
        remainingTime: '',
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase.rpc('check_submission_cooldown', {
        p_user_id: user.id
      });

      if (error) {
        throw new Error(error.message);
      }

      const cooldownInfo = data as SubmissionCooldownResult;
      const remainingTime = formatRemainingTime(cooldownInfo.cooldown_remaining_minutes);

      setState(prev => ({
        ...prev,
        cooldownInfo,
        canSubmit: cooldownInfo.can_submit,
        remainingTime,
        isLoading: false,
      }));

    } catch (error) {
      console.error('Error checking submission cooldown:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
        canSubmit: false,
        remainingTime: '',
      }));
    }
  };

  const formatRemainingTime = (minutes: number): string => {
    if (minutes <= 0) return '';
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}時間${remainingMinutes}分`;
    }
    return `${remainingMinutes}分`;
  };

  // コンポーネントマウント時とユーザー変更時にチェック
  useEffect(() => {
    if (user) {
      checkCooldown();
    }
  }, [user]);

  // 1分ごとに残り時間を更新（クールダウン中のみ）
  useEffect(() => {
    if (!state.canSubmit && state.cooldownInfo && state.cooldownInfo.cooldown_remaining_minutes > 0) {
      const interval = setInterval(() => {
        checkCooldown();
      }, 60000); // 1分ごと

      return () => clearInterval(interval);
    }
  }, [state.canSubmit, state.cooldownInfo?.cooldown_remaining_minutes]);

  return {
    ...state,
    checkCooldown,
    refreshCooldown: checkCooldown,
  };
}; 