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
          sender:sender_user_id ( username, avatar_url )
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
      type RawTip = {
        id: string;
        battle_id: string | null;
        sender_user_id: string;
        vote: 'A' | 'B' | null;
        comment: string;
        amount_jpy: number;
        payment_status: string;
        created_at: string;
        sender?: { username: string; avatar_url: string | null } | { username: string; avatar_url: string | null }[];
      };
      const tipsWithBattles = await Promise.all(
        (data || []).map(async (tip: RawTip) => {
          // sender は埋め込み alias (単体または配列) 想定
          const senderRaw = tip.sender;
          const sender_profile = Array.isArray(senderRaw)
            ? (senderRaw[0] || { username: 'Unknown User', avatar_url: null })
            : (senderRaw || { username: 'Unknown User', avatar_url: null });
          const tipWithCorrectProfile = {
            id: tip.id as string,
            battle_id: tip.battle_id as string | null,
            sender_user_id: tip.sender_user_id as string,
            vote: tip.vote as ('A'|'B'|null),
            comment: tip.comment as string,
            amount_jpy: tip.amount_jpy as number,
            payment_status: tip.payment_status as string,
            created_at: tip.created_at as string,
            sender_profile,
          };

          if (!tip.battle_id) {
            return { ...tipWithCorrectProfile, battle: null } as SuperTipReceived;
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

            return { ...tipWithCorrectProfile, battle: battleWithProfiles } as SuperTipReceived;
          } catch (battleError) {
            console.warn(`Battle ${tip.battle_id} not found or error:`, battleError);
            return { ...tipWithCorrectProfile, battle: null } as SuperTipReceived;
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
