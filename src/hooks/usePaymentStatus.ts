import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface PaymentStatus {
  id: string;
  stripe_payment_intent_id: string;
  payment_status: 'pending' | 'succeeded' | 'failed';
  transfer_status: 'pending' | 'paid';
  completed_at: string | null;
}

export const usePaymentStatus = (paymentIntentId?: string) => {
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPaymentStatus = useCallback(async () => {
    if (!paymentIntentId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('super_tips')
        .select('id, stripe_payment_intent_id, payment_status, transfer_status, completed_at')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [paymentIntentId]);

  // ポーリング機能：pending状態の場合は定期的にチェック
  useEffect(() => {
    if (!paymentIntentId) return;

    checkPaymentStatus();

    // 初回チェック後、pending状態の場合はポーリング開始
    const pollInterval = setInterval(() => {
      if (status?.payment_status === 'pending') {
        checkPaymentStatus();
      }
    }, 3000); // 3秒毎にチェック

    // 5分後にポーリングを停止（タイムアウト）
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [paymentIntentId, status?.payment_status, checkPaymentStatus]);

  // 完了状態かどうかの判定
  const isCompleted = status?.payment_status === 'succeeded' || status?.payment_status === 'failed';
  const isSucceeded = status?.payment_status === 'succeeded';
  const isFailed = status?.payment_status === 'failed';
  const isPending = status?.payment_status === 'pending';

  return {
    status,
    loading,
    error,
    isCompleted,
    isSucceeded,
    isFailed,
    isPending,
    refetch: checkPaymentStatus
  };
};
