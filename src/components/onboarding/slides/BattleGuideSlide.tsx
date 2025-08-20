import React from 'react';
import { useTranslation } from 'react-i18next';

const BattleGuideSlide: React.FC = () => {
  const { t, i18n } = useTranslation();
  // 日本語以外の言語設定の場合は英語版動画を使用
  const isJapanese = i18n.language.startsWith('ja');
  const videoSrc = isJapanese
    ? '/images/onboarding/① 動画を投稿.mp4'
    : '/images/onboarding/English ver.mp4';

  return (
    <div className="onboarding-card md:w-96 md:h-[500px] w-[340px] h-[440px]">
      <div className="onboarding-content">
        {/* 上部タイトル - サイズを小さく */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {t('onboarding.slide2.title').split('\n').map((line, index) => (
              <React.Fragment key={index}>
                {line}
                {index < t('onboarding.slide2.title').split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </h2>
        </div>

        {/* 中央動画 - 自動再生・ループ */}
        <div className="flex justify-center mb-6">
          <video 
            autoPlay
            loop
            muted
            playsInline
            className="w-full max-w-[320px] h-48 object-cover rounded-xl shadow-xl transition-all duration-300"
            poster="/images/onboarding/Slide2.png"
          >
            <source src={videoSrc} type="video/mp4" />
            {t('onboarding.slide2.videoAlt')}
          </video>
        </div>

        {/* 下部説明 */}
        <div className="text-center">
          <p className="text-gray-300 text-sm leading-relaxed">
            {t('onboarding.slide2.description')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BattleGuideSlide; 