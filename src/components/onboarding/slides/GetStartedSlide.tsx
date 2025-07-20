import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../../../store/onboardingStore';
import { useAuthStore } from '../../../store/authStore';

const GetStartedSlide: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { completeOnboarding } = useOnboardingStore();
  const { user } = useAuthStore();

  const handleBattleStart = async () => {
    // オンボーディング完了処理とモーダルクローズ
    if (user) {
      await completeOnboarding(user.id);
    }
    
    // バトル投稿画面に遷移
    navigate('/post');
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

        {/* 中央バトルスタートボタン */}
        <div className="flex flex-col items-center mb-8">
          <button
            onClick={handleBattleStart}
            className="bg-black p-6 rounded-full shadow-lg hover:scale-105 transition-transform cursor-pointer border-2 border-gray-600 hover:border-gray-400"
          >
            <img 
              src="/images/VS.png" 
              alt="Battle Start"
              className="w-12 h-12 object-contain filter brightness-110"
            />
          </button>
          
          {/* 説明テキスト */}
          <p className="text-gray-300 text-sm mt-4">
            {t('onboarding.slide5.clickToStart')}
          </p>
        </div>

        {/* 下部説明 */}
        <div className="text-center">
          <p className="text-gray-300 text-lg font-medium">
            {t('onboarding.slide5.description')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GetStartedSlide; 