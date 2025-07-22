import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Reward, UserReward } from '../../types/rewards';
import { toast } from '../../store/toastStore';
import BadgeCard from './BadgeCard';
import EmptyCollectionState from './EmptyCollectionState';

interface CollectionPageProps {
  userId: string;
  isOwnProfile: boolean;
}

const CollectionPage: React.FC<CollectionPageProps> = ({ userId }) => {
  const [userRewards, setUserRewards] = useState<UserReward[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCollection = useCallback(async () => {
    if (!userId) {
      console.error('UserID is required for fetching collection');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

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
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {earnedRewards.map((reward) => {
          const earnedReward = userRewards.find(ur => ur.reward_id === reward.id);
          
          if (reward.type === 'badge') {
            return (
              <BadgeCard
                key={reward.id}
                id={reward.id}
                name={reward.name}
                description={reward.description || undefined}
                image_url={reward.image_url}
                isEarned={true} // 獲得済みのみ表示
                earnedAt={earnedReward?.earned_at}
              />
            );
          }
          
          return null;
          })}
        </div>
      )}
    </div>
  );
};export default CollectionPage;
