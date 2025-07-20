import React from 'react';
import { useTranslation } from 'react-i18next';

const WelcomeSlide: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="onboarding-card md:w-96 md:h-[500px] w-[340px] h-[440px]">
      <div className="onboarding-content">
        {/* 上部タイトル */}
        <div className="text-center mb-8">
          <h3 className="text-lg text-gray-300 mb-2">{t('onboarding.slide1.welcome')}</h3>
          <h2 className="text-3xl font-bold text-white">
            {t('onboarding.slide1.title')}
          </h2>
        </div>

        {/* 中央ロゴ */}
        <div className="flex justify-center mb-8">
          <img 
            src="/images/BEATNEXUS-WORDMARK.png" 
            alt="BeatNexus Logo"
            className="h-16 object-contain"
          />
        </div>

        {/* 下部説明 */}
        <div className="text-center">
          <p className="text-gray-300 text-sm leading-relaxed">
            {t('onboarding.slide1.description')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeSlide; 