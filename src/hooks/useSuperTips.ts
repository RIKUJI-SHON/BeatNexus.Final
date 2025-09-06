import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface SuperTipReceived {
  id: string;
  battle_id: string | null;
  sender_user_id: string;
  vote: 'A' | 'B' | null;
  comment: string;
  amount_jpy: number;
  payment_status: string;
  created_at: string;
  sender_profile: {
    username: string;
    avatar_url: string | null;
  };
  battle?: {
    player1_user_id: string;
    player2_user_id: string;
    player1_profile: { username: string };
    player2_profile: { username: string };
  } | null;
}

export const useSuperTips = () => {
  const [receivedTips, setReceivedTips] = useState<SuperTipReceived[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReceivedTips = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError || !user.user) {
        setError('認証が必要です');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('super_tips')
        .select(`
          id,
          battle_id,
          sender_user_id,
          vote,
          comment,
          amount_jpy,
          payment_status,
          created_at,
          sender_profile:profiles!sender_user_id (
            username,
            avatar_url
          )
        `)
        .eq('recipient_user_id', user.user.id)
        .eq('payment_status', 'succeeded')
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      // バトル情報を別途取得（存在する場合のみ）
      const tipsWithBattles = await Promise.all(
        (data || []).map(async (tip) => {
          const tipWithCorrectProfile = {
            ...tip,
            sender_profile: Array.isArray(tip.sender_profile) && tip.sender_profile.length > 0 
              ? tip.sender_profile[0] 
              : { username: 'Unknown User', avatar_url: null }
          };

          if (!tip.battle_id) {
            return { ...tipWithCorrectProfile, battle: null };
          }

          try {
            const { data: battleData } = await supabase
              .from('active_battles')
              .select(`
                player1_user_id,
                player2_user_id,
                player1_profile:profiles!player1_user_id (username),
                player2_profile:profiles!player2_user_id (username)
              `)
              .eq('id', tip.battle_id)
              .single();

            const battleWithProfiles = battleData ? {
              ...battleData,
              player1_profile: Array.isArray(battleData.player1_profile) && battleData.player1_profile.length > 0
                ? battleData.player1_profile[0]
                : { username: 'Unknown Player' },
              player2_profile: Array.isArray(battleData.player2_profile) && battleData.player2_profile.length > 0
                ? battleData.player2_profile[0]
                : { username: 'Unknown Player' }
            } : null;

            return { ...tipWithCorrectProfile, battle: battleWithProfiles };
          } catch (battleError) {
            console.warn(`Battle ${tip.battle_id} not found or error:`, battleError);
            return { ...tipWithCorrectProfile, battle: null };
          }
        })
      );

      setReceivedTips(tipsWithBattles);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReceivedTips();
  }, [fetchReceivedTips]);

  return {
    receivedTips,
    loading,
    error,
    refetch: fetchReceivedTips
  };
};
