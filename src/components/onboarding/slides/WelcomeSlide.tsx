import React from 'react';
import { useTranslation } from 'react-i18next';

interface WelcomeSlideProps {}

const WelcomeSlide: React.FC<WelcomeSlideProps> = () => {
  const { t } = useTranslation();

  return (
    <div className="onboarding-card w-96 h-[500px]">
      <div className="onboarding-content">
        {/* タイトル */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-3">
            {t('onboarding.slide1.title')}
          </h2>
          <h3 className="text-2xl font-semibold text-cyan-400 mb-6">
            {t('onboarding.slide1.subtitle')}
          </h3>
        </div>

        {/* スクリーンショット画像 */}
        <div className="flex justify-center mb-6">
          <img 
            src="/images/onboarding/Slide1.png" 
            alt="BeatNexus Platform Screenshot"
            className="w-full h-40 object-cover rounded-lg shadow-lg"
          />
        </div>

        {/* 説明 */}
        <div className="text-center mb-8">
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
            {t('onboarding.slide1.description')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeSlide; 