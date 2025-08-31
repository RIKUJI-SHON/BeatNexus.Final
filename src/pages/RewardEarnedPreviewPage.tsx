import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useRewardEarnedStore } from '../store/rewardEarnedStore';
import RewardEarnedModal from '../components/ui/RewardEarnedModal';
import { useTranslation } from 'react-i18next';
import type { Reward } from '../types/rewards';

const RewardEarnedPreviewPage: React.FC = () => {
  const { t } = useTranslation();
  const { open } = useRewardEarnedStore();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReward, setSelectedReward] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('rewards').select('*').eq('is_active', true).order('created_at', { ascending: false });
      setRewards(data || []);
    })();
  }, []);

  const handleOpenModal = async () => {
    if (!selectedReward) return;
    const reward = rewards.find(r => r.id === selectedReward);
    if (reward) open(reward);
  };

  const handleInsertNotification = async () => {
    if (!selectedReward) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      // サーバー関数経由（あれば）: create_reward_earned_notification
      const { data, error } = await supabase.rpc('create_reward_earned_notification', {
        p_user_id: user.id,
        p_reward_id: selectedReward,
        p_season_id: null,
      });
      if (error) throw error;
      console.log('Notification created with id:', data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="bg-gray-900 border border-gray-800 p-6">
        <h1 className="text-white text-xl font-semibold mb-4">Reward Earned Modal Preview</h1>
        <div className="space-y-4">
          <select
            className="w-full bg-gray-800 text-white p-3 rounded-md border border-gray-700"
            value={selectedReward}
            onChange={(e) => setSelectedReward(e.target.value)}
          >
            <option value="">Select a reward</option>
            {rewards.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <div className="flex gap-3">
            <Button onClick={handleOpenModal} disabled={!selectedReward}>
              {t('rewards.notifications.earned.title', 'モーダル表示')}
            </Button>
            <Button onClick={handleInsertNotification} disabled={!selectedReward || loading} variant="outline">
              {loading ? 'Saving...' : 'DBへ通知を挿入'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Inline modal to ensure component present */}
      <RewardEarnedModal />
    </div>
  );
};

export default RewardEarnedPreviewPage;
