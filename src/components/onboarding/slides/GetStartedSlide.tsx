import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../../../store/onboardingStore';
import { useAuthStore } from '../../../store/authStore';
import { useBattleStore } from '../../../store/battleStore';

const GetStartedSlide: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { completeOnboarding } = useOnboardingStore();
  const { user } = useAuthStore();
  const { activeBattles } = useBattleStore();

  const handleBattleStart = async () => {
    // オンボーディング完了処理とモーダルクローズ
    if (user) {
      await completeOnboarding(user.id);
    }
    
    // バトル投稿画面に遷移
    navigate('/post');
  };

  const handleGoToTopVotedBattle = async () => {
    if (user) {
      await completeOnboarding(user.id);
    }
    // 最も票数合計の多いアクティブバトルを選択
    if (activeBattles && activeBattles.length > 0) {
      const top = [...activeBattles]
        .map(b => ({ ...b, totalVotes: (b.votes_a || 0) + (b.votes_b || 0) }))
        .sort((a, b) => b.totalVotes - a.totalVotes)[0];
      if (top) {
        navigate(`/battle/${top.id}`);
        return;
      }
    }
    // フォールバック: 一覧ページ
    navigate('/battles');
  };

  return (
    <div className="onboarding-card md:w-96 md:h-[500px] w-[340px] h-[440px]">
      <div className="onboarding-content">
        {/* 上部タイトル */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white">
            {t('onboarding.slide5.title')}
          </h2>
        </div>

        {/* 中央 2カラム: 左 バトル開始 / 右 投票 */}
        <div className="flex flex-col items-center mb-8 w-full">
          <div className="grid grid-cols-2 gap-6 w-full place-items-center">
            {/* Start Battle Button */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleBattleStart}
                className="bg-black p-6 rounded-full shadow-lg hover:scale-105 transition-transform cursor-pointer border-2 border-gray-600 hover:border-gray-400"
              >
                <img 
                  src="/images/VS.png" 
                  alt="Battle Start"
                  className="w-14 h-14 md:w-16 md:h-16 object-contain filter brightness-110 drop-shadow-lg transition-all duration-300"
                />
              </button>
              <p className="text-gray-300 text-sm mt-3">Start battle</p>
            </div>
            {/* Voting (Top Battle) Button */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleGoToTopVotedBattle}
                className="bg-black p-6 rounded-full shadow-lg hover:scale-105 transition-transform cursor-pointer border-2 border-gray-600 hover:border-gray-400"
              >
                <img
                  src="/images/onboarding/ChatGPT Image 2025年7月4日 21_57_02.png"
                  alt="Go to Top Voted Battle"
                  className="w-14 h-14 md:w-16 md:h-16 object-contain filter brightness-110 drop-shadow-lg transition-all duration-300"
                />
              </button>
              <p className="text-gray-300 text-sm mt-3">Vote</p>
            </div>
          </div>
        </div>

        {/* 下部説明 */}
        <div className="text-center">
          <p className="text-gray-300 text-lg font-medium">{t('onboarding.slide5.description')}</p>
        </div>
      </div>
    </div>
  );
};

export default GetStartedSlide; 