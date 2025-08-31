import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useRewardEarnedStore } from '../../store/rewardEarnedStore';
import { useTranslation } from 'react-i18next';

export const RewardEarnedModal: React.FC = () => {
  const { t } = useTranslation();
  const { isOpen, reward, close, goToCollection } = useRewardEarnedStore();

  if (!reward) return null;

  return (
    <Modal isOpen={isOpen} onClose={close} plain>
      <div className="p-6">
        <div className="text-center">
          <div className="mx-auto w-28 h-28 rounded-full bg-gradient-to-br from-yellow-400/20 to-amber-500/20 flex items-center justify-center ring-1 ring-amber-300/30">
            <img src={reward.image_url} alt={reward.name} className="w-20 h-20 object-contain" />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">{t('rewards.notifications.earned.title', 'シーズン報酬獲得！')}</h3>
          <p className="mt-2 text-slate-300">{t('rewards.notifications.earned.message', { defaultValue: '「{{rewardName}}」を獲得しました！', rewardName: reward.name })}</p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3">
          <Button onClick={goToCollection} className="w-full bg-amber-500 hover:bg-amber-600">
            {t('rewards.notifications.earned.viewCollection', 'コレクションを見る')}
          </Button>
          <Button variant="outline" onClick={close} className="w-full">
            {t('common.close', '閉じる')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RewardEarnedModal;
