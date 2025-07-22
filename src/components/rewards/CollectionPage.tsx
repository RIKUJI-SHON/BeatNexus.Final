import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Reward, UserReward } from '../../types/rewards';
import { toast } from '../../store/toastStore';
import BadgeCard from './BadgeCard';
import FrameCard from './FrameCard';
import EmptyCollectionState from './EmptyCollectionState';
import { useFrames } from '../../hooks/useFrames';

interface CollectionPageProps {
  userId: string;
  isOwnProfile: boolean;
}

const CollectionPage: React.FC<CollectionPageProps> = ({ userId, isOwnProfile }) => {
  const [userRewards, setUserRewards] = useState<UserReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'badge' | 'frame'>('all');
  
  // フレーム関連のフック（自分のプロフィールの場合のみ）
  const { equipFrame, unequipFrame } = useFrames(isOwnProfile ? userId : undefined);

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

  // 獲得済み報酬をフィルタリング（未獲得は表示しない）
  const earnedRewards = userRewards
    .map(ur => ur.reward)
    .filter((reward): reward is Reward => reward !== null)
    .filter(reward => {
      if (filterType !== 'all' && reward.type !== filterType) return false;
      return true;
    });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* フィルター - より視認性の高いデザイン */}
      <div className="flex flex-wrap gap-4 p-4 bg-gradient-to-r from-slate-800/60 to-slate-700/40 rounded-xl border border-slate-600/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-slate-200 text-sm font-medium">タイプ:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'badge' | 'frame')}
            className="bg-slate-700/80 border border-slate-500/50 rounded-lg px-4 py-2 text-slate-100 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 hover:border-slate-400"
          >
            <option value="all">全て</option>
            <option value="badge">バッジ</option>
            <option value="frame">フレーム</option>
          </select>
        </div>
      </div>

      {/* コレクション表示 */}
      {earnedRewards.length === 0 ? (
        <EmptyCollectionState 
          type={filterType === 'badge' ? 'badges' : filterType === 'frame' ? 'frames' : 'all'} 
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {earnedRewards.map((reward) => {
          const earnedReward = userRewards.find(ur => ur.reward_id === reward.id);
          
          if (reward.type === 'badge') {
            return (
              <BadgeCard
                key={reward.id}
                badge={reward}
                isEarned={true} // 獲得済みのみ表示
                earnedAt={earnedReward?.earned_at}
                showDetailOnClick={true}
              />
            );
          } else if (reward.type === 'frame') {
            return (
              <FrameCard
                key={reward.id}
                frame={reward}
                isEarned={true} // 獲得済みのみ表示
                isEquipped={false} // TODO: 装備状態の実装
                earnedAt={earnedReward?.earned_at}
                showEquipButton={isOwnProfile}
                showPreview={true}
                onEquip={async (frameId) => {
                  try {
                    await equipFrame(frameId);
                    toast.success('フレームを装備しました');
                  } catch {
                    toast.error('フレームの装備に失敗しました');
                  }
                }}
                onUnequip={async () => {
                  try {
                    await unequipFrame();
                    toast.success('フレームを外しました');
                  } catch {
                    toast.error('フレームを外すのに失敗しました');
                  }
                }}
                onPreview={(frameId) => {
                  // TODO: プレビュー機能の実装
                  console.log('Preview frame:', frameId);
                }}
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
