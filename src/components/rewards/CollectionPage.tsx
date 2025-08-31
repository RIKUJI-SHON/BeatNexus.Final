import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Reward, UserReward } from '../../types/rewards';
import { toast } from '../../store/toastStore';
import BadgeCard from './BadgeCard';
import EmptyCollectionState from './EmptyCollectionState';

interface CollectionPageProps {
  userId: string;
  isOwnProfile: boolean;
  horizontal?: boolean; // 横スクロール表示（プロフィール上部用）
}

const CollectionPage: React.FC<CollectionPageProps> = ({ userId, horizontal = false }) => {
  const [userRewards, setUserRewards] = useState<UserReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLanguage, setProfileLanguage] = useState<string>('en');

  const fetchCollection = useCallback(async () => {
    if (!userId) {
      console.error('UserID is required for fetching collection');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // プロフィールの言語を取得
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('language')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.warn('Profile language fetch error:', profileError.message);
      } else if (profile?.language) {
        setProfileLanguage(profile.language);
      }

      // ユーザーが獲得した報酬のみを取得（未獲得は表示しない）
      const { data: userRewardsData, error: userRewardsError } = await supabase
        .from('user_rewards')
        .select(`
          *,
          reward:rewards(*)
        `)
        .eq('user_id', userId);

      if (userRewardsError) {
        console.error('User rewards fetch error:', userRewardsError);
        throw userRewardsError;
      }

      console.log('Collection fetch successful:', {
        userRewardsCount: userRewardsData?.length || 0
      });

      setUserRewards(userRewardsData || []);

    } catch (error) {
      console.error('Error fetching collection:', error);
      const errorMessage = error instanceof Error ? error.message : 'コレクションの読み込みに失敗しました';
      toast.error('エラー', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchCollection();
    }
  }, [userId, fetchCollection]);

  // 獲得済み報酬をフィルタリング（バッジのみ表示）
  const earnedRewards = userRewards
    .map(ur => ur.reward)
    .filter((reward): reward is Reward => reward !== null);

  const pickDescription = (reward: Reward) => {
    const lang = (profileLanguage || '').toLowerCase();
    if (lang === 'ja') return reward.description_ja || reward.description || null;
    // default to English, fall back to JA, then original description
    return reward.description_en || reward.description_ja || reward.description || null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* コレクション表示 */}
      {earnedRewards.length === 0 ? (
        <EmptyCollectionState type="badges" />
      ) : horizontal ? (
        <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:'none'] [scrollbar-width:'none'] [&::-webkit-scrollbar]:hidden">
          {earnedRewards.map((reward) => {
            const earnedReward = userRewards.find(ur => ur.reward_id === reward.id);
            if (reward.type !== 'badge') return null;
            return (
              <div key={reward.id} className="min-w-[200px] w-[200px]">
                <BadgeCard
                  id={reward.id}
                  name={reward.name}
                  description={pickDescription(reward) || undefined}
                  image_url={reward.image_url}
                  isEarned={true}
                  earnedAt={earnedReward?.earned_at}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {earnedRewards.map((reward) => {
            const earnedReward = userRewards.find(ur => ur.reward_id === reward.id);
            if (reward.type !== 'badge') return null;
            return (
              <BadgeCard
                key={reward.id}
                id={reward.id}
                name={reward.name}
                description={pickDescription(reward) || undefined}
                image_url={reward.image_url}
                isEarned={true}
                earnedAt={earnedReward?.earned_at}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CollectionPage;
