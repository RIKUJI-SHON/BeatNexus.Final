import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Reward } from '../types/rewards';

interface UserFrame {
  reward: Reward;
  earnedAt: string;
}

interface UseFramesReturn {
  frames: UserFrame[];
  equippedFrame: Reward | null;
  isLoading: boolean;
  error: string | null;
  equipFrame: (frameId: string) => Promise<void>;
  unequipFrame: () => Promise<void>;
  refreshFrames: () => Promise<void>;
}

export const useFrames = (userId?: string): UseFramesReturn => {
  const [frames, setFrames] = useState<UserFrame[]>([]);
  const [equippedFrame, setEquippedFrame] = useState<Reward | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const targetUserId = userId || user?.id;

  // ユーザーの獲得済みフレーム一覧を取得
  const fetchUserFrames = useCallback(async () => {
    if (!targetUserId) return;

    try {
      setIsLoading(true);
      setError(null);

      // 獲得済みフレーム一覧を取得
      const { data: userFrames, error: framesError } = await supabase
        .from('user_rewards')
        .select(`
          earned_at,
          reward:rewards!inner (
            id,
            name,
            description,
            type,
            image_url,
            season_id,
            is_active
          )
        `)
        .eq('user_id', targetUserId)
        .eq('reward.type', 'frame')
        .eq('reward.is_active', true)
        .order('earned_at', { ascending: false });

      if (framesError) throw framesError;

      const formattedFrames: UserFrame[] = (userFrames || [])
        .filter(item => item.reward && typeof item.reward === 'object')
        .map(item => ({
          reward: item.reward as unknown as Reward,
          earnedAt: item.earned_at
        }));

      setFrames(formattedFrames);

      // 装備中のフレームを取得
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          equipped_frame_id,
          equipped_frame:rewards(
            id,
            name,
            description,
            type,
            image_url,
            season_id,
            is_active
          )
        `)
        .eq('id', targetUserId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      setEquippedFrame((profile?.equipped_frame as unknown as Reward) || null);

    } catch (err) {
      console.error('Failed to fetch user frames:', err);
      setError('フレーム情報の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId]);

  // フレームを装備
  const equipFrame = async (frameId: string) => {
    if (!user?.id) throw new Error('ログインが必要です');

    try {
      // フレームを所有しているかチェック
      const ownedFrame = frames.find(f => f.reward.id === frameId);
      if (!ownedFrame) {
        throw new Error('このフレームを所有していません');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ equipped_frame_id: frameId })
        .eq('id', user.id);

      if (error) throw error;

      setEquippedFrame(ownedFrame.reward);

    } catch (err) {
      console.error('Failed to equip frame:', err);
      throw err;
    }
  };

  // フレームを外す
  const unequipFrame = async () => {
    if (!user?.id) throw new Error('ログインが必要です');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ equipped_frame_id: null })
        .eq('id', user.id);

      if (error) throw error;

      setEquippedFrame(null);

    } catch (err) {
      console.error('Failed to unequip frame:', err);
      throw err;
    }
  };

  // データの再取得
  const refreshFrames = async () => {
    await fetchUserFrames();
  };

  useEffect(() => {
    fetchUserFrames();
  }, [fetchUserFrames]);

  return {
    frames,
    equippedFrame,
    isLoading,
    error,
    equipFrame,
    unequipFrame,
    refreshFrames
  };
};

// フレーム画像URLを取得するためのフック
export const useFrameImage = (frameId?: string | null) => {
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchFrameImage = async () => {
      if (!frameId) {
        setFrameUrl(null);
        return;
      }

      setIsLoading(true);
      try {
        const { data: frame, error } = await supabase
          .from('rewards')
          .select('image_url')
          .eq('id', frameId)
          .eq('type', 'frame')
          .eq('is_active', true)
          .single();

        if (error) throw error;
        setFrameUrl(frame?.image_url || null);

      } catch (err) {
        console.error('Failed to fetch frame image:', err);
        setFrameUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFrameImage();
  }, [frameId]);

  return { frameUrl, isLoading };
};
